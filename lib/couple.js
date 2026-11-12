// 💑 โหมดคู่รัก (เลือกใช้เอง · คนที่ไม่ใช้จะไม่เห็นอะไรเปลี่ยน)
// หลักการ:
// - ไม่คัดลอกข้อมูล: รายการยังอยู่ใต้ users/{uid} ของเจ้าของ · "ของเรา" = เซิร์ฟเวอร์อ่านของสองคนมารวมตอนขอดู
// - ยืนยัน 2 ฝ่าย: คนสร้างรหัส (A) → คนกรอกรหัส (B) ยืนยัน → A เห็นชื่อ B แล้วยืนยันอีกครั้ง (รหัสหลุดก็จับคู่ผิดคนไม่ได้)
// - เซิร์ฟเวอร์ตัดสินทุกอย่าง: หาคู่จาก users/{ตัวเอง}.coupleId แล้วเช็คว่าอยู่ใน members ทุกครั้ง
// - รายการ 🔒 ส่วนตัว ไม่ถูกนับใน "ของเรา" (ทั้งรายวันและรายเดือน)
//
// couples/{id}      -> { members:[uidA,uidB], names:{uid:ชื่อ}, createdAt, createdBy }
// users/{uid}       -> + coupleId, coupleConsentAt
// invites/{hash}    -> { from, createdAt, expiresAt }   เก็บแค่ค่าแฮชของรหัส (อ่านฐานข้อมูลก็ไม่รู้รหัส)
// pairReq/{uidA}    -> { from: uidB, fromName, nonce, expiresAt }   คำขอที่รอ A ยืนยัน
// ratelimit/{uid}   -> + pairTries, pairWindow   กันเดารหัส
import crypto from 'node:crypto';
import { getDb, FieldValue } from './firebase.js';
import { docSet } from './ctx.js';
import { getUser, getProfile, listEntries } from './store.js';

export const CODE_MINUTES = 10;  // รหัสเชิญใช้ได้กี่นาที
export const REQ_HOURS = 24;     // คำขอรอ A ยืนยันได้กี่ชั่วโมง
export const MAX_TRIES = 5;      // กรอกรหัสได้กี่ครั้งต่อชั่วโมง
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 ตัว ไม่มี 0/O/1/I/L ที่อ่านสับสน

const db = () => getDb();
const userRef = uid => db().collection('users').doc(uid);
const inviteRef = h => db().collection('invites').doc(h);
const reqRef = uid => db().collection('pairReq').doc(uid);
const coupleRef = id => db().collection('couples').doc(id);

