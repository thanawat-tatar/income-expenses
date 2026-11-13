// 💑 โหมดคู่รัก (เลือกใช้เอง · คนที่ไม่ใช้จะไม่เห็นอะไรเปลี่ยน)
// หลักการ:
// - ไม่คัดลอกข้อมูล: รายการยังอยู่ใต้ users/{uid} ของเจ้าของ · "ของเรา" = เซิร์ฟเวอร์อ่านของสองคนมารวมตอนขอดู
// - ยินยอมทั้งสองฝ่าย: A กดสร้างรหัส → B เห็นชื่อ+รูป A แล้วกดยืนยัน = จับคู่ทันที → A ได้แจ้งพร้อมชื่อ+รูป B และปุ่ม "ไม่ใช่แฟน" (ยกเลิกแตะเดียว)
// - เซิร์ฟเวอร์ตัดสินทุกอย่าง: หาคู่จาก users/{ตัวเอง}.coupleId แล้วเช็คว่าอยู่ใน members ทุกครั้ง
// - แฟนเห็นทุกรายการ (ระบบ 🔒 ส่วนตัว เลิกใช้แล้ว · รายการที่เคยตั้งไว้กลายเป็นรายการปกติ)
//
// couples/{id}      -> { members:[uidA,uidB], names:{uid:ชื่อ}, createdAt, createdBy }
// users/{uid}       -> + coupleId, coupleConsentAt, pairHash (รหัสที่ส่งมาก่อนกดยอมรับนโยบาย)
// invites/{hash}    -> { from, createdAt, expiresAt }   เก็บแค่ค่าแฮชของรหัส (อ่านฐานข้อมูลก็ไม่รู้รหัส)
// ratelimit/{uid}   -> + pairTries, pairWindow   กันเดารหัส
import crypto from 'node:crypto';
import { getDb, FieldValue } from './firebase.js';
import { docSet } from './ctx.js';
import { getUser, getProfile, listEntries, yearSummary } from './store.js';

export const CODE_MINUTES = 10;  // รหัสเชิญใช้ได้กี่นาที
export const MAX_TRIES = 5;      // กรอกรหัสได้กี่ครั้งต่อชั่วโมง
const ALPHA = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // 31 ตัว ไม่มี 0/O/1/I/L ที่อ่านสับสน

const db = () => getDb();
const userRef = uid => db().collection('users').doc(uid);
const inviteRef = h => db().collection('invites').doc(h);
const coupleRef = id => db().collection('couples').doc(id);

export const makeCode = () => Array.from({ length: 8 }, () => ALPHA[crypto.randomInt(ALPHA.length)]).join('');
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

// B แตะยืนยัน → จับคู่ทันที (รหัสใช้ได้ครั้งเดียว · เช็คในธุรกรรมเดียวว่าทั้งสองคนยังไม่มีคู่ กันกดพร้อมกัน/จับคู่ซ้อน)
// A ได้ข้อความแจ้งพร้อมชื่อ+รูปของ B และปุ่ม "ไม่ใช่แฟน" ไว้ยกเลิกในแตะเดียว
// คืนค่า { partner, partnerName, myName, coupleId } หรือ { error: 'gone' | 'self' | 'taken' | 'mine' }
export async function joinPair(uidB, hash, nameB) {
  const now = Date.now();
  const r = await db().runTransaction(async tx => {
    const inv = await tx.get(inviteRef(hash));
    if (!inv.exists || inv.data().expiresAt <= now) return { error: 'gone' };
    const uidA = inv.data().from;
    if (uidA === uidB) return { error: 'self' };
    const [a, b] = await Promise.all([tx.get(userRef(uidA)), tx.get(userRef(uidB))]);
    if (!b.exists || b.data().coupleId) return { error: 'mine' };
    if (!a.exists || a.data().coupleId) return { error: 'taken' };
    const ref = db().collection('couples').doc();
    const names = { [uidA]: a.data().displayName || '', [uidB]: b.data().displayName || String(nameB || '').slice(0, 40) };
    tx.delete(inviteRef(hash));
    tx.set(ref, { members: [uidA, uidB], names, createdAt: now, createdBy: uidA });
    tx.set(userRef(uidA), { coupleId: ref.id }, { merge: true });
    tx.set(userRef(uidB), { coupleId: ref.id, coupleConsentAt: now, pairHash: FieldValue.delete() }, { merge: true });
    return { partner: uidA, partnerName: names[uidA], myName: names[uidB], coupleId: ref.id };
  });
  if (!r.error) docSet(`users/${uidB}`, undefined);
  return r;
}

// รหัสเชิญที่คนนี้สร้างไว้และยังใช้ได้ → เหลือกี่นาที (0 = ไม่มี)
export async function inviteLeft(uid) {
  const q = await db().collection('invites').where('from', '==', uid).get();
  const left = Math.max(0, ...q.docs.map(d => d.data().expiresAt - Date.now()));
  return Math.ceil(left / 60000);
}

