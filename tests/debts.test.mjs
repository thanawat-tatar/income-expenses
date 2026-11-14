import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanAmount } from '../lib/debts.js';

test('cleanAmount รับจำนวนเงินที่ถูกต้อง ปัดทศนิยม 2 ตำแหน่ง', () => {
  assert.equal(cleanAmount(6000), 6000);
  assert.equal(cleanAmount('1106'), 1106);
  assert.equal(cleanAmount(10.456), 10.46);
});
test('cleanAmount ปฏิเสธค่าที่ไม่ถูกต้อง', () => {
  for (const x of [0, -5, 'abc', NaN, 10000000, undefined]) assert.throws(() => cleanAmount(x));
});
