// อ่านสลิปด้วย Google Gemini
// - ไม่เก็บรูป: ดึงรูปจาก LINE มาไว้ในหน่วยความจำ → ส่งให้ Gemini อ่าน → ทิ้งทันที เก็บแค่ยอด/ชื่อผู้รับ/วันที่
// - กันสแปม: คนละ 1 รูปต่อ 3 วินาที
// - กันโควต้าฟรีหมด: ทั้งระบบไม่เกิน GEMINI_RPM ครั้งต่อนาที (เกิน → ให้พิมพ์เอง/กดตัวเลขเอง/รอ 1 นาที)
import { getDb } from './firebase.js';
import { bkkDate } from './date.js';
import { later } from './ctx.js';

export const SLIP_GAP_MS = 3000;
export const SLIP_PER_DAY = 40; // กันคนส่งรูปรัวทั้งวันจนโควต้า AI ของทุกคนหมด
export const GEMINI_RPM = Number(process.env.GEMINI_RPM) || 10;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash'; // ตัวหลัก (เร็วสุดจากผล "เช็คai")
const BACKUP = 'gemini-3.5-flash'; // ตัวสำรอง
const MAX_BYTES = 5 * 1024 * 1024;

export const slipReady = () => !!process.env.GEMINI_API_KEY;

// คนนี้ส่งรูปถี่เกินไปไหม (รูปแรกผ่าน รูปที่ตามมาใน 3 วิ ไม่ผ่าน)
export async function slipTurn(uid) {
  const db = getDb();
  const ref = db.collection('ratelimit').doc(uid);
  return db.runTransaction(async tx => {
    const s = await tx.get(ref);
    const now = Date.now(), d = s.exists ? s.data() : {};
    if (now - (d.slipAt || 0) < SLIP_GAP_MS) return false;
    const day = bkkDate(), n = d.slipDay === day ? d.slipN || 0 : 0;
    if (n >= SLIP_PER_DAY) return false;
    tx.set(ref, { slipAt: now, slipDay: day, slipN: n + 1 }, { merge: true });
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
const rememberModel = async model => { try { await getDb().collection('meta').doc('gemini').set({ model }, { merge: true }); } catch (e) { console.error('gemini remember', e.message.slice(0, 80)); } };

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
let goodModel = ''; // รุ่นที่ตอบสำเร็จล่าสุด
let listed = null;
const WAVE_MS = 22000; // รอแต่ละชุดไม่เกินนี้
const noThink = new Map(); // รุ่นไหนปิด "โหมดคิดนาน" ด้วยวิธีไหนได้ (ทำให้ตอบเร็วขึ้นมาก)
const THINK_OFF = [{ thinkingConfig: { thinkingLevel: 'minimal' } }, { thinkingConfig: { thinkingBudget: 0 } }, {}];

// รุ่นที่คีย์นี้ใช้ได้ (ถาม Google ครั้งเดียว) รุ่น lite มาก่อนเพราะตอบเร็วและคิวว่างกว่า
async function otherModels() {
  if (!listed) {
    try {
      const res = await fetch(`${API}/models?pageSize=200`, { headers: key() });
      const j = res.ok ? await res.json() : {};
      const ver = n => parseFloat(n.split('-')[1]) || 0;
      listed = (j.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(n => /^gemini-.*flash/.test(n) && !/image|tts|audio|live|embedding|thinking|exp|preview|latest/.test(n))
        .sort((x, y) => (/lite/.test(y) - /lite/.test(x)) || ver(y) - ver(x) || x.length - y.length);
      if (!res.ok) console.error('gemini list', res.status, (await res.text()).slice(0, 300));
    } catch (e) { console.error('gemini list', e.message); listed = []; }
  }
  return listed;
}

// เรียก 1 รุ่น: ลองปิดโหมดคิดนานก่อน ถ้ารุ่นนั้นไม่รองรับค่อยเรียกแบบปกติ
async function callModel(model, parts, ms, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  signal?.addEventListener('abort', () => ctrl.abort());
  const t0 = Date.now();
  try {
    for (let i = noThink.get(model) ?? 0; i < THINK_OFF.length; i++) {
      const res = await fetch(`${API}/models/${model}:generateContent`, {
        method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...key() },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0, ...THINK_OFF[i] } }),
      });
      if (res.status === 400 && i < THINK_OFF.length - 1) { await res.text(); continue; } // ไม่รองรับตัวเลือกนี้ → ลองแบบถัดไป
      noThink.set(model, i);
      if (!res.ok) {
        const text = (await res.text()).slice(0, 400);
        throw Object.assign(new Error(`${model} ${res.status} ${text}`), { code: res.status === 429 || res.status === 503 ? 'busy' : 'error' });
      }
      const j = await res.json();
      const raw = j.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
      let data;
      try { data = JSON.parse(raw.replace(/^```(?:json)?|```$/g, '').trim()); } catch {
        throw Object.assign(new Error(`${model} bad json ${raw.slice(0, 100)} ${JSON.stringify(j.promptFeedback || j.candidates?.[0]?.finishReason || '')}`), { code: 'error' });
      }
      return { model, data, ms: Date.now() - t0 };
    }
    throw Object.assign(new Error(`${model} 400`), { code: 'error' });
  } catch (e) {
    if (e.name === 'AbortError' || /aborted/i.test(e.message)) throw Object.assign(new Error(`${model} timeout ${Date.now() - t0}ms`), { code: 'busy' });
    throw e.code ? e : Object.assign(new Error(`${model} ${e.message}`), { code: 'error' });
  } finally { clearTimeout(timer); }
}