// คนที่ยังไม่ได้กดยอมรับนโยบาย ส่งรหัสมาก่อน → จำค่าแฮชไว้ พอกดยอมรับแล้วทำต่อให้เลย ไม่ต้องส่งรหัสใหม่
export const rememberCode = (uid, hash) => userRef(uid).set({ pairHash: hash }, { merge: true });
export const forgetCode = uid => userRef(uid).set({ pairHash: FieldValue.delete() }, { merge: true });

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

// ก่อนลบบัญชี: เลิกคู่ + ลบรหัสที่ค้าง · คืนค่า uid ของอีกฝ่าย (ถ้ามีคู่)
export async function cleanupPairing(uid) {
  const [partner] = await Promise.all([unpair(uid), cancelInvites(uid)]);
  return partner;
}

// ---------- ยอด "ของเรา" ----------
const sum = o => Object.values(o || {}).reduce((s, v) => s + v, 0);
const round = n => Math.round(n * 100) / 100;

// ยอดรวมของสองคนในวันนั้น + ยอดเดือนนั้น
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
    mInc += sum(d.inc);
    mExp += sum(d.exp);
  }
  return {
    inc: round(inc), exp: round(exp), count, both: writers.size === 2,
    cats: [...cats.values()].sort((a, b) => b.sum - a.sum),
    month: { inc: round(Math.max(0, mInc)), exp: round(Math.max(0, mExp)) },
  };
}

// ---------- ข้อมูล "ของเรา" สำหรับหน้าเว็บ ----------
// หมวดของแฟน → หมวดของฉัน: หมวดเริ่มต้นใช้รหัสเดียวกัน · หมวดที่แฟนสร้างเอง ถ้าฉันมีชื่อเดียวกันใช้ของฉัน ไม่งั้นส่งเป็นหมวดเสริม (~ชื่อ)
function catMapper(mine, theirs) {
  const myIds = new Set(mine.categories.map(c => c.id));
  const theirById = Object.fromEntries(theirs.categories.map(c => [c.id, c]));
  const extra = new Map();
  const map = (id, type) => {
    const c = theirById[id];
    if (c && !c.custom && myIds.has(id)) return id;
    const name = c?.name || 'อื่นๆ', t = c?.type || type || 'expense';
    const same = mine.categories.find(m => m.name === name && m.type === t);
    if (same) return same.id;
    const key = `~${t}|${name}`;
    if (!extra.has(key)) extra.set(key, { id: key, name, icon: c?.icon || '🏷️', type: t });
    return key;
  };
  return { map, extras: () => [...extra.values()] };
}

// รายการของสองคนในช่วงวันที่ (ไม่ส่ง uid · รายการของแฟนไม่มีรหัสจริง แก้ไม่ได้)
export async function coupleEntries(uid, couple, from, to, minePromise) {
  const [mine, theirs, me, them] = await Promise.all([
    minePromise || listEntries(uid, from, to), listEntries(couple.partner, from, to), getProfile(uid), getProfile(couple.partner),
  ]);
  const m = catMapper(me, them);
  const pick = e => ({ type: e.type, amount: e.amount, note: e.note || '', date: e.date, ts: e.ts });
  const entries = [
    ...mine.map(e => ({ ...pick(e), id: e.id, category: e.category, owner: 'me' })),
    ...theirs.map((e, i) => ({ ...pick(e), id: `~${e.date}-${i}`, category: m.map(e.category, e.type), owner: 'partner' })),
  ].sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
  return { entries, extraCats: m.extras() };
}

// ยอดรายเดือนของเราทั้งปี
export async function coupleYear(uid, couple, year) {
  const [a, b, me, them] = await Promise.all([yearSummary(uid, year), yearSummary(couple.partner, year), getProfile(uid), getProfile(couple.partner)]);
  const m = catMapper(me, them);
  const add = (out, src, mine) => {
    for (const key of ['inc', 'exp']) {
      for (const [cat, v] of Object.entries(src?.[key] || {})) {
        if (!(v > 0)) continue;
        const id = mine ? cat : m.map(cat, key === 'inc' ? 'income' : 'expense');
        (out[key] ||= {})[id] = round((out[key][id] || 0) + v);
      }
    }
  };
  const months = a.map((mo, i) => {
    const out = { inc: {}, exp: {}, days: {} };
    add(out, mo, true); add(out, b[i], false);
    for (const [src, mine] of [[mo, true], [b[i], false]]) {
      for (const [dd, v] of Object.entries(src.days || {})) add((out.days[dd] ||= { inc: {}, exp: {} }), v, mine);
    }
    return out;
  });
  return { months, extraCats: m.extras() };
}
