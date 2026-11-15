// 📣 ประกาศถึงสมาชิก (เจ้าของระบบเท่านั้น · ตรวจสิทธิ์ที่ api/admin.js และ api/webhook.js ก่อนเรียกไฟล์นี้)
// ส่งเฉพาะสมาชิกที่ยอมรับนโยบายฉบับปัจจุบันแล้ว (multicast) · จำกัด 1 ครั้ง/ชม. · ไม่ส่งถ้าโควตาไม่พอ · บันทึกลง broadcast_logs
import crypto from 'node:crypto';
import { getDb } from './firebase.js';
import { lineGet, multicast } from './line.js';
import { POLICY_VERSION } from './access.js';

export const MAX_TEXT = 1000;
export const COOLDOWN_MS = 60 * 60 * 1000;
const db = () => getDb();

// ข้อความต้องไม่ว่าง ≤1000 ตัวอักษร ตัดอักขระควบคุม
export function cleanAnnounce(t) {
  const s = String(t ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‍﻿]/g, '').replace(/\r\n?/g, '\n').trim();
  if (!s) throw new Error('ยังไม่ได้พิมพ์ข้อความ');
  if (s.length > MAX_TEXT) throw new Error(`ข้อความยาวเกิน ${MAX_TEXT} ตัวอักษร`);
  return s;
}

// สมาชิกที่ยอมรับนโยบายแล้ว (คนอยู่คิว/ยังไม่กดยอมรับ จะไม่ได้รับ)
export async function memberIds() {
  const snap = await db().collection('users').get();
  return snap.docs.filter(d => { const u = d.data(); return u.consentAt && (u.consentVersion || 1) >= POLICY_VERSION; }).map(d => d.id);
}

// โควตา LINE เดือนนี้ (ค่าจริงจาก LINE ไม่ใส่ตายตัว) + จำนวนสมาชิกที่จะถูกหัก
export async function quotaInfo() {
  const [members, quota, usage] = await Promise.all([
    memberIds(),
    lineGet('message/quota').catch(() => null),
    lineGet('message/quota/consumption').catch(() => null),
  ]);
  const limited = quota?.type === 'limited';
  const limit = limited ? Number(quota.value) || 0 : null;
  const used = usage ? Number(usage.totalUsage) || 0 : null;
  return {
    members: members.length, type: quota?.type || 'unknown', limit, used,
    left: limited && used != null ? Math.max(0, limit - used) : null,
    ok: !!quota && !!usage,
  };
}

const log = (data) => db().collection('broadcast_logs').add({ at: Date.now(), ...data }).catch(e => console.error('broadcast_logs', e.message));
const lock = () => db().collection('meta').doc('broadcast');

// ส่งหาสมาชิกทุกคน
export async function sendAll(by, rawText) {
  const text = cleanAnnounce(rawText);
  const [ids, q] = [await memberIds(), await quotaInfo()];
  if (!ids.length) throw new Error('ยังไม่มีสมาชิกที่ยอมรับนโยบาย');
  if (!q.ok) throw new Error('เช็คโควตา LINE ไม่ได้ ลองใหม่อีกครั้ง');
  if (q.type === 'limited' && q.left < ids.length) throw new Error(`โควตาไม่พอ: ต้องใช้ ${ids.length} เหลือ ${q.left}`);
  // กันกดซ้ำ/ส่งถี่: จองสิทธิ์แบบ transaction (ส่งไม่สำเร็จ → คืนสิทธิ์)
  const now = Date.now();
  const prev = await db().runTransaction(async tx => {
    const last = (await tx.get(lock())).data()?.lastAt || 0;
    if (now - last < COOLDOWN_MS) throw new Error(`เพิ่งส่งไป รออีก ${Math.ceil((COOLDOWN_MS - (now - last)) / 60000)} นาที`);
    tx.set(lock(), { lastAt: now, by }, { merge: true });
    return last;
  });
  try {
    for (let i = 0; i < ids.length; i += 500) await multicast(ids.slice(i, i + 500), [{ type: 'text', text }], crypto.randomUUID());
  } catch (e) {
    await lock().set({ lastAt: prev }, { merge: true }).catch(() => {});
    await log({ by, kind: 'all', text, recipients: ids.length, ok: false, err: String(e.message).slice(0, 200) });
    throw new Error('ส่งไม่สำเร็จ ลองใหม่อีกครั้ง');
  }
  await log({ by, kind: 'all', text, recipients: ids.length, ok: true });
  return { sent: ids.length, left: q.left == null ? null : Math.max(0, q.left - ids.length) };
}

// ทดสอบส่งหาตัวเองคนเดียว (ใช้ 1 โควตา) ดูหน้าตาข้อความในแชทก่อนส่งจริง
export async function sendTest(by, rawText) {
  const text = cleanAnnounce(rawText);
  const q = await quotaInfo();
  if (q.type === 'limited' && q.left != null && q.left < 1) throw new Error('โควตาเดือนนี้หมดแล้ว');
  try { await multicast([by], [{ type: 'text', text }], crypto.randomUUID()); }
  catch (e) {
    await log({ by, kind: 'test', text, recipients: 1, ok: false, err: String(e.message).slice(0, 200) });
    throw new Error('ส่งทดสอบไม่สำเร็จ (ต้องเป็นเพื่อนกับ OA อยู่)');
  }
  await log({ by, kind: 'test', text, recipients: 1, ok: true });
  return { sent: 1, left: q.left == null ? null : Math.max(0, q.left - 1) };
}

// ร่างประกาศจากแชท รอแอดมินกดยืนยัน (หมดอายุ 30 นาที · ใช้ได้ครั้งเดียว · ปุ่มของร่างเก่าใช้ไม่ได้)
const draftRef = uid => db().collection('announce').doc(uid);
export async function saveDraft(uid, rawText) {
  const text = cleanAnnounce(rawText);
  const id = Date.now().toString(36);
  await draftRef(uid).set({ id, text, at: Date.now() });
  return { id, text };
}
export async function takeDraft(uid, id) {
  const snap = await draftRef(uid).get();
  const d = snap.exists ? snap.data() : null;
  if (!d || d.id !== id || Date.now() - d.at > 30 * 60 * 1000) return null;
  await draftRef(uid).delete();
  return d.text;
}
export const dropDraft = uid => draftRef(uid).delete().catch(() => {});
