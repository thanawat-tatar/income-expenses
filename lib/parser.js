// ตัวแยกข้อความ (ไม่ใช้ AI) : "น้ำมัน60 ข้าว 50 ได้ทิป 20" -> หลายรายการ
import { OTHER } from './categories.js';
import { bkkDate } from './date.js';

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';
const MAX_ITEMS = 30;

// แก้การพิมพ์ไทยที่หน้าตาเหมือนกันแต่ตัวอักษรต่างกัน เช่น "เเ" กับ "แ", "นำ้" กับ "น้ำ"
export function normalizeThai(t) {
  return String(t || '')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .replace(/เเ/g, 'แ')
    .replace(/ํ([่-๋]?)า/g, '$1ำ')
    .replace(/ำ([่-๋])/g, '$1ำ')
    .replace(/([่-๋])\1+/g, '$1');
}

function normalize(t) {
  return normalizeThai(t)
    .replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
    .replace(/(\d)[,，](?=\d{3}\b|\d{3}\D|\d{3}$)/g, '$1');
}

const FILLER_ANY = /และ|แล้วก็|สุดท้าย|หลังจากนั้น|จากนั้น|ตอน(?:เช้า|สาย|กลางวัน|เที่ยง|บ่าย|เย็น|ค่ำ|ดึก|นี้)|อีก/g;
const FILLER_EDGE = /^(?:คือว่า|คือ|ว่า|ของ|มี|ผม|ฉัน|หนู|เรา|กู|ก็|เป็น|รวม|ทั้งหมด|ไป|ซื้อ|ใน)+|(?:ของ|มี|ครับ|ค่ะ|คะ|จ้า|นะ|รวม|ทั้งหมด|ไป|ใน|มา)+$/g;
function cleanNote(s) {
  s = s.replace(FILLER_ANY, ' ').replace(/บาท|บ\.|฿|thb/gi, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) s = s.split(' ').map(w => w.replace(FILLER_EDGE, '')).filter(Boolean).join(' ');
  return s
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
    [/เมื่อคืน(?:นี้)?/g, () => addDays(today, -1)],
    [/ตอนนี้|เมื่อกี้|เมื่อเช้า|เมื่อตะกี้/g, () => today],
    [/เมื่อวานซืน/g, () => addDays(today, -2)],
    [/เมื่อวาน/g, () => addDays(today, -1)],
    [/มะรืน(?:นี้)?/g, () => addDays(today, 2)],
    [/พรุ่งนี้/g, () => addDays(today, 1)],
    [/วันนี้/g, () => today],
    // วันศุกร์ / ศุกร์นี้ / ศุกร์หน้า / ศุกร์ที่แล้ว (ต้องมี "วัน" นำหน้า หรือมีคำต่อท้าย)
    [new RegExp(`(?:ของ\\s*)?(วัน)?(${DAY_RE})(\\s*(?:นี้|หน้า|ที่แล้ว|ที่ผ่านมา|ก่อน))?`, 'g'),
      (pre, name, suf) => (pre || suf ? weekday(today, DAYS[name], suf) : null)],
  ];
  const marks = [];
  for (const [re, fn] of rules) {
    text = text.replace(re, (m, ...g) => {
      const v = fn(...g.slice(0, -2));
      if (!v) return m;
      marks.push({ start: g[g.length - 2], end: g[g.length - 2] + m.length, date: v });
      return ' '.repeat(m.length);
    });
  }
  text = text.replace(new RegExp(REL_MONTH_RE, 'g'), m => ' '.repeat(m.length));
  marks.sort((a, b) => a.start - b.start);
  return { date: marks[0]?.date || today, marks, text };
}

