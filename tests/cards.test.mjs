import test from 'node:test';
import assert from 'node:assert/strict';
import { summaryMessage, coupleSummaryMessage, picUrl } from '../lib/messages.js';

const imgs = o => JSON.stringify(o).match(/"url":"[^"]*"/g) || [];
const day = { inc: 100, exp: 40, count: 2, both: true, cats: [{ name: 'กินดื่ม', icon: '🍚', type: 'expense', sum: 40 }], month: { inc: 100, exp: 40 } };

test('รูปโปรไฟล์ LINE จริงขึ้นในการ์ดสรุป', () => {
  const m = summaryMessage([], '2026-11-15', {}, 'https://profile.line-scdn.net/abc');
  assert.ok(imgs(m).some(u => u.includes('profile.line-scdn.net/abc')));
});
test('ไม่มีรูป/ลิงก์ไม่ใช่ https → ไม่ใส่รูปเสีย (ใช้รูปสำรองหรืออีโมจิ)', () => {
  for (const bad of ['', null, undefined, 'http://x/y', 'javascript:1', 'https://a b']) {
    assert.equal(picUrl(bad).startsWith('https://') || picUrl(bad) === '', true);
    const m = summaryMessage([], '2026-11-15', {}, bad);
    for (const u of imgs(m)) assert.match(u, /"url":"https:\/\//);
    assert.ok(JSON.stringify(m).includes('🎅'));
  }
});
test('การ์ดคู่รักมีรูปทั้งสองคน และสำรองเมื่อแฟนไม่มีรูป', () => {
  const m = coupleSummaryMessage(day, '2026-11-15', 'แฟน', { me: 'https://profile.line-scdn.net/me', them: 'https://profile.line-scdn.net/you' });
  const u = imgs(m).join();
  assert.ok(u.includes('/me') && u.includes('/you'));
  const m2 = coupleSummaryMessage(day, '2026-11-15', 'แฟน', { me: 'https://profile.line-scdn.net/me' });
  for (const x of imgs(m2)) assert.match(x, /"url":"https:\/\//);
  const m3 = coupleSummaryMessage(day, '2026-11-15', 'แฟน');
  assert.ok(m3.contents.footer && m3.contents.header);
});
