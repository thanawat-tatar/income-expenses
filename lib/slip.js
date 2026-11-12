// อ่านสลิปด้วย Google Gemini
// - ไม่เก็บรูป: ดึงรูปจาก LINE มาไว้ในหน่วยความจำ → ส่งให้ Gemini อ่าน → ทิ้งทันที เก็บแค่ยอด/ชื่อผู้รับ/วันที่
// - กันสแปม: คนละ 1 รูปต่อ 3 วินาที
// - กันโควต้าฟรีหมด: ทั้งระบบไม่เกิน GEMINI_RPM ครั้งต่อนาที (เกิน → ให้พิมพ์เอง/กดตัวเลขเอง/รอ 1 นาที)
import crypto from 'node:crypto';
import { getDb } from './firebase.js';
import { bkkDate } from './date.js';

export const SLIP_GAP_MS = 3000;
export const GEMINI_RPM = Number(process.env.GEMINI_RPM) || 10;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_BYTES = 5 * 1024 * 1024;

export const slipReady = () => !!process.env.GEMINI_API_KEY;

// คนนี้ส่งรูปถี่เกินไปไหม (รูปแรกผ่าน รูปที่ตามมาใน 3 วิ ไม่ผ่าน)
export async function slipTurn(uid) {
  const db = getDb();
  const ref = db.collection('ratelimit').doc(uid);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const now = Date.now();
    if (s.exists && now - (s.data().slipAt || 0) < SLIP_GAP_MS) return false;
    tx.set(ref, { slipAt: now }, { merge: true });
    return true;
  });
}

// โควต้า AI ทั้งระบบในนาทีนี้ยังเหลือไหม
export async function geminiTurn() {
  const db = getDb();
  const ref = db.collection('meta').doc('gemini');
  const minute = Math.floor(Date.now() / 60000);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const d = s.exists ? s.data() : {};
    const n = d.minute === minute ? d.n || 0 : 0;
    if (n >= GEMINI_RPM) return false;
    tx.set(ref, { minute, n: n + 1, total: (d.total || 0) + 1 });
    return true;
  });
}

// ดึงรูปจาก LINE (อยู่ในหน่วยความจำเท่านั้น)
export async function fetchImage(messageId) {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${encodeURIComponent(messageId)}/content`, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
  });
  if (!res.ok) throw Object.assign(new Error(`LINE content ${res.status}`), { code: 'error' });
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_BYTES) throw Object.assign(new Error('image too large'), { code: 'big' });
  return { base64: buf.toString('base64'), mime: res.headers.get('content-type') || 'image/jpeg' };
}

const prompt = cats => `You read Thai money-transfer slips and payment receipts (PromptPay, K PLUS, SCB EASY, Krungthai NEXT, Bangkok Bank, TrueMoney, ShopeePay, etc.).
Return ONLY this JSON:
{"is_slip": boolean, "amount": number|null, "receiver": string|null, "date": "YYYY-MM-DD"|null, "time": "HH:MM"|null, "ref": string|null, "category": string|null}
Rules:
- amount: the amount paid/transferred in THB. Not the fee, not the balance.
- receiver: name of the person or shop that RECEIVED the money, as printed (Thai is fine). Drop account numbers.
- date: Thai slips use Buddhist years (e.g. 2569 or "69") — convert to Gregorian (2569 → 2026).
- ref: the transaction reference / ID if printed.
- category: pick ONE id from this list that best fits what the money was likely for, or null if unsure:
${cats.map(c => `${c.id} = ${c.name}`).join('\n')}
- If the image is not a payment slip or receipt, set is_slip to false and the rest to null.`;

// ส่งรูปให้ Gemini อ่าน → { amount, receiver, date, time, ref, category } หรือ throw { code: 'busy' | 'notslip' | 'error' }
export async function readSlip(img, categories) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: prompt(categories) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
  } catch (e) {
    throw Object.assign(new Error('gemini ' + e.message), { code: 'error' });
  } finally {
    clearTimeout(timer);
    img.base64 = null; // ทิ้งรูปทันที
  }
  if (res.status === 429 || res.status === 503) throw Object.assign(new Error('gemini busy'), { code: 'busy' });
  if (!res.ok) throw Object.assign(new Error(`gemini ${res.status} ${(await res.text()).slice(0, 200)}`), { code: 'error' });
  const j = await res.json();
  const raw = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  let d;
  try { d = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()); } catch { throw Object.assign(new Error('bad json'), { code: 'error' }); }
  return cleanSlip(d, categories);
}

// ตรวจค่าที่ AI ตอบ ไม่เชื่อทั้งหมด
export function cleanSlip(d, categories, today = bkkDate()) {
  const amount = Math.round(Number(d?.amount) * 100) / 100;
  if (!d || d.is_slip === false || !(amount > 0 && amount < 10000000)) throw Object.assign(new Error('not a slip'), { code: 'notslip' });
  let date = /^\d{4}-\d{2}-\d{2}$/.test(d.date || '') ? d.date : '';
  if (date) {
    let y = Number(date.slice(0, 4));
    if (y > 2400) { y -= 543; date = `${y}${date.slice(4)}`; } // เผื่อ AI ไม่แปลง พ.ศ.
    const days = (Date.parse(today) - Date.parse(date)) / 86400000;
    if (!(days >= 0 && days <= 62)) date = ''; // วันที่แปลกๆ → ใช้วันนี้
  }
  const ids = new Set(categories.map(c => c.id));
  return {
    amount,
    receiver: merchantName(d.receiver || ''),
    date: date || today,
    time: /^\d{1,2}:\d{2}$/.test(d.time || '') ? d.time : '',
    ref: String(d.ref || '').replace(/[^\w-]/g, '').slice(0, 40),
    category: ids.has(d.category) ? d.category : '',
  };
}

// ชื่อร้าน/ผู้รับ แบบสั้น ใช้จำหมวด (ตัดคำนำหน้า เลขบัญชี)
export function merchantName(s) {
  return String(s)
    .replace(/[xX*•\-\d]{4,}/g, ' ')
    .replace(/^(นาย|นางสาว|นาง|น\.ส\.|ด\.ช\.|ด\.ญ\.|mr\.?|mrs\.?|ms\.?|miss)\s*/i, '')
    .replace(/\s+/g, ' ').trim().slice(0, 30);
}

// รหัสกันจดสลิปซ้ำ (ไม่เก็บเลขอ้างอิงจริง เก็บแค่ค่าที่แปลงแล้ว)
export function slipKey(uid, s) {
  const base = s.ref || `${s.amount}|${s.receiver}|${s.date}|${s.time}`;
  return crypto.createHash('sha256').update(`${uid}|${base}`).digest('hex').slice(0, 24);
}
