// ตรวจการ์ด LINE ทุกแบบตามกฎ LINE API (ผิดกฎ = LINE ตอบ 400 = บอทเงียบ) · npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../lib/messages.js';
import { DEFAULT_CATEGORIES as CATS } from '../lib/categories.js';

process.env.LIFF_ID = process.env.LIFF_ID || '2000000000-abcdefgh';
const D = '2026-11-15';
const byId = Object.fromEntries(CATS.map(c => [c.id, c]));
const items = [
  { type: 'expense', category: 'food', amount: 50, note: 'ข้าว', word: '', sure: true, date: D },
  { type: 'income', category: 'salary', amount: 900, note: 'ค่ารอบ', sure: true, date: D },
  { type: 'expense', category: 'exp_other', amount: 25, note: 'หมูปิ้ง', word: 'หมูปิ้ง', guess: 'food', sure: false, date: '2026-11-14' },
];
const entries = items.map((e, i) => ({ ...e, id: `e${i}`, batch: 'b1', ts: i }));
const day = { inc: 900, exp: 75, count: 3, both: true, cats: [{ name: 'กินดื่ม', icon: '🍚', type: 'expense', sum: 75 }], month: { inc: 900, exp: 75 } };
const slip = { type: 'expense', category: 'food', amount: 120, note: 'ร้านข้าว', word: 'ร้านข้าว', date: D };

// การ์ดทุกแบบ (ทั้งกรณีปกติและกรณีขอบ)
const cards = () => ({
  confirm: M.confirmMessage(items, D, 'p1', byId),
  confirmOrphans: M.confirmMessage(items, D, 'p1', byId, ['ข้าว']),
  ask: M.askMessage(items[2], 2, 'p1', CATS),
  note: M.noteCard('🎅', 'หัวข้อ', 'รายละเอียด'),
  noteNoSub: M.noteCard('🎅', 'หัวข้อ'),
  noteEmptySub: M.noteCard('🎅', 'หัวข้อ', ''),
  saved: M.savedMessage(2, 'วันนี้', 100),
  savedLoss: M.savedMessage(1, 'วันนี้', -125),
  savedOtherDay: M.savedMessage(1, 'หลายวัน', null),
  summary: M.summaryMessage(entries, D, byId, 'https://profile.line-scdn.net/x'),
  summaryEmpty: M.summaryMessage([], D, byId, ''),
  summaryLoss: M.summaryMessage([{ ...entries[0], amount: 125 }], D, byId),
  undo: M.undoMessage(entries, byId),
  editList: M.editListMessage(entries, byId),
  editEntry: M.editEntryMessage(entries[0], byId),
  editCat: M.editCategoryMessage(entries[0], CATS),
  stuck: M.stuckMessage(),
  quick: M.withQuick(M.noteCard('✅', 'ok'), [['📊 สรุป', 'สรุปวันนี้'], ['✏️ แก้', 'a=pick&id=e1', 'แก้รายการนี้']]),
  help: M.helpMessage(),
  helpHi: M.helpMessage('สวัสดี'),
  notUnderstood: M.notUnderstoodMessage('ฟหกด'),
  teach: M.teachPickMessage('หมูปิ้ง', CATS),
  consent: M.consentMessage(),
  consentHi: M.consentMessage('สวัสดีครับ'),
  invite: M.inviteMessage(Date.now() - 3600e3, Date.now() + 3 * 864e5),
  full: M.fullMessage(3),
  wipe1: M.wipeAskMessage(false),
  wipe2: M.wipeAskMessage(true),
  legacy: M.legacyNoticeMessage(),
  announce: M.announcePreviewMessage('สวัสดีปีใหม่ 🎉', { members: 12, left: 188 }, 'd1'),
  announceNone: M.announcePreviewMessage('ทดสอบ', { members: 0 }, 'd2'),
  admin: M.adminLinkMessage(),
  slip: M.slipMessage(slip, 'p2', CATS),
  slipKnown: M.slipMessage(slip, 'p2', CATS, { known: true }),
  slipGuess: M.slipMessage({ ...slip, type: 'income', category: 'inc_other' }, 'p2', CATS, { guess: 'salary' }),
  slipFail: M.slipFallbackMessage('notslip'),
  slipBusy: M.slipFallbackMessage('busy'),
  pairIntro: M.pairIntroMessage(),
  pairCode: M.pairCodeMessage('ABCD2345', 'ABCD-2345', 10),
  txtGuard: M.noteCard('🎅', ''),
  pairAsk: M.pairAskJoinMessage('มิ้นท์', 'https://profile.line-scdn.net/y', 'h1'),
  pairAskNoPic: M.pairAskJoinMessage('มิ้นท์', '', 'h1'),
  pairNotify: M.pairNotifyOwnerMessage('บอส', 'https://profile.line-scdn.net/z', 'c1'),
  pairDone: M.pairDoneMessage('มิ้นท์'),
  coupleStatus: M.coupleStatusMessage('มิ้นท์', '2026-11-01T00:00:00Z'),
  unpairAsk: M.unpairAskMessage('มิ้นท์'),
  unpaired: M.unpairedMessage(),
  couple: M.coupleSummaryMessage(day, D, 'มิ้นท์', { me: 'https://profile.line-scdn.net/a', them: 'https://profile.line-scdn.net/b' }),
  coupleLoss: M.coupleSummaryMessage({ ...day, inc: 0 }, D, 'มิ้นท์'),
  coupleEmpty: M.coupleSummaryMessage({ inc: 0, exp: 0, count: 0, cats: [], month: { inc: 0, exp: 0 } }, D, 'มิ้นท์'),
});

