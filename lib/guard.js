// กันคนยิงคำขอรัวๆ (เปลืองโควต้าฟรี) — นับในเครื่องที่รับคำขอ ไม่ต้องใช้ฐานข้อมูล
const hits = new Map();
export function tooMany(key, max = 120, windowMs = 60000) {
  const now = Date.now();
  let h = hits.get(key);
  if (!h || now - h.start > windowMs) { h = { start: now, n: 0 }; hits.set(key, h); }
  h.n++;
  if (hits.size > 5000) hits.clear();
  return h.n > max;
}

// ขนาดข้อมูลที่ส่งเข้ามาต้องไม่ใหญ่ผิดปกติ
export function tooBig(request, maxBytes = 20000) {
  const n = Number(request.headers.get('content-length') || 0);
  return n > maxBytes;
}

// อ่าน JSON แบบจำกัดขนาดจริง (ไม่เชื่อ content-length อย่างเดียว) · ผิดรูปแบบ = null
export async function readJson(request, maxBytes = 20000) {
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try { const v = JSON.parse(text); return v && typeof v === 'object' && !Array.isArray(v) ? v : null; } catch { return null; }
}

// รหัสรายการต้องเป็นตัวอักษร/ตัวเลขเท่านั้น (กันส่ง path แปลกๆ เข้าฐานข้อมูล)
export const validId = id => typeof id === 'string' && /^[A-Za-z0-9]{1,40}$/.test(id);
