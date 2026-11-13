// ข้อมูลเฉพาะคำขอนี้ (ไม่ปนกับคนอื่น แม้เครื่องเดียวกันรับหลายคำขอพร้อมกัน)
// - docs: เอกสารที่อ่านมาแล้ว ไม่ต้องอ่านซ้ำ (ประหยัดเวลา + โควต้า)
// - tasks: งานไม่เร่ง ทำหลังตอบผู้ใช้แล้ว (แต่ยังรอให้เสร็จก่อนจบคำขอ)
import { AsyncLocalStorage } from 'node:async_hooks';
import { waitUntil } from '@vercel/functions';

const als = new AsyncLocalStorage();

// background = ส่งคำตอบไปก่อน แล้วทำงานไม่เร่งต่อ (บน Vercel) · ถ้าใช้ไม่ได้ รอให้เสร็จก่อนตอบ
export async function runCtx(fn, { background = false } = {}) {
  const store = { docs: new Map(), tasks: [] };
  const result = await als.run(store, fn);
  const all = Promise.all(store.tasks);
  if (background && process.env.VERCEL) { try { waitUntil(all); return result; } catch {} }
  await all;
  return result;
}

export function later(p) {
  const s = als.getStore();
  const task = Promise.resolve(p).catch(e => console.error('later', e));
  if (s) s.tasks.push(task);
  return task;
}

export const docGet = key => als.getStore()?.docs.get(key); // undefined = ยังไม่เคยอ่าน, null = ไม่มีเอกสาร
export function docSet(key, value) { als.getStore()?.docs.set(key, value); }
