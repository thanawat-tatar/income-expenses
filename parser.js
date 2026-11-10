// ตัวแยกข้อความ (ไม่ใช้ AI) : "น้ำมัน60 ข้าว 50 ได้ทิป 20" -> หลายรายการ
import { OTHER } from './categories.js';

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const MAX_ITEMS = 15;

function normalize(t) {
  return String(t || '')
    .replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
    .replace(/(\d)[,，](?=\d{3}\b|\d{3}\D|\d{3}$)/g, '$1');
}

function cleanNote(s) {
  return s
    .replace(/บาท|บ\.|฿|thb/gi, ' ')
    .replace(/[,\n\r\t+=:;|/\\()\[\]{}"'!?*#&]+/g, ' ')
    .replace(/^\s*[-–.]+|[-–.]+\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/**
 * @param {string} raw ข้อความจากผู้ใช้
 * @param {Array} categories หมวดทั้งหมด (จาก mergeCategories)
 * @param {Array} keywords คำที่ผู้ใช้ตั้งเอง [{word, category}]
 * @returns {{dayOffset:number, items:Array<{type,category,amount,note,sure}>}}
 */
export function parseMessage(raw, categories, keywords = []) {
  let text = normalize(raw);
  let dayOffset = 0;
  if (/เมื่อวานซืน/.test(text)) dayOffset = -2;
  else if (/เมื่อวาน/.test(text)) dayOffset = -1;
  text = text.replace(/เมื่อวานซืน|เมื่อวาน|วันนี้/g, m => ' '.repeat(m.length));
  const lower = text.toLowerCase();

  // พจนานุกรม: คำของผู้ใช้ + ชื่อหมวด + คำเริ่มต้น
  const byId = Object.fromEntries(categories.map(c => [c.id, c]));
  const dict = [];
  for (const k of keywords) {
    const c = byId[k.category];
    if (c && k.word) dict.push({ w: k.word.toLowerCase().trim(), cat: c, custom: 1, weak: false });
  }
  for (const c of categories) {
    dict.push({ w: c.name.toLowerCase(), cat: c, custom: c.custom ? 1 : 0, weak: false });
    for (const w of c.words || []) dict.push({ w: w.toLowerCase(), cat: c, custom: 0, weak: (c.weak || []).includes(w) });
  }

  // หาทุกตำแหน่งที่เจอคำ แล้วเลือกคำยาวสุดที่ไม่ทับกัน
  const found = [];
  for (const d of dict) {
    if (!d.w) continue;
    for (let i = lower.indexOf(d.w); i !== -1; i = lower.indexOf(d.w, i + 1)) {
      found.push({ start: i, end: i + d.w.length, ...d });
    }
  }
  found.sort((a, b) => (b.end - b.start) - (a.end - a.start) || b.custom - a.custom || a.start - b.start);
  const used = new Array(text.length).fill(false);
  const kws = [];
  for (const m of found) {
    let free = true;
    for (let i = m.start; i < m.end; i++) if (used[i]) { free = false; break; }
    if (!free) continue;
    for (let i = m.start; i < m.end; i++) used[i] = true;
    kws.push(m);
  }
  kws.sort((a, b) => a.start - b.start);

  // ซ่อนคำที่เจอแล้ว (กันเลขใน "7-11") แล้วหาตัวเลข
  const masked = text.split('').map((ch, i) => (used[i] ? ' ' : ch)).join('');
  const nums = [];
  const re = /(\d+(?:\.\d+)?)(?:\s*(k|พัน)(?![a-z]))?/gi;
  let mt;
  while ((mt = re.exec(masked))) {
    let amount = parseFloat(mt[1]) * (mt[2] ? 1000 : 1);
    amount = Math.round(amount * 100) / 100;
    if (amount > 0 && amount < 10000000) nums.push({ start: mt.index, end: mt.index + mt[0].length, amount });
  }

  const taken = new Set();
  const items = [];
  nums.slice(0, MAX_ITEMS).forEach((n, idx) => {
    const prevEnd = idx > 0 ? nums[idx - 1].end : 0;
    const nextStart = idx < nums.length - 1 ? nums[idx + 1].start : text.length;
    const pick = list => list.filter(m => !m.weak).pop() || list.pop();

    // 1) คำก่อนตัวเลข  2) ถ้าไม่มี ดูคำหลังตัวเลข
    let kw = pick(kws.filter(m => m.start >= prevEnd && m.end <= n.start && !taken.has(m)));
    let noteSrc = text.slice(prevEnd, n.start);
    if (!kw) {
      const after = kws.filter(m => m.start >= n.end && m.end <= nextStart && !taken.has(m));
      kw = after.find(m => !m.weak) || after[0];
      if (kw) noteSrc = text.slice(n.end, kw.end);
    }
    if (kw) taken.add(kw);

    const cat = kw ? kw.cat : byId[OTHER.expense];
    items.push({
      type: cat.type,
      category: cat.id,
      amount: n.amount,
      note: cleanNote(noteSrc) || cat.name,
      sure: !!kw && !kw.weak,
    });
  });

  return { dayOffset, items };
}