export const makeCode = () => Array.from({ length: 8 }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join('');
export const normCode = s => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
export const validCode = c => c.length === 8 && [...c].every(ch => ALPHA.includes(ch));
export const showCode = c => `${c.slice(0, 4)}-${c.slice(4)}`;
export const codeHash = code => crypto.createHash('sha256').update(`ie-pair:${process.env.LINE_CHANNEL_SECRET}:${code}`).digest('hex').slice(0, 40);

// ลบรหัสเชิญที่คนนี้สร้างค้างไว้ (คืนค่าจำนวนที่ลบ)
export async function cancelInvites(uid) {
  const old = await db().collection('invites').where('from', '==', uid).get();
  if (old.empty) return 0;
  const b = db().batch();
  old.docs.forEach(d => b.delete(d.ref));
  await b.commit();
  return old.size;
}

// A สร้างรหัสเชิญ (รหัสเก่าของ A ใช้ไม่ได้ทันที) · การกดสร้าง = ยินยอมเรื่องโหมดคู่
export async function createInvite(uid) {
  await cancelInvites(uid);
  const code = makeCode(), now = Date.now();
  await Promise.all([
    inviteRef(codeHash(code)).set({ from: uid, createdAt: now, expiresAt: now + CODE_MINUTES * 60000 }),
    userRef(uid).set({ coupleConsentAt: now }, { merge: true }),
  ]);
  return code;
}

// กันเดารหัส: คนละ MAX_TRIES ครั้งต่อชั่วโมง
export async function codeTurn(uid) {
  const ref = db().collection('ratelimit').doc(uid);
  return db().runTransaction(async tx => {
    const d = (await tx.get(ref)).data() || {};
    const now = Date.now();
    const fresh = now - (d.pairWindow || 0) < 3600000;
    const n = fresh ? d.pairTries || 0 : 0;
    if (n >= MAX_TRIES) return false;
    tx.set(ref, { pairTries: n + 1, pairWindow: fresh ? d.pairWindow : now }, { merge: true });
    return true;
  });
}

export async function findInvite(hash) {
  const s = await inviteRef(hash).get();
  return s.exists && s.data().expiresAt > Date.now() ? s.data() : null;
}

// B ยืนยันว่าจะจับคู่กับเจ้าของรหัส → สร้างคำขอรอ A ยืนยัน (รหัสถูกใช้แล้ว ใช้ซ้ำไม่ได้)
// คืนค่า { to, nonce } หรือ { error: 'gone' | 'self' | 'taken' | 'mine' }
export async function requestPair(uidB, hash, fromName) {
  const nonce = crypto.randomBytes(9).toString('base64url'), now = Date.now();
  return db().runTransaction(async tx => {
    const inv = await tx.get(inviteRef(hash));
    if (!inv.exists || inv.data().expiresAt <= now) return { error: 'gone' };
    const uidA = inv.data().from;
    if (uidA === uidB) return { error: 'self' };
    const [a, b] = await Promise.all([tx.get(userRef(uidA)), tx.get(userRef(uidB))]);
    if (!b.exists || b.data().coupleId) return { error: 'mine' };
    if (!a.exists || a.data().coupleId) return { error: 'taken' };
    tx.delete(inviteRef(hash));
    tx.set(reqRef(uidA), { from: uidB, fromName: String(fromName || '').slice(0, 40), nonce, createdAt: now, expiresAt: now + REQ_HOURS * 3600000 });
    tx.set(userRef(uidB), { coupleConsentAt: now }, { merge: true });
    return { to: uidA, nonce };
  });
}

export async function getPairReq(uidA) {
  const s = await reqRef(uidA).get();
  return s.exists && s.data().expiresAt > Date.now() ? s.data() : null;
}

// A ยืนยัน → จับคู่จริง (เช็คในธุรกรรมเดียวว่าทั้งสองคนยังไม่มีคู่ กันกดพร้อมกัน/จับคู่ซ้อน)
// คืนค่า { partner, partnerName } หรือ { error: 'gone' | 'taken' | 'mine' }
export async function acceptPair(uidA, nonce) {
  const now = Date.now();
  const r = await db().runTransaction(async tx => {
    const q = await tx.get(reqRef(uidA));
    if (!q.exists || q.data().nonce !== nonce || q.data().expiresAt <= now) return { error: 'gone' };
    const uidB = q.data().from;
    const [a, b] = await Promise.all([tx.get(userRef(uidA)), tx.get(userRef(uidB))]);
    tx.delete(reqRef(uidA));
    if (!a.exists || a.data().coupleId) return { error: 'mine' };
    if (!b.exists || b.data().coupleId) return { error: 'taken' };
    const ref = db().collection('couples').doc();
    const names = { [uidA]: a.data().displayName || '', [uidB]: b.data().displayName || q.data().fromName || '' };
    tx.set(ref, { members: [uidA, uidB], names, createdAt: now, createdBy: uidA });
    tx.set(userRef(uidA), { coupleId: ref.id }, { merge: true });
    tx.set(userRef(uidB), { coupleId: ref.id }, { merge: true });
    return { partner: uidB, partnerName: names[uidB] };
  });
  if (!r.error) docSet(`users/${uidA}`, undefined);
  return r;
}

// A ปฏิเสธ (คนที่กรอกรหัสไม่ใช่แฟน)
export async function rejectPair(uidA, nonce) {
  const s = await reqRef(uidA).get();
  if (!s.exists || s.data().nonce !== nonce) return false;
  await reqRef(uidA).delete();
  return true;
}

// คู่ของคนนี้ (เช็คทุกครั้งว่าเป็นสมาชิกของคู่นั้นจริง) → { id, partner, partnerName, since } หรือ null
export async function getCouple(uid, user) {
  const u = user || await getUser(uid);
  if (!u?.coupleId) return null;
  const s = await coupleRef(u.coupleId).get();
  const m = s.exists ? s.data().members || [] : [];
  if (m.length !== 2 || !m.includes(uid)) return null;
  const partner = m.find(x => x !== uid);
  return { id: s.id, partner, partnerName: s.data().names?.[partner] || 'แฟน', since: s.data().createdAt };
}

// เลิกคู่ (ฝ่ายเดียวได้ทันที) ไม่มีข้อมูลต้องลบ เพราะไม่เคยคัดลอก · คืนค่า uid ของอีกฝ่าย หรือ null
export async function unpair(uid) {
  const partner = await db().runTransaction(async tx => {
    const u = await tx.get(userRef(uid));
    const id = u.exists && u.data().coupleId;
    if (!id) return null;
    const c = await tx.get(coupleRef(id));
    const other = c.exists ? (c.data().members || []).find(x => x !== uid) : null;
    const o = other ? await tx.get(userRef(other)) : null;
    tx.set(userRef(uid), { coupleId: FieldValue.delete() }, { merge: true });
    if (o?.exists && o.data().coupleId === id) tx.set(userRef(other), { coupleId: FieldValue.delete() }, { merge: true });
    if (c.exists) tx.delete(coupleRef(id));
    return other || null;
  });
  docSet(`users/${uid}`, undefined);
  return partner;
}

// ก่อนลบบัญชี: เลิกคู่ + ลบรหัส/คำขอที่ค้าง · คืนค่า uid ของอีกฝ่าย (ถ้ามีคู่)
export async function cleanupPairing(uid) {
  const [partner, , sent] = await Promise.all([
    unpair(uid),
    cancelInvites(uid),
    db().collection('pairReq').where('from', '==', uid).get(),
  ]);
  const b = db().batch();
  b.delete(reqRef(uid));
  sent.docs.forEach(d => b.delete(d.ref));
  await b.commit();
  return partner;
}

// ---------- ยอด "ของเรา" ----------
const sum = o => Object.values(o || {}).reduce((s, v) => s + v, 0);
const round = n => Math.round(n * 100) / 100;

// ยอดรวมของสองคนในวันนั้น + ยอดเดือนนั้น (ไม่นับรายการ 🔒 ส่วนตัวของทั้งสองฝ่าย)
// ไม่คืนค่าว่าใครใช้เท่าไหร่ — เป็นยอดของ "เรา" เท่านั้น
export async function coupleDay(uid, couple, date) {
  const ids = [uid, couple.partner];
  const ym = date.slice(0, 7);
  const [lists, profiles, months] = await Promise.all([
    Promise.all(ids.map(id => listEntries(id, date, date))),
    Promise.all(ids.map(id => getProfile(id))),
    db().getAll(...ids.map(id => userRef(id).collection('months').doc(ym))),
  ]);
  const cats = new Map();
  let inc = 0, exp = 0, count = 0;
  const writers = new Set();
  lists.forEach((list, i) => {
    const byId = Object.fromEntries(profiles[i].categories.map(c => [c.id, c]));
    for (const e of list) {
      if (e.private) continue;
      const c = byId[e.category] || { name: 'อื่นๆ', icon: '🏷️' };
      const key = `${e.type}|${c.name}`; // หมวดชื่อเดียวกันของสองคน รวมเป็นบรรทัดเดียว
      const row = cats.get(key) || { name: c.name, icon: c.icon || '🏷️', type: e.type, sum: 0 };
      row.sum = round(row.sum + e.amount);
      cats.set(key, row);
      if (e.type === 'income') inc += e.amount; else exp += e.amount;
      count++; writers.add(i);
    }
  });
  let mInc = 0, mExp = 0;
  for (const s of months) {
    const d = s.exists ? s.data() : {};
    mInc += sum(d.inc) - sum(d.pinc);
    mExp += sum(d.exp) - sum(d.pexp);
  }
  return {
    inc: round(inc), exp: round(exp), count, both: writers.size === 2,
    cats: [...cats.values()].sort((a, b) => b.sum - a.sum),
    month: { inc: round(Math.max(0, mInc)), exp: round(Math.max(0, mExp)) },
  };
}
