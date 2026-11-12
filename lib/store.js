// การอ่าน/เขียนข้อมูลใน Firestore
// users/{uid}                    -> { categories:[หมวดที่สร้างเอง], keywords:[{word,category}] }
// users/{uid}/entries/{id}       -> { type, category, amount, note, date, ts, batch }
// users/{uid}/months/{YYYY-MM}   -> { inc:{cat:sum}, exp:{cat:sum} }  (สรุปรายเดือน ประหยัดการอ่าน)
// pending/{uid}                  -> รายการที่รอผู้ใช้กดยืนยัน
import { getDb, FieldValue } from './firebase.js';
import { mergeCategories } from './categories.js';
import { docGet, docSet } from './ctx.js';

const userRef = uid => getDb().collection('users').doc(uid);
const monthRef = (uid, date) => userRef(uid).collection('months').doc(date.slice(0, 7));

// รวมยอดที่ต้องปรับของแต่ละเดือนก่อน แล้วเขียนเดือนละครั้งเดียว (กันยอดสรุปเพี้ยน)
function addAgg(acc, e, sign) {
  const ym = e.date.slice(0, 7), key = e.type === 'income' ? 'inc' : 'exp';
  acc[ym] ||= { inc: {}, exp: {} };
  acc[ym][key][e.category] = (acc[ym][key][e.category] || 0) + sign * e.amount;
}
function writeAgg(w, uid, acc) {
  for (const [ym, sums] of Object.entries(acc)) {
    const data = {};
    for (const key of ['inc', 'exp']) {
      for (const [cat, v] of Object.entries(sums[key])) {
        const n = Math.round(v * 100) / 100;
        if (n) (data[key] ||= {})[cat] = FieldValue.increment(n);
      }
    }
    if (Object.keys(data).length) w.set(monthRef(uid, ym + '-01'), data, { merge: true });
  }
}

export function cleanEntry(x) {
  const amount = Math.round(Number(x.amount) * 100) / 100;
  if (!(amount > 0 && amount < 10000000)) throw new Error('จำนวนเงินไม่ถูกต้อง');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(x.date || '')) throw new Error('วันที่ไม่ถูกต้อง');
  return {
    type: x.type === 'income' ? 'income' : 'expense',
    category: String(x.category || '').slice(0, 40) || (x.type === 'income' ? 'inc_other' : 'exp_other'),
    amount,
    note: String(x.note || '').slice(0, 60),
    date: x.date,
    ...(x.slip ? { slip: String(x.slip).slice(0, 40) } : {}), // รหัสกันจดสลิปซ้ำ
  };
}

// ไม่สร้างผู้ใช้ใหม่ที่นี่ (สร้างตอนรับเข้าระบบใน lib/access.js เท่านั้น)
export async function getUser(uid) {
  const k = `users/${uid}`;
  let u = docGet(k);
  if (u === undefined) { const snap = await userRef(uid).get(); u = snap.exists ? snap.data() : null; docSet(k, u); }
  return u;
}

// อ่านทุกอย่างที่บอทอาจใช้ ในรอบเดียว (แทนอ่านทีละอย่าง)
export async function prefetch(uid) {
  const db = getDb();
  const keys = [`users/${uid}`, `pending/${uid}`, `editing/${uid}`, `misses/${uid}`];
  const snaps = await db.getAll(...keys.map(k => db.doc(k)));
  snaps.forEach((s, i) => docSet(keys[i], s.exists ? s.data() : null));
  return docGet(keys[0]);
}

export async function getProfile(uid) {
  const data = (await getUser(uid)) || {};
  return {
    categories: mergeCategories(data.categories || []),
    customCategories: data.categories || [],
    keywords: data.keywords || [],
  };
}

export async function saveProfile(uid, { categories, keywords }) {
  const patch = {};
  if (categories) patch.categories = categories.slice(0, 50).map(c => ({
    id: String(c.id).slice(0, 40), name: String(c.name).slice(0, 30),
    type: c.type === 'income' ? 'income' : 'expense', icon: String(c.icon || '🏷️').slice(0, 4),
  }));
  if (keywords) patch.keywords = keywords.slice(0, 300).map(k => ({
    word: String(k.word).trim().slice(0, 30), category: String(k.category).slice(0, 40),
  })).filter(k => k.word);
  await userRef(uid).set(patch, { merge: true });
  const u = docGet(`users/${uid}`);
  if (u) docSet(`users/${uid}`, { ...u, ...patch });
}

export async function addEntries(uid, items, batchId = 'b' + Date.now()) {
  const db = getDb();
  const wb = db.batch();
  const ts = Date.now();
  const saved = [], acc = {};
  items.forEach((it, i) => {
    const e = { ...cleanEntry(it), ts: ts + i, batch: batchId };
    const ref = userRef(uid).collection('entries').doc();
    wb.set(ref, e);
    addAgg(acc, e, 1);
    saved.push({ id: ref.id, ...e });
  });
  writeAgg(wb, uid, acc);
  await wb.commit();
  return saved;
}

