// การอ่าน/เขียนข้อมูลใน Firestore
// users/{uid}                    -> { categories:[หมวดที่สร้างเอง], keywords:[{word,category}] }
// users/{uid}/entries/{id}       -> { type, category, amount, note, date, ts, batch }
// users/{uid}/months/{YYYY-MM}   -> { inc:{cat:sum}, exp:{cat:sum} }  (สรุปรายเดือน ประหยัดการอ่าน)
// pending/{uid}                  -> รายการที่รอผู้ใช้กดยืนยัน
import { getDb, FieldValue } from './firebase.js';
import { mergeCategories } from './categories.js';

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
  };
}

export async function getProfile(uid, displayName) {
  const snap = await userRef(uid).get();
  const data = snap.exists ? snap.data() : {};
  if (!snap.exists) await userRef(uid).set({ categories: [], keywords: [], displayName: displayName || '', createdAt: Date.now() });
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
export const setPending = (uid, data) => pendingRef(uid).set({ ...data, createdAt: Date.now() });
export async function getPending(uid) {
  const s = await pendingRef(uid).get();
  return s.exists ? s.data() : null;
}
export const clearPending = uid => pendingRef(uid).delete();
