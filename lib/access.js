// ด่านรับคน + การยินยอม (PDPA) + ลบข้อมูล
// meta/stats          -> { count }  จำนวนผู้ใช้ที่อยู่ในระบบ (ไม่ต้องนับทั้งคอลเลกชันทุกครั้ง)
// waitlist/{uid}      -> { at }     คนที่ลงชื่อรอคิว (เรียงตามเวลา)
// users/{uid}         -> + joinedAt, lastActive, consentAt, consentVersion, pendingSince (ยังไม่กดยอมรับ), invitedAt
import { getDb, FieldValue } from './firebase.js';
import { push, getName } from './line.js';
import { inviteMessage, consentMessage, unpairedMessage } from './messages.js';
import { cleanupPairing } from './couple.js';
import { getUser, prefetch } from './store.js';
import { later, docSet } from './ctx.js';

export const LIMIT = 20;      // รับได้กี่คน (ค่าเริ่มต้น ปรับได้ในหน้าหลังบ้าน)
export const WARN_DAYS = 14;  // หายไปกี่วันถึงเตือนตอนกลับมา
export const DELETE_DAYS = 30; // ไม่ใช้งานกี่วันถึงลบข้อมูล เพื่อให้ที่คนใหม่
export const ACCEPT_DAYS = 3; // ได้ที่แล้วไม่กดยอมรับภายในกี่วัน ถึงยกที่ให้คิวถัดไป
export const POLICY_VERSION = 2; // แก้นโยบายครั้งใหญ่ → เพิ่มเลข ทุกคนต้องกดยอมรับใหม่ (ฉบับ 2: อ่านสลิปด้วย AI)
const limitOf = s => s?.limit || LIMIT;
const DAY = 86400 * 1000;
const TOUCH_EVERY = 6 * 3600 * 1000; // อัปเดตเวลาใช้งานล่าสุดไม่เกินทุก 6 ชม. (ประหยัดการเขียน)

const db = () => getDb();
const userRef = uid => db().collection('users').doc(uid);
const statsRef = () => db().collection('meta').doc('stats');
const waitRef = uid => db().collection('waitlist').doc(uid);

// ครั้งแรกที่ระบบนี้ทำงาน: นับผู้ใช้เดิม และถือว่าผู้ใช้เดิมยินยอมแล้ว (เจ้าของระบบยินยอมแทน)
async function ensureStats() {
  const s = await statsRef().get();
  if (s.exists) return s.data();
  const users = await db().collection('users').get();
  const now = Date.now();
  const b = db().batch();
  users.docs.forEach(d => {
    if (d.data().joinedAt) return;
    b.set(d.ref, { joinedAt: now, lastActive: now, consentAt: now, consentBy: 'owner', legacyNotice: true }, { merge: true });
  });
  b.set(statsRef(), { count: users.size, createdAt: now });
  await b.commit();
  return { count: users.size };
}

// ลำดับคิวของคนนี้ (1 = คนแรก) หรือ 0 ถ้าไม่ได้รอคิว
export async function queuePos(uid) {
  const me = await waitRef(uid).get();
  if (!me.exists) return 0;
  const ahead = await db().collection('waitlist').where('at', '<', me.data().at).count().get();
  return ahead.data().count + 1;
}

export async function joinWaitlist(uid) {
  const ref = waitRef(uid);
  if (!(await ref.get()).exists) await ref.set({ at: Date.now() });
  return queuePos(uid);
}

