// ตัวแยกข้อความ (ไม่ใช้ AI) : "น้ำมัน60 ข้าว 50 ได้ทิป 20" -> หลายรายการ
import { OTHER } from './categories.js';
import { bkkDate } from './date.js';

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

// ---------- วันที่ในข้อความ ----------
const MONTH_WORDS = [
  ['มกราคม', 'มกรา', 'ม.ค.'], ['กุมภาพันธ์', 'กุมภา', 'ก.พ.'], ['มีนาคม', 'มีนา', 'มี.ค.'], ['เมษายน', 'เมษา', 'เม.ย.'],
  ['พฤษภาคม', 'พฤษภา', 'พ.ค.'], ['มิถุนายน', 'มิถุนา', 'มิ.ย.'], ['กรกฎาคม', 'กรกฎา', 'ก.ค.'], ['สิงหาคม', 'สิงหา', 'ส.ค.'],
  ['กันยายน', 'กันยา', 'ก.ย.'], ['ตุลาคม', 'ตุลา', 'ต.ค.'], ['พฤศจิกายน', 'พฤศจิกา', 'พ.ย.'], ['ธันวาคม', 'ธันวา', 'ธ.ค.'],
];
const MONTH_OF = {};
MONTH_WORDS.forEach((ws, i) => ws.forEach(w => { MONTH_OF[w] = i + 1; }));
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const MONTH_RE = Object.keys(MONTH_OF).sort((a, b) => b.length - a.length).map(reEsc).join('|');
const REL_MONTH_RE = 'เดือนนี้|เดือนก่อน|เดือนที่แล้ว|เดือนที่ผ่านมา|เดือนหน้า';
const DAYS = { 'อาทิตย์': 0, 'จันทร์': 1, 'อังคาร': 2, 'พุธ': 3, 'พฤหัสบดี': 4, 'พฤหัส': 4, 'ศุกร์': 5, 'เสาร์': 6 };
const DAY_RE = Object.keys(DAYS).sort((a, b) => b.length - a.length).join('|');

const isoOf = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
const addDays = (iso, n) => { const [y, m, d] = iso.split('-').map(Number); return isoOf(y, m, d + n); };
function makeDate(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate())) return null;
  return isoOf(y, m, d);
}
function toYear(y, current) {
  if (!y) return current;
  y = Number(y);
  if (y < 100) return y >= 50 ? 2500 + y - 543 : 2000 + y; // 69 = พ.ศ. 2569, 26 = ค.ศ. 2026
  return y > 2400 ? y - 543 : y;
}
function weekday(today, dow, suffix) {
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const monFirst = x => (x + 6) % 7;
  const inWeek = monFirst(dow) - monFirst(t);
  if (!suffix) { let diff = dow - t; if (diff > 0) diff -= 7; return addDays(today, diff); } // "วันศุกร์" = ศุกร์ล่าสุด
  if (/นี้/.test(suffix)) return addDays(today, (dow - t + 7) % 7);                     // "ศุกร์นี้" = ศุกร์ที่จะถึง
  if (/หน้า/.test(suffix)) return addDays(today, inWeek + 7);                            // "ศุกร์หน้า" = ศุกร์ของสัปดาห์หน้า
  return addDays(today, inWeek - 7);                                                     // "ศุกร์ที่แล้ว"
}

