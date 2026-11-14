// 📒 สมุดหนี้ (ไว้จำว่าใครติดเงินเราอยู่เท่าไหร่) — เก็บแยกจากรายรับรายจ่าย
// users/{uid}/debts/{id} -> { name, balance, ts, log:[{d:+ยืม/-คืน, ts}] }  (ไม่โดนรวมทิ้งหลัง 7 วัน · ไม่แชร์ให้แฟน)
import { getDb } from './firebase.js';

const col = uid => getDb().collection('users').doc(uid).collection('debts');
const MAX_PEOPLE = 50, MAX_LOG = 40;
const round2 = n => Math.round(n * 100) / 100;

export function cleanAmount(x) {
  const n = round2(Number(x));
  if (!(n > 0 && n < 10000000)) throw new Error('จำนวนเงินไม่ถูกต้อง');
  return n;
}

export async function listDebts(uid) {
  const snap = await col(uid).limit(MAX_PEOPLE).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.balance > 0) - (a.balance > 0) || b.ts - a.ts);
}

// เพิ่มคนใหม่ (ยอดเริ่มต้น) · ถ้ามีชื่อนี้อยู่แล้ว → บวกยอดเพิ่มให้คนเดิม
export async function addDebt(uid, name, amount) {
  name = String(name || '').trim().slice(0, 30);
  if (!name) throw new Error('กรุณาใส่ชื่อ');
  const n = cleanAmount(amount);
  const snap = await col(uid).limit(MAX_PEOPLE).get();
  const same = snap.docs.find(d => d.data().name === name);
  if (same) return moveDebt(uid, same.id, n);
  if (snap.size >= MAX_PEOPLE) throw new Error('เพิ่มได้ไม่เกิน 50 คน');
  const ref = col(uid).doc(), ts = Date.now();
  const doc = { name, balance: n, ts, log: [{ d: n, ts }] };
  await ref.set(doc);
  return { id: ref.id, ...doc };
}

// delta > 0 = ยืมเพิ่ม · delta < 0 = คืนมา (คืนเกินยอด → เหลือ 0)
export async function moveDebt(uid, id, delta) {
  const ref = col(uid).doc(id), db = getDb();
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    if (!s.exists) throw new Error('ไม่พบรายการนี้');
    const cur = s.data();
    const bal = round2(Math.max(0, cur.balance + delta));
    const real = round2(bal - cur.balance);
    if (!real) throw new Error('ยอดเป็น 0 อยู่แล้ว');
    const doc = { ...cur, balance: bal, ts: Date.now(), log: [...(cur.log || []), { d: real, ts: Date.now() }].slice(-MAX_LOG) };
    tx.set(ref, doc);
    return { id, ...doc };
  });
}

export async function deleteDebt(uid, id) {
  await col(uid).doc(id).delete();
  return true;
}
