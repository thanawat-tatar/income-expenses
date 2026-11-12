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