export async function updateEntry(uid, id, data) {
  const db = getDb();
  const ref = userRef(uid).collection('entries').doc(id);
  return db.runTransaction(async tx => {
    const old = await tx.get(ref);
    if (!old.exists) throw new Error('ไม่พบรายการ');
    const e = { ...old.data(), ...cleanEntry(data) };
    const acc = {};
    addAgg(acc, old.data(), -1);
    addAgg(acc, e, 1);
    tx.set(ref, e);
    writeAgg(tx, uid, acc);
    return { id, ...e };
  });
}

export async function deleteEntries(uid, ids) {
  const db = getDb();
  return db.runTransaction(async tx => {
    const refs = ids.map(id => userRef(uid).collection('entries').doc(id));
    const snaps = await Promise.all(refs.map(r => tx.get(r)));
    const acc = {};
    snaps.forEach((s, i) => {
      if (!s.exists) return;
      addAgg(acc, s.data(), -1);
      tx.delete(refs[i]);
    });
    writeAgg(tx, uid, acc);
    return snaps.filter(s => s.exists).length;
  });
}

export async function listEntries(uid, from, to) {
  const snap = await userRef(uid).collection('entries')
    .where('date', '>=', from).where('date', '<=', to).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date) || b.ts - a.ts);
}

export async function recentEntries(uid, n = 8) {
  const snap = await userRef(uid).collection('entries').orderBy('ts', 'desc').limit(n).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// สลิปใบนี้เคยจดแล้วหรือยัง
export async function findSlip(uid, key) {
  const snap = await userRef(uid).collection('entries').where('slip', '==', key).limit(1).get();
  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getEntry(uid, id) {
  const s = await userRef(uid).collection('entries').doc(id).get();
  return s.exists ? { id, ...s.data() } : null;
}

// รวมข้อมูลเก่า: เก็บรายละเอียดแค่เดือนนี้กับเดือนก่อน เก่ากว่านั้นเหลือแค่ยอดรวมรายเดือนตามหมวด (months/{YYYY-MM})
export async function compactOld(uid, today) {
  const [y, m] = today.split('-').map(Number);
  const cutoff = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
  const uref = userRef(uid);
  const u = await uref.get();
  if (u.exists && (u.data().compactedTo || '') >= cutoff) return 0;
  const old = await uref.collection('entries').where('date', '<', cutoff).limit(400).get();
  const b = getDb().batch();
  old.docs.forEach(d => b.delete(d.ref)); // ไม่ลดยอดรายเดือน เพราะยอดรวมยังต้องอยู่
  if (old.size < 400) b.set(uref, { compactedTo: cutoff }, { merge: true });
  await b.commit();
  return old.size;
}

export async function lastBatch(uid) {
  const snap = await userRef(uid).collection('entries').orderBy('ts', 'desc').limit(15).get();
  if (snap.empty) return [];
  const b = snap.docs[0].data().batch;
  return snap.docs.filter(d => d.data().batch === b).map(d => ({ id: d.id, ...d.data() }));
}

export async function yearSummary(uid, year) {
  const db = getDb();
  const refs = Array.from({ length: 12 }, (_, i) => userRef(uid).collection('months').doc(`${year}-${String(i + 1).padStart(2, '0')}`));
  const snaps = await db.getAll(...refs);
  return snaps.map(s => (s.exists ? s.data() : { inc: {}, exp: {} }));
}

// ---- รายการรอยืนยัน ----
const pendingRef = uid => getDb().collection('pending').doc(uid);
// อ่านเอกสารเล็ก (ใช้ของที่อ่านไว้แล้วถ้ามี)
async function small(col, uid) {
  const k = `${col}/${uid}`;
  let v = docGet(k);
  if (v === undefined) { const s = await getDb().collection(col).doc(uid).get(); v = s.exists ? s.data() : null; docSet(k, v); }
  return v;
}
export function setPending(uid, data) {
  const v = { ...data, createdAt: Date.now() };
  docSet(`pending/${uid}`, v);
  return pendingRef(uid).set(v);
}
export const getPending = uid => small('pending', uid);
export function clearPending(uid) { docSet(`pending/${uid}`, null); return pendingRef(uid).delete(); }

// ---- กำลังแก้รายการในแชท (รอพิมพ์จำนวนเงิน/ชื่อ/วันที่) ----
const editRef = uid => getDb().collection('editing').doc(uid);
export function setEdit(uid, data) {
  const v = { ...data, createdAt: Date.now() };
  docSet(`editing/${uid}`, v);
  return editRef(uid).set(v);
}
export async function getEdit(uid) {
  const d = await small('editing', uid);
  return d && Date.now() - d.createdAt < 30 * 60 * 1000 ? d : null;
}
export function clearEdit(uid) {
  const had = docGet(`editing/${uid}`);
  docSet(`editing/${uid}`, null);
  return had === null ? Promise.resolve() : editRef(uid).delete(); // ไม่มีอยู่แล้ว ไม่ต้องลบซ้ำ
}

// ---- บอทไม่เข้าใจติดกันกี่ครั้ง (ไว้ส่งปุ่มไปหน้าตั้งค่า) ----
const missRef = uid => getDb().collection('misses').doc(uid);
export const getMiss = uid => small('misses', uid);
export function setMiss(uid, data) { docSet(`misses/${uid}`, data); return missRef(uid).set(data); }
export function clearMiss(uid) {
  const had = docGet(`misses/${uid}`);
  docSet(`misses/${uid}`, null);
  return had === null ? Promise.resolve() : missRef(uid).delete();
}