// ---------- จำนวนชิ้น: "ขนม 3 อย่าง", "ข้าว 2 ห่อ ห่อละ 40" ----------
const UNIT_RE = 'อย่าง|ชิ้น|ห่อ|แก้ว|ขวด|อัน|กล่อง|ถุง|จาน|ชาม|ลูก|ตัว|ใบ|แพ็ค|แพค|คน|ครั้ง|ลิตร|กิโล|กก\\.?|มื้อ|เม็ด|ซอง|หลอด|ขีด|ไม้|ถ้วย|กระป๋อง|เล่ม|คู่|แผ่น|ม้วน|ชุด';
const QTY_RE = new RegExp(`(\\d+(?:\\.\\d+)?)\\s*(${UNIT_RE})(?:\\s*(?:${UNIT_RE})?\\s*ละ)?`, 'g');
const CLAUSE_RE = /\n|[,;]|และ|แล้วก็|ต่อมา/g;

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
  const text = found0.text;
  const lower = text.toLowerCase();

  // แบ่งข้อความเป็นช่วงๆ ด้วย "และ", ขึ้นบรรทัด, จุลภาค → แต่ละช่วงมีวันของตัวเองได้
  const seps = [...text.matchAll(CLAUSE_RE)].map(m => m.index);
  const clauseOf = pos => seps.filter(i => i < pos).length;

  // พจนานุกรม: คำของผู้ใช้ + ชื่อหมวด + คำเริ่มต้น
  const byId = Object.fromEntries(categories.map(c => [c.id, c]));
  const dict = [];
  for (const k of keywords) {
    const c = byId[k.category];
    if (c && k.word) dict.push({ w: normalizeThai(k.word).toLowerCase().trim(), cat: c, custom: 1, weak: false });
  }
  for (const c of categories) {
    dict.push({ w: normalizeThai(c.name).toLowerCase(), cat: c, custom: c.custom ? 1 : 0, weak: false });
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
  let masked = text.split('').map((ch, i) => (used[i] ? ' ' : ch)).join('');
  // ตัดจำนวนชิ้นออก ไม่ให้นับเป็นเงิน ถ้ามี "ละ" ให้คูณกับราคาถัดไป
  const multipliers = [];
  masked = masked.replace(QTY_RE, (m, q, unit, off) => {
    if (/ละ$/.test(m)) multipliers.push({ at: off + m.length, q: Number(q) });
    return ' '.repeat(m.length);
  });
  const nums = [];
  let mt;
  AMOUNT_RE.lastIndex = 0;
  while ((mt = AMOUNT_RE.exec(masked))) {
    let amount = Math.round(evalAmount(mt[0]) * 100) / 100;
    let expr = /[+x×*-]/i.test(mt[0].replace(/\s*(k|พัน)/gi, '')) ? mt[0].replace(/\s+/g, '') : '';
    const mul = multipliers.find(x => x.at <= mt.index && !masked.slice(x.at, mt.index).trim());
    if (mul) { amount = Math.round(amount * mul.q * 100) / 100; expr = `${expr || mt[0].trim()}x${mul.q}`; }
    if (amount > 0 && amount < 10000000) nums.push({ start: mt.index, end: mt.index + mt[0].length, amount, expr });
  }

  const dictWords = new Set(dict.map(d => d.w));
  const taken = new Set();
  const items = [];
  // ข้อความแบบ "คำ แล้วตามด้วยเลข" (แบบที่คนไทยพิมพ์ส่วนใหญ่) → ห้ามไปหยิบคำหลังเลข
  const wordFirst = nums.length > 0 && !!cleanNote(text.slice(0, nums[0].start));
  // คำกว้างๆ (จ่าย/ได้) ให้ดูคำแรก, คำชัดเจนให้ดูคำที่ใกล้เลขที่สุด
  const pick = list => list.filter(m => !m.weak).pop() || list.find(m => m.weak);
  nums.slice(0, MAX_ITEMS).forEach((n, idx) => {
    const prevEnd = idx > 0 ? nums[idx - 1].end : 0;
    const nextStart = idx < nums.length - 1 ? nums[idx + 1].start : text.length;

    let kw = pick(kws.filter(m => m.start >= prevEnd && m.end <= n.start && !taken.has(m)));
    let noteSrc = text.slice(prevEnd, n.start);
    let carried = false;
    if (!kw && (!wordFirst || !cleanNote(noteSrc))) {
      const prev = items[items.length - 1];
      if (wordFirst && prev?.kw && clauseOf(prevEnd) === clauseOf(n.start)) {
        // "ขนม 10 บาท 30 บาท" → เลขที่ตามมาติดๆ ใช้หมวดเดียวกับตัวก่อน
        kw = prev.kw; noteSrc = prev.noteSrc; carried = true;
      } else if (!wordFirst) {
        // "60 น้ำมัน 50 ข้าว" → ดูคำหลังตัวเลข
        const after = kws.filter(m => m.start >= n.end && m.end <= nextStart && !taken.has(m));
        kw = after.find(m => !m.weak) || after[0];
        if (kw) noteSrc = text.slice(n.end, kw.end);
      }
    }
    if (kw && !carried) taken.add(kw);

    const cat = kw ? kw.cat : byId[OTHER.expense];
    const base = cleanNote(noteSrc) || cat.name;
    items.push({
      type: cat.type,
      category: cat.id,
      amount: n.amount,
      note: (n.expr ? `${base} ${n.expr}` : base).slice(0, 60),
      word: kw && !kw.weak ? '' : learnWord(cleanNote(noteSrc)),
      // บอทเดาจากคำอื่น แต่มีคำที่ยังไม่รู้จักติดมาด้วย เช่น "น้ำท่อมกิน" → ถาม "น้ำท่อม"
      guess: kw && !kw.weak && !kw.custom && !carried ? guessWord(cleanNote(noteSrc), kw.w, dictWords) : '',
      sure: !!kw && !kw.weak,
      kw, noteSrc, start: n.start, end: n.end,
    });
  });

  assignDates(items, found0.marks, text, clauseOf, today);
  const clean = items.map(({ kw, noteSrc, start, end, ...it }) => it);
  const dates = [...new Set(clean.map(i => i.date))];
  return {
    date: dates.length === 1 ? dates[0] : (dates[0] || today),
    items: clean,
    truncated: nums.length > MAX_ITEMS,
  };
}

