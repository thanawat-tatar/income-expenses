// อ่านสลิปด้วย Google Gemini
// - ไม่เก็บรูป: ดึงรูปจาก LINE มาไว้ในหน่วยความจำ → ส่งให้ Gemini อ่าน → ทิ้งทันที เก็บแค่ยอด/ชื่อผู้รับ/วันที่
// - กันสแปม: คนละ 1 รูปต่อ 3 วินาที
// - กันโควต้าฟรีหมด: ทั้งระบบไม่เกิน GEMINI_RPM ครั้งต่อนาที (เกิน → ให้พิมพ์เอง/กดตัวเลขเอง/รอ 1 นาที)
import crypto from 'node:crypto';
import { getDb } from './firebase.js';
import { bkkDate } from './date.js';

export const SLIP_GAP_MS = 3000;
export const GEMINI_RPM = Number(process.env.GEMINI_RPM) || 10;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
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

// โควต้า AI ทั้งระบบในนาทีนี้ยังเหลือไหม (+ อ่านชื่อรุ่น AI ที่ใช้ได้ล่าสุดมาด้วย)
export async function geminiTurn() {
  const db = getDb();
  const ref = db.collection('meta').doc('gemini');
  const minute = Math.floor(Date.now() / 60000);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const d = s.exists ? s.data() : {};
    if (d.model && !goodModel) goodModel = d.model;
    const n = d.minute === minute ? d.n || 0 : 0;
    if (n >= GEMINI_RPM) return false;
    tx.set(ref, { minute, n: n + 1, total: (d.total || 0) + 1 }, { merge: true });
    return true;
  });
}
// จำรุ่นที่ใช้ได้ไว้ในฐานข้อมูล เครื่องที่เปิดใหม่จะได้ไม่ต้องลองใหม่
const rememberModel = model => getDb().collection('meta').doc('gemini').set({ model }, { merge: true }).catch(e => console.error('gemini remember', e.message));

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

const API = 'https://generativelanguage.googleapis.com/v1beta';
const key = () => ({ 'x-goog-api-key': process.env.GEMINI_API_KEY });
let goodModel = ''; // รุ่นที่ใช้ได้ล่าสุด
let listed = null;
const PER_MODEL_MS = 9000;  // รุ่นไหนช้าเกินนี้ ข้ามไปรุ่นถัดไป
const BUDGET_MS = 38000;    // รวมทุกรุ่นไม่เกินนี้ (ต้องตอบผู้ใช้ให้ทันก่อนระบบตัด)

// รุ่นอื่นที่คีย์นี้ใช้ได้ (ถาม Google ครั้งเดียว) เรียงรุ่น flash ใหม่สุดก่อน
async function otherModels() {
  if (!listed) {
    try {
      const res = await fetch(`${API}/models?pageSize=200`, { headers: key() });
      const j = res.ok ? await res.json() : {};
      listed = (j.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(n => /^gemini-.*flash/.test(n) && !/image|tts|audio|live|embedding|thinking|exp/.test(n))
        .sort((x, y) => (parseFloat(y.split('-')[1]) || 0) - (parseFloat(x.split('-')[1]) || 0) || x.length - y.length);
      if (!res.ok) console.error('gemini list', res.status, (await res.text()).slice(0, 300));
    } catch (e) { console.error('gemini list', e.message); listed = []; }
  }
  return listed;
}

async function callModel(model, body, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...key() }, body,
    });
  } finally { clearTimeout(timer); }
}

// ส่งรูปให้ Gemini อ่าน → { amount, receiver, date, time, ref, category } หรือ throw { code: 'busy' | 'notslip' | 'error' }
// รุ่นแรกใช้ไม่ได้ (โควต้าเต็ม / รุ่นถูกปิด / ล่ม) → ลองรุ่นอื่นที่คีย์นี้ใช้ได้ให้เอง สูงสุด 4 รุ่น
export async function readSlip(img, categories) {
  const body = JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: prompt(categories) }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  });
  img.base64 = null; // ทิ้งรูปทันที (เหลือแค่ในคำขอที่กำลังส่ง)
  const tried = new Set();
  const start = Date.now();
  let queue = [...new Set([goodModel, MODEL].filter(Boolean))];
  let last = { code: 'error', msg: 'no model' }, expanded = false;
  while (tried.size < 5) {
    const left = BUDGET_MS - (Date.now() - start);
    if (left < 3000) break;
    const model = queue.find(m => !tried.has(m));
    if (!model) {
      if (expanded) break;
      expanded = true;
      queue = [...queue, ...(await otherModels())];
      continue;
    }
    tried.add(model);
    let res;
    try { res = await callModel(model, body, Math.min(PER_MODEL_MS, left)); } catch (e) { last = { code: 'busy', msg: `${model} ${e.message}` }; console.error('gemini', last.msg); continue; }
    if (res.ok) {
      const j = await res.json();
      const raw = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      let d;
      try { d = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()); } catch {
        last = { code: 'error', msg: `${model} bad json ${raw.slice(0, 120)} ${JSON.stringify(j.promptFeedback || j.candidates?.[0]?.finishReason || '')}` };
        console.error('gemini', last.msg);
        continue;
      }
      if (goodModel !== model) { goodModel = model; console.log('gemini model in use:', model); await rememberModel(model); }
      return cleanSlip(d, categories);
    }
    const text = (await res.text()).slice(0, 600);
    console.error(`gemini ${model} ${res.status}`, text); // เก็บเหตุผลจริงไว้ดูใน Logs
    last = { code: res.status === 429 || res.status === 503 ? 'busy' : 'error', msg: `${model} ${res.status}` };
    if (goodModel === model) goodModel = '';
  }
  throw Object.assign(new Error('gemini ' + last.msg), { code: last.code });
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