/** หาวันที่ในข้อความ แล้วลบคำบอกวันออก (แทนด้วยช่องว่าง ไม่ให้ตัวเลขวันถูกนับเป็นเงิน) */
export function extractDate(text, today) {
  const [ty, tm] = today.split('-').map(Number);
  const shiftMonth = rel => { const d = new Date(Date.UTC(ty, tm - 1 + rel, 1)); return [d.getUTCFullYear(), d.getUTCMonth() + 1]; };
  const relMonth = w => (/นี้/.test(w) ? 0 : /หน้า/.test(w) ? 1 : -1);
  const rules = [
    // วันที่ 12 / วันที่ 12 เดือนก่อน / วันที่ 3 พ.ย. 69
    [new RegExp(`(?:ของ\\s*)?วันที่?\\s*(\\d{1,2})(?!\\d)(?:\\s*(?:(${MONTH_RE})(?:\\s*(\\d{4}|\\d{2})(?!\\d))?|(${REL_MONTH_RE})))?`, 'g'),
      (d, mon, yr, rel) => {
        let y = ty, m = tm;
        if (mon) { m = MONTH_OF[mon]; y = toYear(yr, ty); } else if (rel) [y, m] = shiftMonth(relMonth(rel));
        return makeDate(y, m, Number(d));
      }],
    // 3 พ.ย. / 3 พฤศจิกา 69
    [new RegExp(`(?:ของ\\s*)?(?<![\\d.])(\\d{1,2})\\s*(${MONTH_RE})(?:\\s*(\\d{4}|\\d{2})(?!\\d))?`, 'g'),
      (d, mon, yr) => makeDate(toYear(yr, ty), MONTH_OF[mon], Number(d))],
    // 3/11 หรือ 3/11/69
    [/(?<![\d.\/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d\/])/g, (d, m, yr) => makeDate(toYear(yr, ty), Number(m), Number(d))],
    // อีก 5 วัน / 5 วันข้างหน้า / 3 วันก่อน
    [/อีก\s*(\d{1,3})\s*วัน(?:ข้างหน้า|ถัดไป)?/g, n => addDays(today, Number(n))],
    [/(\d{1,3})\s*วัน(?:ข้างหน้า|ถัดไป)/g, n => addDays(today, Number(n))],
    [/(\d{1,3})\s*วัน(?:ก่อน|ที่แล้ว|ที่ผ่านมา)/g, n => addDays(today, -Number(n))],
    [/เมื่อวานซืน/g, () => addDays(today, -2)],
    [/เมื่อวาน/g, () => addDays(today, -1)],
    [/มะรืน(?:นี้)?/g, () => addDays(today, 2)],
    [/พรุ่งนี้/g, () => addDays(today, 1)],
    [/วันนี้/g, () => today],
    // วันศุกร์ / ศุกร์นี้ / ศุกร์หน้า / ศุกร์ที่แล้ว (ต้องมี "วัน" นำหน้า หรือมีคำต่อท้าย)
    [new RegExp(`(?:ของ\\s*)?(วัน)?(${DAY_RE})(\\s*(?:นี้|หน้า|ที่แล้ว|ที่ผ่านมา|ก่อน))?`, 'g'),
      (pre, name, suf) => (pre || suf ? weekday(today, DAYS[name], suf) : null)],
  ];
  let date = null;
  for (const [re, fn] of rules) {
    text = text.replace(re, (m, ...g) => {
      const v = fn(...g);
      if (!v) return m;
      date ||= v;
      return ' '.repeat(m.length);
    });
  }
  text = text.replace(new RegExp(`${REL_MONTH_RE}|ของ(?=\\s*$)`, 'g'), m => ' '.repeat(m.length));
  return { date: date || today, text };
}

// ---------- คิดเลข: "ข้าว 30+10" / "น้ำ 3x10" ----------
const NUM = '\\d+(?:\\.\\d+)?(?:\\s*(?:k|พัน)(?![a-z]))?';
const AMOUNT_RE = new RegExp(`${NUM}(?:\\s*[+x×*]\\s*${NUM}|-${NUM})*`, 'gi');
function evalAmount(expr) {
  const val = t => parseFloat(t) * (/k|พัน/i.test(t) ? 1000 : 1);
  let sum = 0, sign = 1, prod = null, mul = false;
  for (const t of expr.match(/\d+(?:\.\d+)?(?:\s*(?:k|พัน)(?![a-z]))?|[+x×*-]/gi)) {
    if (t === '+' || t === '-') { sum += sign * (prod ?? 0); prod = null; sign = t === '-' ? -1 : 1; }
    else if (/^[x×*]$/i.test(t)) mul = true;
    else { prod = prod !== null && mul ? prod * val(t) : val(t); mul = false; }
  }
  return sum + sign * (prod ?? 0);
}

/**
 * @param {string} raw ข้อความจากผู้ใช้
 * @param {Array} categories หมวดทั้งหมด (จาก mergeCategories)
 * @param {Array} keywords คำที่ผู้ใช้ตั้งเอง [{word, category}]
 * @param {string} today วันนี้ (YYYY-MM-DD เวลาไทย)
 * @returns {{date:string, items:Array<{type,category,amount,note,sure}>}}
 */
export function parseMessage(raw, categories, keywords = [], today = bkkDate()) {
  const found0 = extractDate(normalize(raw), today);
  const date = found0.date;
  let text = found0.text;
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
  let mt;
  AMOUNT_RE.lastIndex = 0;
  while ((mt = AMOUNT_RE.exec(masked))) {
    const amount = Math.round(evalAmount(mt[0]) * 100) / 100;
    const expr = /[+x×*-]/i.test(mt[0].replace(/\s*(k|พัน)/gi, '')) ? mt[0].replace(/\s+/g, '') : '';
    if (amount > 0 && amount < 10000000) nums.push({ start: mt.index, end: mt.index + mt[0].length, amount, expr });
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
    const base = cleanNote(noteSrc) || cat.name;
    items.push({
      type: cat.type,
      category: cat.id,
      amount: n.amount,
      note: (n.expr ? `${base} ${n.expr}` : base).slice(0, 60),
      sure: !!kw && !kw.weak,
    });
  });

  return { date, items };
}
