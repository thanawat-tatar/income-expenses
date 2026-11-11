// ข้อความตอบกลับใน LINE (Flex Message)
import { thaiDate, thaiDateDow } from './date.js';

const GREEN = '#0E9F6E';
const RED = '#E02424';
const GRAY = '#6B7280';
export const baht = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });

const row = (left, right, color, bold) => ({
  type: 'box', layout: 'horizontal', spacing: 'md', contents: [
    { type: 'text', text: left, size: 'sm', color: '#111827', flex: 5, wrap: true, weight: bold ? 'bold' : 'regular' },
    { type: 'text', text: right, size: 'sm', color, align: 'end', flex: 3, weight: 'bold' },
  ],
});

const liffUrl = () => (process.env.LIFF_ID ? `https://liff.line.me/${process.env.LIFF_ID}` : null);

export function confirmMessage(items, date, pendingId, catById) {
  const line = it => {
    const c = catById[it.category] || {};
    const sign = it.type === 'income' ? '+' : '-';
    const label = `${c.icon || ''} ${c.name || it.category}${it.note && it.note !== c.name ? ` (${it.note})` : ''}${it.sure ? '' : ' ❓'}`;
    return row(label, `${sign}${baht(it.amount)} ฿`, it.type === 'income' ? GREEN : RED);
  };
  // หลายวันในข้อความเดียว → แยกหัวข้อตามวัน
  const days = [...new Set(items.map(i => i.date || date))].sort();
  const multi = days.length > 1;
  const lines = multi
    ? days.flatMap(d => [
      { type: 'text', text: `📅 ${thaiDateDow(d)}`, size: 'sm', weight: 'bold', color: GRAY, margin: 'lg' },
      ...items.filter(i => (i.date || date) === d).map(line),
    ])
    : items.map(line);
  const unsure = items.some(i => !i.sure);
  return {
    type: 'flex', altText: 'โปรดยืนยันรายการ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: 'โปรดยืนยันรายการ', weight: 'bold', size: 'lg' },
          ...(multi ? [] : [{ type: 'text', text: `📅 ${thaiDateDow(days[0])}`, size: 'sm', color: GRAY }]),
          { type: 'separator' },
          ...lines,
          ...(unsure ? [{ type: 'text', text: '❓ = ไม่แน่ใจหมวด ตั้งคำเพิ่มได้ที่เมนู "ตั้งค่า"', size: 'xxs', color: GRAY, wrap: true }] : []),
        ],
      },
      footer: {
        type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
          { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: 'ยกเลิก', data: `a=no&p=${pendingId}`, displayText: 'ยกเลิก' } },
          { type: 'button', style: 'primary', color: GREEN, height: 'sm', action: { type: 'postback', label: 'ยืนยัน', data: `a=ok&p=${pendingId}`, displayText: 'ยืนยัน' } },
        ],
      },
    },
  };
}

export function summaryMessage(entries, date, catById) {
  const inc = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = inc - exp;
  const byCat = {};
  for (const e of entries) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([id, sum]) => {
    const c = catById[id] || { name: id, type: 'expense' };
    return row(`${c.icon || ''} ${c.name}`, `${c.type === 'income' ? '+' : '-'}${baht(sum)}`, c.type === 'income' ? GREEN : RED);
  });
  const url = liffUrl();
  return {
    type: 'flex', altText: `สรุปวันนี้ ${net >= 0 ? 'กำไร' : 'ขาดทุน'} ${baht(Math.abs(net))} บาท`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box', layout: 'vertical', spacing: 'md', contents: [
          { type: 'text', text: `สรุปวันนี้ · ${thaiDate(date)}`, size: 'xs', color: GRAY },
          { type: 'text', text: net >= 0 ? 'กำไร' : 'ขาดทุน', size: 'sm', color: net >= 0 ? GREEN : RED, weight: 'bold' },
          { type: 'text', text: `${baht(Math.abs(net))} ฿`, size: '3xl', weight: 'bold', color: net >= 0 ? GREEN : RED },
          { type: 'separator' },
          row('รายรับ', `${baht(inc)} ฿`, GREEN, true),
          row('รายจ่าย', `${baht(exp)} ฿`, RED, true),
          ...(catRows.length ? [{ type: 'separator' }, ...catRows] : [{ type: 'text', text: 'วันนี้ยังไม่มีรายการ', size: 'sm', color: GRAY }]),
        ],
      },
      ...(url ? { footer: { type: 'box', layout: 'vertical', contents: [{ type: 'button', style: 'link', height: 'sm', action: { type: 'uri', label: 'ดูรายละเอียด', uri: url } }] } } : {}),
    },
  };
}

export function undoMessage(entries, catById) {
  const lines = entries.map(e => {
    const c = catById[e.category] || { name: e.category };
    return row(`${c.icon || ''} ${c.name}`, `${e.type === 'income' ? '+' : '-'}${baht(e.amount)} ฿`, e.type === 'income' ? GREEN : RED);
  });
  return {
    type: 'flex', altText: 'ลบรายการล่าสุด?',
    contents: {
      type: 'bubble',
      body: { type: 'box', layout: 'vertical', spacing: 'md', contents: [
        { type: 'text', text: 'ลบรายการที่บันทึกล่าสุด?', weight: 'bold', size: 'md' },
        { type: 'text', text: thaiDate(entries[0].date), size: 'xs', color: GRAY },
        { type: 'separator' }, ...lines,
      ] },
      footer: { type: 'box', layout: 'horizontal', spacing: 'sm', contents: [
        { type: 'button', style: 'secondary', height: 'sm', action: { type: 'postback', label: 'ไม่ลบ', data: 'a=keep', displayText: 'ไม่ลบ' } },
        { type: 'button', style: 'primary', color: RED, height: 'sm', action: { type: 'postback', label: 'ลบ', data: `a=del&b=${entries[0].batch}`, displayText: 'ลบรายการล่าสุด' } },
      ] },
    },
  };
}

export const HELP_TEXT =
`📒 วิธีใช้งาน
พิมพ์รายการกับจำนวนเงินได้เลย พิมพ์หลายรายการในข้อความเดียวได้ เช่น
• เติมน้ำมัน 60 ข้าว 50
• วิ่งงาน 1200 ทิป 20 โบนัส 300
• ข้าว 30+10 (บอทบวกเลขให้)
• ข้าว 2 ห่อ ห่อละ 40

ระบุวันได้ เช่น
• เมื่อวาน ปะยาง 120
• วันที่ 3 ข้าว 50 (เดือนนี้)
• วันที่ 3 เดือนก่อน ค่าห้อง 3000
• 3 พ.ย. น้ำมัน 100
• ศุกร์หน้า ค่ารถ 100
• อีก 5 วัน ค่าผ่อน 2500
• เมื่อวาน ข้าว 50 และ วันนี้ น้ำมัน 100

คำสั่ง
• สรุปวันนี้ — ดูยอดวันนี้
• ยกเลิก — ยกเลิก/ลบรายการล่าสุด
• วิธีใช้ — ดูข้อความนี้`;

export const text = t => ({ type: 'text', text: t });
