// วันที่ตามเวลาไทย (UTC+7) รูปแบบ YYYY-MM-DD
export function bkkDate(offsetDays = 0) {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + offsetDays * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

export function thaiDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y + 543}`;
}

const THAI_DOW = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
// "วันศุกร์ 14 พ.ย. 2569" (ไว้ให้ผู้ใช้เช็คว่าบอทเข้าใจวันถูก)
export function thaiDateDow(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `วัน${THAI_DOW[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${thaiDate(iso)}`;
}