// คำที่บอทไม่รู้จัก ใช้ถามผู้ใช้ว่าเป็นหมวดอะไร เช่น "จ่ายค่าเทอม" → "ค่าเทอม"
const LEAD_RE = /^(?:โดน|สุดท้าย|จากนั้น|หลังจากนั้น|ต่อมา|แล้ว|ก่อน|ทีนี้|อันนี้|จ่ายค่า|จ่าค่า|จ่าย|จ่า|ค่า|ซื้อ|ได้|เติม|เงิน)+/;
const TAIL_RE = /(?:ได้|ไป|มา|จาก|ให้|เงิน|ด้วย|แล้ว)+$/;
function learnWord(note) {
  const w = (note.split(' ').pop() || '').replace(/[0-9.+x×*-]+/gi, '').replace(LEAD_RE, '').replace(TAIL_RE, '').trim();
  return w.length >= 2 && w.length <= 30 ? w : '';
}

function guessWord(note, kwWord, dictWords) {
  const rest = note.toLowerCase().replace(kwWord, ' ').trim();
  const w = learnWord(rest);
  return w && !dictWords.has(w) ? w : '';
}

// ใส่วันให้แต่ละรายการ: คำบอกวันติดกับรายการไหน ก็เป็นวันของรายการนั้น
// ถ้าอยู่ต้นช่วง (หลัง "และ") ใช้กับทั้งช่วง และช่วงถัดไปที่ไม่ได้บอกวัน
function assignDates(items, marks, text, clauseOf, today) {
  const blank = s => !cleanNote(s);
  if (marks.length === 1 && items.length) {
    const m = marks[0];
    if (blank(text.slice(0, m.start)) || blank(text.slice(m.end))) { items.forEach(i => { i.date = m.date; }); return; }
  }
  const itemDate = new Map(), clauseDate = {};
  for (const m of marks) {
    const c = clauseOf(m.start);
    const inClause = items.filter(i => clauseOf(i.start) === c);
    const prev = [...inClause].reverse().find(i => i.end <= m.start);
    const next = inClause.find(i => i.start >= m.end);
    if (prev && blank(text.slice(prev.end, m.start))) { if (!itemDate.has(prev)) itemDate.set(prev, m.date); }
    else if (!next || next === inClause[0]) { if (!(c in clauseDate)) clauseDate[c] = m.date; }
    else if (!itemDate.has(next)) itemDate.set(next, m.date);
  }
  for (const it of items) {
    let d = itemDate.get(it);
    for (let c = clauseOf(it.start); !d && c >= 0; c--) d = clauseDate[c];
    it.date = d || today;
  }
}
