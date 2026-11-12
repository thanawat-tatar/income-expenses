// ด่านรับคน + การยินยอม (PDPA) + ลบข้อมูล
// meta/stats          -> { count }  จำนวนผู้ใช้ที่อยู่ในระบบ (ไม่ต้องนับทั้งคอลเลกชันทุกครั้ง)
// waitlist/{uid}      -> { at }     คนที่ลงชื่อรอคิว (เรียงตามเวลา)
// users/{uid}         -> + joinedAt, lastActive, consentAt
import { getDb, FieldValue } from './firebase.js';

export const LIMIT = 50;      // รับได้กี่คน (อยากเพิ่ม แก้เลขนี้แล้ว push)
export const WARN_DAYS = 14;  // หายไปกี่วันถึงเตือนตอนกลับมา
export const DELETE_DAYS = 30; // ไม่ใช้งานกี่วันถึงลบข้อมูล เพื่อให้ที่คนใหม่
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
export async function gate(uid, { displayName = '', admit = true } = {}) {
  let snap = await userRef(uid).get();
  if (!snap.exists || !snap.data().joinedAt) { // คนใหม่ หรือผู้ใช้เดิมก่อนมีระบบนี้
    await ensureStats();
    snap = await userRef(uid).get();
  }
  if (snap.exists) {
    const u = snap.data();
    const now = Date.now();
    const last = u.lastActive || now;
    const back = now - last >= WARN_DAYS * DAY; // หายไปนาน กลับมาแล้ว
    const patch = {};
    if (now - last >= TOUCH_EVERY || !u.lastActive) patch.lastActive = now;
    if (displayName && !u.displayName) patch.displayName = displayName;
    if (Object.keys(patch).length) await userRef(uid).set(patch, { merge: true });
    return { status: 'member', user: { ...u, ...patch }, back };
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
  const free = LIMIT - (stats.count || 0);
  if (free <= 0) return null;
  const queue = await db().collection('waitlist').orderBy('at').limit(free).get();
  const inQueue = (await waitRef(uid).get()).exists;
  if (queue.size >= free && !queue.docs.some(d => d.id === uid)) return null; // ที่ว่างเป็นของคนที่รอก่อน
  const now = Date.now();
  const user = { categories: [], keywords: [], displayName, createdAt: now, joinedAt: now, lastActive: now, consentAt: null };
  const ok = await db().runTransaction(async tx => {
    const [s, u] = await Promise.all([tx.get(statsRef()), tx.get(userRef(uid))]);
    if (u.exists) return true;
    if ((s.data()?.count || 0) >= LIMIT) return false;
    tx.set(userRef(uid), user);
    tx.set(statsRef(), { count: FieldValue.increment(1) }, { merge: true });
    tx.delete(waitRef(uid));
    return true;
  });
  return ok ? { status: 'member', user, isNew: true, fromQueue: inQueue } : null;
}

export const setConsent = uid => userRef(uid).set({ consentAt: Date.now(), legacyNotice: FieldValue.delete() }, { merge: true });
export const clearLegacyNotice = uid => userRef(uid).set({ legacyNotice: FieldValue.delete() }, { merge: true });

// ลบข้อมูลทั้งหมดของคนนี้ (ทีละไม่เกิน 400 รายการ)
export async function deleteUserData(uid) {
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
  for (const c of ['pending', 'editing', 'misses', 'waitlist']) b.delete(db().collection(c).doc(uid));
  await b.commit();
  await db().runTransaction(async tx => {
    const u = await tx.get(userRef(uid));
    if (!u.exists) return;
    tx.delete(userRef(uid));
    tx.set(statsRef(), { count: FieldValue.increment(-1) }, { merge: true });
  });
}

// ลบคนที่ไม่ได้ใช้งานเกิน 30 วัน คืนค่าจำนวนที่ลบ
export async function removeExpired(max = 20) {
  const cutoff = Date.now() - DELETE_DAYS * DAY;
  const snap = await db().collection('users').where('lastActive', '<', cutoff).limit(max).get();
  for (const d of snap.docs) await deleteUserData(d.id);
  return snap.size;
}
