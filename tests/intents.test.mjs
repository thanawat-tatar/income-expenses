// ทดสอบว่าบอทเข้าใจ "ความตั้งใจ" จากคำพูดแบบต่างๆ (npm test)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeThai } from '../lib/parser.js';
import { isUndo, isEdit, isWipe, isHelp, cleanTarget, isPair, pairCode, isUnpair, isCancelCode, isOurs } from '../lib/intents.js';
import { parseMessage } from '../lib/parser.js';
import { DEFAULT_CATEGORIES } from '../lib/categories.js';

const n = s => normalizeThai(s);

test('ยกเลิกของที่เพิ่งจด', () => {
  for (const s of ['ยกเลิก', 'ยกเลิกเมื่อกี้', 'ยกเลิกเมื่อกี๊ครับ', 'ลบอันเมื่อกี้', 'ลบล่าสุด', 'ลบอันล่าสุดหน่อย', 'เอาออก',
    'เมื่อกี้ไม่เอา', 'ไม่เอาอันเมื่อกี้', 'ยกเลิกรายการล่าสุด', 'จดซ้ำ', 'บันทึกซ้ำ', 'ขอยกเลิกที่จดไปได้ไหม', 'undo', 'Cancel',
    'ลบที่เพิ่งจด', 'ยกเลิกเมื่อสักครู่นะ', 'ยกเลิกเมื่อกี้ได้มั้ยคะ']) {
    assert.ok(isUndo(n(s)), s);
  }
  for (const s of ['ยกเลิกค่ากิน', 'ลบข้าว 50', 'ลบคำ แซนวิช', 'ลบข้อมูลของฉัน', 'ข้าว 50', 'ไม่เอาข้าวแล้ว']) assert.ok(!isUndo(n(s)), s);
});

test('อยากแก้ แต่ไม่บอกว่าอันไหน', () => {
  for (const s of ['แก้ไข', 'เมื่อกี้พิมพ์ผิด', 'พิมพ์ผิด', 'ขอแก้ราคาได้ไหม', 'ขอแก้รายการได้ไหม', 'ยอดผิด', 'ราคาผิดครับ',
    'จดไม่ถูก', 'พิมพ์ไม่ถูก', 'ใส่เงินผิด', 'ขอแก้หน่อย', 'เปลี่ยนนิดนึง', 'แก้ไขข้อมูล', 'บันทึกผิดพลาด', 'ตัวเลขไม่ตรง', 'edit']) {
    assert.ok(isEdit(n(s)), s);
  }
  for (const s of ['ข้าว 50', 'เปลี่ยนยาง 120', 'แก้ว 2 ใบ 50', 'ลบคำ แซนวิช', 'ลบข้อมูลของฉัน', 'สรุปวันนี้', 'ทอนเงินลูกค้าผิด389บาท']) {
    assert.ok(!isEdit(n(s)), s);
  }
});

test('ตัดคำทั่วไปออกจากเป้าหมายการแก้', () => {
  assert.equal(cleanTarget('ราคาได้ไหม'), '');
  assert.equal(cleanTarget('รายการหน่อยครับ'), '');
  assert.equal(cleanTarget('ไขข้อมูล'), '');
  assert.equal(cleanTarget('ยอดเมื่อกี้'), '');
  assert.ok(cleanTarget('ค่ากินวันที่12').includes('ค่ากิน'));
  assert.ok(cleanTarget('ข้าว 50').includes('ข้าว'));
});

test('ลบข้อมูลทั้งหมด / วิธีใช้', () => {
  for (const s of ['ลบข้อมูลของฉัน', 'ลบข้อมูล', 'ลบบัญชี', 'ลบข้อมูลทั้งหมดครับ', 'ลบทุกอย่าง']) assert.ok(isWipe(n(s)), s);
  assert.ok(!isWipe('ลบข้าว 50'));
  for (const s of ['วิธีใช้', 'help', 'งง', 'ใช้ยังไง', 'ใช้ยังไงครับ', 'สอนหน่อย', '?']) assert.ok(isHelp(n(s)), s);
  assert.ok(!isHelp('ข้าว 50'));
});

test('💑 โหมดคู่รัก: จับคู่ / รหัส / เลิกคู่ / ของเรา', () => {
  for (const s of ['จับคู่', 'จับคู่ครับ', 'โหมดคู่รัก', 'เพิ่มแฟน', 'ขอจับคู่หน่อย', 'อยากจับคู่กับแฟน', 'เชิญแฟน', 'คู่ของฉัน']) assert.ok(isPair(n(s)), s);
  for (const s of ['จับคู่ K7QM-2PXH', 'ข้าว 50', 'ซื้อของให้แฟน 200', 'แฟน 100', 'จับคู่ 50']) assert.ok(!isPair(n(s)), s);

  assert.equal(pairCode('จับคู่ K7QM-2PXH'), 'K7QM2PXH');
  assert.equal(pairCode('จับคู่ k7qm2pxh'), 'K7QM2PXH');
  assert.equal(pairCode(n('จับคู่ K7QM 2PXH')), 'K7QM2PXH');
  assert.equal(pairCode('จับคู่K7QM2PXH'), 'K7QM2PXH');
  for (const s of ['จับคู่', 'จับคู่ 50', 'ข้าว 50', 'K7QM2PXH', 'จับคู่ ถุงเท้า 2 คู่ 100']) assert.equal(pairCode(s), null, s);

  for (const s of ['เลิกคู่', 'ยกเลิกจับคู่', 'เลิกจับคู่ครับ', 'ขอเลิกคู่หน่อย', 'ปิดโหมดคู่รัก', 'ยกเลิกโหมดคู่รัก']) {
    assert.ok(isUnpair(n(s)), s);
    assert.ok(!isUndo(n(s)), `${s} ต้องไม่ใช่ "ยกเลิกรายการล่าสุด"`);
  }
  for (const s of ['ยกเลิก', 'ยกเลิกเมื่อกี้', 'เลิกงาน 500', 'ลบข้อมูลของฉัน']) assert.ok(!isUnpair(n(s)), s);

  for (const s of ['ยกเลิกรหัส', 'ยกเลิกรหัสเชิญ', 'ลบรหัสครับ']) { assert.ok(isCancelCode(n(s)), s); assert.ok(!isUndo(n(s)), s); }
  assert.ok(!isCancelCode('ยกเลิก'));

  for (const s of ['ของเรา', 'สรุปคู่', 'สรุปของเรา', 'ยอดของเราครับ', 'วันนี้ของเรา']) assert.ok(isOurs(n(s)), s);
  for (const s of ['สรุปวันนี้', 'ของเรา 50', 'ซื้อของเรา 100']) assert.ok(!isOurs(n(s)), s);
});

test('💑 คำสั่งคู่รักไม่ชนกับการจดเงินปกติ', () => {
  for (const s of ['ซื้อของให้แฟน 200', 'เลี้ยงข้าวแฟน 150', 'ถุงเท้า 2 คู่ 100', 'ของขวัญแฟน 500']) {
    assert.ok(!isPair(n(s)) && !isUnpair(n(s)) && !isOurs(n(s)) && pairCode(s) === null, s);
    assert.ok(parseMessage(s, DEFAULT_CATEGORIES, [], '2026-11-12').items.length >= 1, `${s} ต้องจดได้`);
  }
});