const HEX = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;
const DARK_BTN = new Set(['#B91C1C', '#15803D']);
const TYPES = new Set(['box', 'text', 'image', 'button', 'separator', 'filler', 'icon', 'span', 'video']);
const len = s => [...String(s)].length;

function checkAction(a, where) {
  assert.ok(a && typeof a.type === 'string', `${where}: action ไม่มี type`);
  if (a.label != null) assert.ok(len(a.label) >= 1 && len(a.label) <= 20, `${where}: label ยาวเกิน 20 "${a.label}"`);
  if (a.type === 'uri') assert.match(a.uri, /^(https:\/\/|line:\/\/)/, `${where}: uri ต้องเป็น https`);
  if (a.type === 'postback') {
    assert.ok(a.data && len(a.data) <= 300, `${where}: postback data`);
    if (a.displayText != null) assert.ok(String(a.displayText).trim(), `${where}: displayText ว่าง`);
  }
  if (a.type === 'message') assert.ok(String(a.text || '').trim(), `${where}: message text ว่าง`);
}

function walk(node, where) {
  if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${where}[${i}]`));
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    if (/color$/i.test(k) && typeof v === 'string') assert.match(v, HEX, `${where}.${k} สีไม่ใช่ hex: ${v}`);
    if (k === 'url') assert.match(v, /^https:\/\/\S+$/, `${where}.url ต้องเป็น https`);
  }
  if (node.type && where.includes('contents') && !['bubble', 'carousel', 'flex'].includes(node.type) && !node.action?.type && node.type !== 'action') {
    if (where.match(/\.(contents|header|hero|body|footer)/)) assert.ok(TYPES.has(node.type) || node.type === 'linearGradient', `${where}: type แปลก ${node.type}`);
  }
  if (node.type === 'text') assert.ok(typeof node.text === 'string' && node.text.trim() !== '' || node.contents?.length, `${where}: text ว่าง`);
  if (node.type === 'span') assert.ok(String(node.text || '').length > 0, `${where}: span ว่าง`);
  if (node.type === 'box') {
    assert.ok(['vertical', 'horizontal', 'baseline'].includes(node.layout), `${where}: layout`);
    assert.ok(Array.isArray(node.contents), `${where}: box ต้องมี contents`);
  }
  if (node.type === 'button') {
    if (node.style === 'primary') assert.ok(DARK_BTN.has(node.color), `${where}: ปุ่มหลักต้องสีเข้ม ได้ ${node.color}`);
    checkAction(node.action, where);
  } else if (node.action && typeof node.action === 'object') checkAction(node.action, `${where}.action`);
  for (const [k, v] of Object.entries(node)) if (k !== 'action' && typeof v === 'object') walk(v, `${where}.${k}`);
}

function checkMessage(m, name) {
  assert.ok(m && typeof m === 'object', `${name}: ไม่ใช่ object`);
  if (m.type === 'text') assert.ok(m.text.trim() && len(m.text) <= 5000, `${name}: text`);
  else {
    assert.equal(m.type, 'flex', `${name}: type`);
    assert.ok(String(m.altText || '').trim() && len(m.altText) <= 400, `${name}: altText`);
    assert.ok(['bubble', 'carousel'].includes(m.contents?.type), `${name}: contents.type`);
    assert.ok(JSON.stringify(m.contents).length <= 30000, `${name}: ใหญ่เกิน 30KB`);
    walk(m.contents, `${name}.contents`);
  }
  if (m.quickReply) {
    const q = m.quickReply.items;
    assert.ok(Array.isArray(q) && q.length >= 1 && q.length <= 13, `${name}: quick reply 1-13`);
    q.forEach((it, i) => { assert.equal(it.type, 'action'); checkAction(it.action, `${name}.quick[${i}]`); });
  }
}

test('การ์ด LINE ทุกแบบผ่านกฎ LINE API (ไม่มีรูป)', () => {
  const all = cards();
  assert.ok(Object.keys(all).length >= 39, `ครอบคลุม ${Object.keys(all).length} แบบ`);
  for (const [name, m] of Object.entries(all)) for (const x of [].concat(m)) checkMessage(x, name);
});

test('การ์ดทุกแบบผ่านกฎ เมื่อมีรูปแบนเนอร์ขยับ (APNG)', async () => {
  const real = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, headers: { get: () => 'image/png' } });
  try { await M.checkAssets(); } finally { globalThis.fetch = real; }
  const all = cards();
  for (const [name, m] of Object.entries(all)) for (const x of [].concat(m)) checkMessage(x, name);
  const hero = all.summary.contents.hero;
  assert.equal(hero.animated, true);
  assert.match(hero.url, /xmas-banner\.png\?v=36$/);
  assert.match(all.couple.contents.hero.url, /xmas-couple-banner\.png\?v=36$/);
});

test('ยอดสุทธิอยู่กล่องกรอบทอง กึ่งกลาง เหมือนกันทั้งส่วนตัวและคู่รัก', () => {
  const box = m => JSON.stringify(m.contents.header).includes('"backgroundColor":"#5C1111","borderColor":"#FACC15","borderWidth":"1px","cornerRadius":"14px","paddingAll":"14px"');
  const all = cards();
  for (const k of ['summary', 'summaryLoss', 'couple', 'coupleLoss']) {
    assert.ok(box(all[k]), `${k}: ไม่มีกล่องทอง`);
    assert.ok(!all[k].contents.header.borderWidth, `${k}: หัวการ์ดยังมีเส้นขอบ (รอยต่อกับแบนเนอร์)`);
  }
  assert.ok(JSON.stringify(all.summaryLoss.contents.header).includes('#FCA5A5'));
  assert.ok(JSON.stringify(all.summary.contents.header).includes('#86EFAC'));
});