// ยิงหลายรุ่นพร้อมกัน ใครตอบสำเร็จก่อนใช้คนนั้น (กัน Google ช้า/คิวเต็มเป็นบางรุ่น)
async function race(models, parts, ms) {
  const stop = new AbortController();
  const errors = [];
  try {
    // รุ่นที่ถูกยกเลิกเพราะรุ่นอื่นตอบก่อน ไม่ใช่ข้อผิดพลาด → ไม่ต้องบันทึก
    return await Promise.any(models.map(m => callModel(m, parts, ms, stop.signal).catch(e => { errors.push(e); if (!stop.signal.aborted) console.error('gemini', e.message.slice(0, 300)); throw e; })));
  } catch {
    throw Object.assign(new Error(errors.map(e => e.message.slice(0, 60)).join(' | ')), { code: errors.some(e => e.code === 'busy') ? 'busy' : 'error' });
  } finally { stop.abort(); }
}

// ส่งรูปให้ Gemini อ่าน → { amount, receiver, date, time, ref, category } หรือ throw { code: 'busy' | 'notslip' | 'error' }
export async function readSlip(img, categories) {
  const parts = [{ inline_data: { mime_type: img.mime, data: img.base64 } }, { text: prompt(categories) }];
  img.base64 = null; // ทิ้งรูป (เหลือแค่ในคำขอที่กำลังส่ง)
  // ชุดแรก: ตัวหลัก + ตัวสำรอง (รู้แล้วว่าเร็ว) ไม่ต้องรอถามรายชื่อรุ่นจาก Google · ไม่ได้ค่อยลองรุ่นอื่น
  const first = [...new Set([MODEL, BACKUP, goodModel].filter(Boolean))].slice(0, 3);
  const rest = async () => (await otherModels()).filter(m => !first.includes(m)).slice(0, 3);
  let lastErr;
  for (const getWave of [() => first, rest]) {
    const wave = await getWave();
    if (!wave.length) break;
    try {
      const r = await race(wave, parts, lastErr ? 14000 : WAVE_MS);
      if (goodModel !== r.model) { goodModel = r.model; later(rememberModel(r.model)); }
      console.log(`gemini ok ${r.model} ${r.ms}ms`);
      return cleanSlip(r.data, categories);
    } catch (e) { if (e.code === 'notslip') throw e; lastErr = e; }
  }
  throw lastErr || Object.assign(new Error('no gemini model'), { code: 'error' });
}

// เจ้าของระบบพิมพ์ "เช็คai": ลองทุกรุ่นด้วยคำถามสั้นๆ ดูว่ารุ่นไหนใช้ได้ เร็วแค่ไหน
export async function probeModels() {
  listed = null;
  const all = [...new Set([MODEL, BACKUP, goodModel, ...(await otherModels())].filter(Boolean))].slice(0, 8);
  const parts = [{ text: 'Return this JSON exactly: {"ok": true}' }];
  const out = await Promise.all(all.map(m => callModel(m, parts, 12000)
    .then(r => `✅ ${m} ${(r.ms / 1000).toFixed(1)} วิ`)
    .catch(e => `❌ ${m} ${/timeout/.test(e.message) ? 'timeout' : `error ${(e.message.replace(m, '').match(/\b\d{3}\b/) || [''])[0]}`.trim()}`))); // ไม่โชว์ข้อความดิบของ Google
  console.log('gemini probe\n' + out.join('\n'));
  return out;
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
    .replace(/\s+/g, ' ').trim().slice(0, 40);
}