// ตรวจทุกครั้งที่มีคนทัก/เปิดเว็บ
// คืนค่า { status: 'member' | 'full', user, isNew, fromQueue, back, queue }
// all = อ่านข้อมูลอื่นที่บอทใช้มาพร้อมกันในรอบเดียว (ใช้ในแชท)
export async function gate(uid, { displayName = '', admit = true, all = false } = {}) {
  let u = all ? await prefetch(uid) : await getUser(uid);
  if (!u || !u.joinedAt) { // คนใหม่ หรือผู้ใช้เดิมก่อนมีระบบนี้
    await ensureStats();
    const snap = await userRef(uid).get();
    u = snap.exists ? snap.data() : null;
    docSet(`users/${uid}`, u);
  }
  if (u) {
    const now = Date.now();
    const last = u.lastActive || now;
    const back = now - last >= WARN_DAYS * DAY; // หายไปนาน กลับมาแล้ว
    const patch = {};
    if (now - last >= TOUCH_EVERY || !u.lastActive) patch.lastActive = now;
    if (displayName && !u.displayName) patch.displayName = displayName;
    // ไม่เร่ง: บันทึกหลังตอบผู้ใช้แล้ว
    if (!u.displayName && !displayName) later(getName(uid).then(name => name && userRef(uid).set({ displayName: name }, { merge: true })));
    if (Object.keys(patch).length) later(userRef(uid).set(patch, { merge: true }));
    const user = { ...u, ...patch };
    docSet(`users/${uid}`, user);
    return { status: 'member', user, back };
  }
  if (!admit) return { status: 'none' };
  // ให้ที่คนรอคิวก่อนตามลำดับ
  let r = await tryAdmit(uid, displayName);
  if (!r) {
    if (await removeExpired(5)) r = await tryAdmit(uid, displayName); // มีคนหายไปเกิน 30 วัน → เคลียร์ที่ แล้วลองใหม่
  }
  if (r) return r;
  return { status: 'full', queue: await queuePos(uid) };
}

async function tryAdmit(uid, displayName) {
  const stats = await ensureStats();
  const free = limitOf(stats) - (stats.count || 0);
  if (free <= 0) return null;
  const queue = await db().collection('waitlist').orderBy('at').limit(free).get();
  const inQueue = (await waitRef(uid).get()).exists;
  if (queue.size >= free && !queue.docs.some(d => d.id === uid)) return null; // ที่ว่างเป็นของคนที่รอก่อน
  const now = Date.now();
  const user = { categories: [], keywords: [], displayName: displayName || await getName(uid), createdAt: now, joinedAt: now, lastActive: now, consentAt: null, pendingSince: now };
  const ok = await db().runTransaction(async tx => {
    const [s, u] = await Promise.all([tx.get(statsRef()), tx.get(userRef(uid))]);
    if (u.exists) return true;
    if ((s.data()?.count || 0) >= limitOf(s.data())) return false;
    tx.set(userRef(uid), user);
    tx.set(statsRef(), { count: FieldValue.increment(1) }, { merge: true });
    tx.delete(waitRef(uid));
    return true;
  });
  if (ok) docSet(`users/${uid}`, user);
  return ok ? { status: 'member', user, isNew: true, fromQueue: inQueue } : null;
}

export const setConsent = uid => (docSet(`users/${uid}`, undefined), userRef(uid)).set({
  consentAt: Date.now(), consentVersion: POLICY_VERSION, pendingSince: FieldValue.delete(), legacyNotice: FieldValue.delete(),
}, { merge: true });
export const clearLegacyNotice = uid => userRef(uid).set({ legacyNotice: FieldValue.delete() }, { merge: true });

// ลบข้อมูลทั้งหมดของคนนี้ (ทีละไม่เกิน 400 รายการ) แล้วส่งที่ว่างให้คิวถัดไป
export async function deleteUserData(uid, { fill = true } = {}) {
  // มีคู่อยู่ → เลิกคู่ก่อน แล้วบอกอีกฝ่ายสั้นๆ (ไม่บอกเหตุผล)
  const partner = await cleanupPairing(uid);
  if (partner) await push(partner, unpairedMessage()).catch(e => console.error('unpair push', e.message));
  for (const sub of ['entries', 'months']) {
    for (;;) {
      const snap = await userRef(uid).collection(sub).limit(400).get();
      if (snap.empty) break;
      const b = db().batch();
      snap.docs.forEach(d => b.delete(d.ref));
      await b.commit();
      if (snap.size < 400) break;
    }
  }
  const b = db().batch();
  for (const c of ['pending', 'editing', 'misses', 'waitlist']) { b.delete(db().collection(c).doc(uid)); docSet(`${c}/${uid}`, null); }
  docSet(`users/${uid}`, null);
  await b.commit();
  await db().runTransaction(async tx => {
    const u = await tx.get(userRef(uid));
    if (!u.exists) return;
    tx.delete(userRef(uid));
    tx.set(statsRef(), { count: FieldValue.increment(-1) }, { merge: true });
  });
  if (fill) await fillSlots();
}

// ลบคนที่ไม่ได้ใช้งานเกิน 30 วัน + คนที่ได้ที่แล้วไม่กดยอมรับเกิน 3 วัน คืนค่าจำนวนที่ลบ
export async function removeExpired(max = 20) {
  const now = Date.now();
  const [idle, noAnswer] = await Promise.all([
    db().collection('users').where('lastActive', '<', now - DELETE_DAYS * DAY).limit(max).get(),
    db().collection('users').where('pendingSince', '<', now - ACCEPT_DAYS * DAY).limit(max).get(),
  ]);
  const ids = [...new Set([...idle.docs, ...noAnswer.docs].map(d => d.id))];
  for (const id of ids) await deleteUserData(id, { fill: false });
  if (ids.length) await fillSlots();
  return ids.length;
}

// มีที่ว่าง → รับคนคิวแรกเข้า แล้วทักไปบอก (ส่งครั้งเดียวต่อคน)
export async function fillSlots() {
  let invited = 0;
  for (let i = 0; i < 20; i++) {
    const s = (await statsRef().get()).data() || {};
    if ((s.count || 0) >= limitOf(s)) break;
    const q = await db().collection('waitlist').orderBy('at').limit(1).get();
    if (q.empty) break;
    const w = q.docs[0], uid = w.id, now = Date.now();
    const name = await getName(uid);
    const res = await db().runTransaction(async tx => {
      const [st, u] = await Promise.all([tx.get(statsRef()), tx.get(userRef(uid))]);
      tx.delete(waitRef(uid));
      if (u.exists) return 'skip';
      if ((st.data()?.count || 0) >= limitOf(st.data())) return 'full';
      tx.set(userRef(uid), {
        categories: [], keywords: [], displayName: name, createdAt: now, joinedAt: now, lastActive: now,
        consentAt: null, pendingSince: now, invitedAt: now, waitedSince: w.data().at,
      });
      tx.set(statsRef(), { count: FieldValue.increment(1) }, { merge: true });
      return 'ok';
    });
    if (res === 'full') break;
    if (res !== 'ok') continue;
    invited++;
    await push(uid, [inviteMessage(w.data().at, now + ACCEPT_DAYS * DAY), consentMessage()]).catch(e => console.error('invite push', e));
  }
  return invited;
}

// ---------- หลังบ้าน (เจ้าของระบบ) ----------
export const isAdmin = uid => !!process.env.ADMIN_UID && uid === process.env.ADMIN_UID;

export async function adminOverview() {
  const s = await ensureStats();
  const [users, wait] = await Promise.all([
    db().collection('users').get(),
    db().collection('waitlist').orderBy('at').get(),
  ]);
  // ไม่ส่งยอดเงิน/รายการของใคร ส่งแค่ข้อมูลการใช้งาน
  const list = users.docs.map(d => {
    const u = d.data();
    return {
      id: d.id, name: u.displayName || '', joinedAt: u.joinedAt || u.createdAt || 0, lastActive: u.lastActive || 0,
      consentAt: u.consentAt || 0, consentBy: u.consentBy || '', pendingSince: u.pendingSince || 0, invitedAt: u.invitedAt || 0,
      words: (u.keywords || []).length, cats: (u.categories || []).length, couple: !!u.coupleId, // บอกแค่ว่ามีคู่ไหม ไม่บอกว่าใคร/ยอดเท่าไหร่
    };
  });
  if (s.count !== users.size) await statsRef().set({ count: users.size }, { merge: true }); // ซ่อมตัวนับถ้าเพี้ยน
  return {
    limit: limitOf(s), count: users.size, now: Date.now(),
    rules: { warnDays: WARN_DAYS, deleteDays: DELETE_DAYS, acceptDays: ACCEPT_DAYS },
    users: list, waitlist: wait.docs.map(d => ({ at: d.data().at })),
  };
}

export async function setLimit(n) {
  const limit = Math.max(1, Math.min(1000, Math.round(Number(n) || 0)));
  await statsRef().set({ limit }, { merge: true });
  await fillSlots();
  return limit;
}
