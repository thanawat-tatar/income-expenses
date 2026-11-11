// ข้อความตอบกลับใน LINE (Flex Message) — ธีมชมพู อ่านง่าย จัดเป็นหมวด
import { thaiDate, thaiDateDow } from './date.js';

const PINK = '#FF4F9A';
const PINK_DARK = '#D93A80';
const PINK_SOFT = '#FFE6F1';
const PINK_BG = '#FFF6FA';
const TEAL = '#12A594';
const TEAL_SOFT = '#DAF6F1';
const RED = '#F0455A';
const RED_SOFT = '#FFE3E7';
const TEXT = '#3B1530';
const MUTED = '#9C6B85';
export const baht = n => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });

const liffUrl = () => (process.env.LIFF_ID ? `https://liff.line.me/${process.env.LIFF_ID}` : null);
const shortDate = iso => thaiDateDow(iso).replace(/ \d{4}$/, '');
const txt = (text, o = {}) => ({ type: 'text', text, wrap: true, color: TEXT, size: 'sm', ...o });
const box = (contents, o = {}) => ({ type: 'box', layout: 'vertical', contents, ...o });
const hbox = (contents, o = {}) => ({ type: 'box', layout: 'horizontal', contents, ...o });

// หัวการ์ดสีชมพู
const header = (title, sub) => box([
  txt(title, { color: '#FFFFFF', weight: 'bold', size: 'lg' }),
  ...(sub ? [txt(sub, { color: '#FFE6F1', size: 'xs', margin: 'xs' })] : []),
], { backgroundColor: PINK, paddingAll: '16px', paddingBottom: '14px' });

// ป้ายยอดรวม รายรับ/รายจ่าย
const pill = (label, value, color, bg) => box([
  txt(label, { size: 'xxs', color }),
  txt(value, { size: 'md', weight: 'bold', color }),
], { backgroundColor: bg, cornerRadius: '12px', paddingAll: '10px', flex: 1 });

const totalsRow = (inc, exp) => hbox([
  pill('💰 รายรับ', `+${baht(inc)}`, TEAL, TEAL_SOFT),
  pill('💸 รายจ่าย', `-${baht(exp)}`, RED, RED_SOFT),
], { spacing: 'sm' });

const sectionTitle = t => txt(t, { size: 'xs', weight: 'bold', color: MUTED, margin: 'lg' });

// รวมรายการเป็นหมวด: หมวดตัวหนา + ยอดรวม, รายละเอียดตัวเล็กข้างใต้
function groupRows(items, catById, mainDate) {
  const groups = new Map();
  for (const it of items) {
    const key = it.sure === false ? `?${it.category}` : it.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(it);
  }
  return [...groups.values()].map(list => {
    const it0 = list[0];
    const c = catById[it0.category] || { icon: '🏷️', name: it0.category };
    const sum = list.reduce((s, i) => s + i.amount, 0);
    const income = it0.type === 'income';
    const details = list.map(i => {
      const note = i.note && i.note !== c.name ? i.note : '';
      const day = i.date && i.date !== mainDate ? ` 📅${shortDate(i.date)}` : '';
      return list.length > 1 || note || day ? `${note || c.name} ${baht(i.amount)}${day}` : '';
    }).filter(Boolean).join(' · ');
    return box([
      hbox([
        txt(`${c.icon || '🏷️'} ${c.name}${it0.sure === false ? ' ❓' : ''}`, { weight: 'bold', flex: 5 }),
        txt(`${income ? '+' : '-'}${baht(sum)}`, { weight: 'bold', align: 'end', flex: 3, color: income ? TEAL : RED }),
      ]),
      ...(details ? [txt(details, { size: 'xxs', color: MUTED, margin: 'xs' })] : []),
    ], { margin: 'md' });
  });
}

const btn = (label, data, displayText, primary) => ({
  type: 'button', height: 'sm', style: primary ? 'primary' : 'secondary', ...(primary ? { color: PINK } : {}),
  action: { type: 'postback', label, data, displayText },
});

export function confirmMessage(items, date, pendingId, catById, orphans = []) {
  const inc = items.filter(i => i.type === 'income').reduce((s, i) => s + i.amount, 0);
  const exp = items.filter(i => i.type !== 'income').reduce((s, i) => s + i.amount, 0);
  const incomes = items.filter(i => i.type === 'income'), expenses = items.filter(i => i.type !== 'income');
  const days = new Set(items.map(i => i.date || date));
  const unsure = items.some(i => i.sure === false);
  return {
    type: 'flex', altText: `🎀 ยืนยัน ${items.length} รายการ`,
    contents: {
      type: 'bubble',
      header: header('🎀 ยืนยันรายการ', `📅 ${thaiDateDow(date)}${days.size > 1 ? ' (มีหลายวัน)' : ''} · ${items.length} รายการ`),
      body: box([
        totalsRow(inc, exp),
        ...(incomes.length ? [sectionTitle('💰 รายรับ'), ...groupRows(incomes, catById, date)] : []),
        ...(expenses.length ? [sectionTitle('💸 รายจ่าย'), ...groupRows(expenses, catById, date)] : []),
        ...(orphans.length ? [box(orphans.map(o => txt(`⚠️ "${o.text}" ไม่มีจำนวนเงิน`, { size: 'xs', color: RED })), { margin: 'lg', backgroundColor: RED_SOFT, cornerRadius: '10px', paddingAll: '8px' })] : []),
        ...(unsure ? [txt('❓ = บอทไม่แน่ใจ ตอบคำถามด้านล่างได้', { size: 'xxs', color: MUTED, margin: 'lg' })] : []),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: hbox([
        btn('ยกเลิก', `a=no&p=${pendingId}`, 'ยกเลิก'),
        btn('✅ ยืนยัน', `a=ok&p=${pendingId}`, 'ยืนยัน', true),
      ], { spacing: 'sm', backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// ถามคำที่บอทไม่รู้จัก หรือเดาไว้ (ปุ่มกดด้านล่างแชท) แล้วจำไว้เฉพาะคนนั้น
export function askMessage(item, index, pendingId, categories) {
  const base = `p=${pendingId}&i=${index}`;
  const word = item.word || item.guess;
  const current = categories.find(c => c.id === item.category);
  const guessing = !item.word && current && !['inc_other', 'exp_other'].includes(current.id);
  const cats = categories
    .filter(c => c.type === item.type && !['inc_other', 'exp_other'].includes(c.id) && !(guessing && c.id === item.category))
    .sort((a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0))
    .slice(0, guessing ? 8 : 9);
  const qbtn = (label, data, displayText) => ({ type: 'action', action: { type: 'postback', label: [...label].slice(0, 20).join(''), data, displayText } });
  return {
    type: 'flex', altText: `🧠 "${word}" คือหมวดไหน?`,
    contents: {
      type: 'bubble', size: 'kilo',
      body: box([
        txt('🧠 ช่วยสอนบอทหน่อย', { size: 'xs', weight: 'bold', color: PINK }),
        txt(`"${word}"`, { size: 'xl', weight: 'bold', margin: 'sm' }),
        txt(`${item.type === 'income' ? '+' : '-'}${baht(item.amount)} บาท`, { size: 'sm', color: item.type === 'income' ? TEAL : RED }),
        txt(guessing ? `คือ ${current.icon} ${current.name} ใช่ไหม?` : 'เป็นหมวดไหน?', { weight: 'bold', margin: 'md' }),
        txt('👇 กดปุ่มด้านล่าง หรือพิมพ์ชื่อหมวด', { size: 'xxs', color: MUTED, margin: 'sm' }),
      ], { backgroundColor: PINK_SOFT, paddingAll: '16px' }),
    },
    quickReply: {
      items: [
        ...(guessing ? [qbtn(`✅ ใช่ ${current.name}`, `a=learn&${base}&c=${current.id}`, `${word} = ${current.name}`)] : []),
        qbtn('➕ หมวดใหม่', `a=newcat&${base}`, 'สร้างหมวดใหม่'),
        ...cats.map(c => qbtn(`${c.icon} ${c.name}`, `a=learn&${base}&c=${c.id}`, `${word} = ${c.name}`)),
        qbtn(item.type === 'income' ? '↔ เป็นรายจ่าย' : '↔ เป็นรายรับ', `a=flip&${base}`, item.type === 'income' ? 'เป็นรายจ่าย' : 'เป็นรายรับ'),
        qbtn('ข้าม', `a=skip&${base}`, 'ข้าม'),
        qbtn('⏭ ข้ามทั้งหมด', `a=skipall&${base}`, 'ข้ามทั้งหมด'),
      ],
    },
  };
}

// ข้อความสั้นแบบการ์ดเล็ก
export function noteCard(emoji, title, sub) {
  return {
    type: 'flex', altText: `${emoji} ${title}`,
    contents: {
      type: 'bubble', size: 'kilo',
      body: hbox([
        txt(emoji, { size: 'xxl', flex: 0, gravity: 'center' }),
        box([txt(title, { weight: 'bold' }), ...(sub ? [txt(sub, { size: 'xs', color: MUTED })] : [])], { margin: 'md', justifyContent: 'center' }),
      ], { backgroundColor: PINK_SOFT, paddingAll: '14px' }),
    },
  };
}

export function savedMessage(count, dateLabel, net) {
  return noteCard('✅', `บันทึกแล้ว ${count} รายการ`, `${dateLabel} · วันนี้ ${net >= 0 ? '▲ กำไร' : '▼ ขาดทุน'} ${baht(Math.abs(net))} ฿`);
}

export function summaryMessage(entries, date, catById) {
  const inc = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const net = inc - exp;
  const byCat = {};
  for (const e of entries) byCat[e.category] = (byCat[e.category] || 0) + e.amount;
  const max = Math.max(1, ...Object.values(byCat));
  const catRows = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id, sum]) => {
    const c = catById[id] || { name: id, icon: '🏷️', type: 'expense' };
    const income = c.type === 'income';
    return box([
      hbox([
        txt(`${c.icon || '🏷️'} ${c.name}`, { flex: 5 }),
        txt(`${income ? '+' : '-'}${baht(sum)}`, { weight: 'bold', align: 'end', flex: 3, color: income ? TEAL : RED }),
      ]),
      box([box([], { width: `${Math.max(4, Math.round((sum / max) * 100))}%`, height: '6px', backgroundColor: income ? TEAL : PINK, cornerRadius: '3px' })],
        { backgroundColor: '#F7DCE8', height: '6px', cornerRadius: '3px', margin: 'xs' }),
    ], { margin: 'md' });
  });
  const url = liffUrl();
  return {
    type: 'flex', altText: `📊 วันนี้ ${net >= 0 ? 'กำไร' : 'ขาดทุน'} ${baht(Math.abs(net))} บาท`,
    contents: {
      type: 'bubble',
      header: box([
        txt(`📊 สรุปวันนี้ · ${thaiDate(date)}`, { color: '#FFE6F1', size: 'xs' }),
        txt(net >= 0 ? '▲ กำไร' : '▼ ขาดทุน', { color: '#FFFFFF', size: 'sm', weight: 'bold', margin: 'sm' }),
        txt(`${net < 0 ? '-' : ''}${baht(Math.abs(net))} ฿`, { color: '#FFFFFF', size: '3xl', weight: 'bold' }),
      ], { backgroundColor: net >= 0 ? PINK : PINK_DARK, paddingAll: '18px' }),
      body: box([
        totalsRow(inc, exp),
        ...(catRows.length ? [sectionTitle('🗂️ แยกตามหมวด'), ...catRows] : [txt('วันนี้ยังไม่มีรายการ 📝', { color: MUTED, margin: 'lg', align: 'center' })]),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      ...(url ? { footer: box([{ type: 'button', style: 'primary', color: PINK, height: 'sm', action: { type: 'uri', label: '🎀 ดูในแอป', uri: url } }], { backgroundColor: PINK_BG }) } : {}),
    },
  };
}

export function undoMessage(entries, catById) {
  const inc = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const exp = entries.filter(e => e.type !== 'income').reduce((s, e) => s + e.amount, 0);
  return {
    type: 'flex', altText: '🗑️ ลบรายการล่าสุด?',
    contents: {
      type: 'bubble',
      header: header('🗑️ ลบรายการล่าสุด?', `📅 ${thaiDateDow(entries[0].date)} · ${entries.length} รายการ`),
      body: box([totalsRow(inc, exp), ...groupRows(entries, catById, entries[0].date)], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: hbox([
        btn('ไม่ลบ', 'a=keep', 'ไม่ลบ'),
        { type: 'button', style: 'primary', color: RED, height: 'sm', action: { type: 'postback', label: 'ลบ', data: `a=del&b=${entries[0].batch}`, displayText: 'ลบรายการล่าสุด' } },
      ], { spacing: 'sm', backgroundColor: PINK_BG }),
    },
  };
}

// ---------- แก้ไขรายการในแชท ----------
const qb = (label, data, displayText) => ({ type: 'action', action: { type: 'postback', label: [...label].slice(0, 20).join(''), data, displayText: displayText || label } });

export function editListMessage(entries, catById) {
  return {
    type: 'flex', altText: '✏️ เลือกรายการที่จะแก้',
    contents: {
      type: 'bubble',
      header: header('✏️ แก้ไขรายการ', 'แตะรายการที่ต้องการแก้หรือลบ 👇'),
      body: box(entries.map(e => {
        const c = catById[e.category] || { icon: '🏷️', name: e.category };
        const income = e.type === 'income';
        const note = e.note && e.note !== c.name ? `${e.note} · ` : '';
        return hbox([
          txt(c.icon || '🏷️', { flex: 0, size: 'lg', gravity: 'center' }),
          box([txt(c.name, { weight: 'bold' }), txt(`${note}${shortDate(e.date)}`, { size: 'xxs', color: MUTED })], { flex: 5, margin: 'md' }),
          txt(`${income ? '+' : '-'}${baht(e.amount)}`, { flex: 3, align: 'end', weight: 'bold', gravity: 'center', color: income ? TEAL : RED }),
          txt('›', { flex: 0, color: PINK, gravity: 'center', margin: 'sm', weight: 'bold' }),
        ], {
          backgroundColor: '#FFFFFF', cornerRadius: '12px', paddingAll: '10px', margin: 'sm',
          action: { type: 'postback', label: 'แก้', data: `a=pick&id=${e.id}`, displayText: `แก้ ${c.name} ${baht(e.amount)}` },
        });
      }), { backgroundColor: PINK_BG, paddingAll: '12px' }),
    },
  };
}

export function editEntryMessage(e, catById) {
  const c = catById[e.category] || { icon: '🏷️', name: e.category };
  const income = e.type === 'income';
  const id = e.id;
  return {
    type: 'flex', altText: `✏️ แก้ ${c.name}`,
    contents: {
      type: 'bubble', size: 'kilo',
      body: box([
        txt('✏️ แก้รายการนี้', { size: 'xs', weight: 'bold', color: PINK }),
        txt(`${c.icon || '🏷️'} ${c.name}`, { size: 'lg', weight: 'bold', margin: 'sm' }),
        txt(`${income ? '+' : '-'}${baht(e.amount)} บาท`, { size: 'xl', weight: 'bold', color: income ? TEAL : RED }),
        ...(e.note && e.note !== c.name ? [txt(`📝 ${e.note}`, { size: 'xs', color: MUTED })] : []),
        txt(`📅 ${thaiDateDow(e.date)}`, { size: 'xs', color: MUTED }),
        txt('👇 เลือกสิ่งที่จะแก้ด้านล่าง', { size: 'xxs', color: MUTED, margin: 'md' }),
      ], { backgroundColor: PINK_SOFT, paddingAll: '16px' }),
    },
    quickReply: {
      items: [
        qb('💰 จำนวนเงิน', `a=eamt&id=${id}`, 'แก้จำนวนเงิน'),
        qb('🗂️ หมวด', `a=ecat&id=${id}`, 'เปลี่ยนหมวด'),
        { type: 'action', action: { type: 'datetimepicker', label: '📅 วันที่', data: `a=edate&id=${id}`, mode: 'date', initial: e.date } },
        qb('📝 ชื่อรายการ', `a=enote&id=${id}`, 'แก้ชื่อรายการ'),
        qb('🗑️ ลบ', `a=edel&id=${id}`, 'ลบรายการนี้'),
        qb('📋 รายการอื่น', 'a=elist', 'แก้รายการอื่น'),
        qb('✔️ เสร็จแล้ว', 'a=edone', 'เสร็จแล้ว'),
      ],
    },
  };
}

export function editCategoryMessage(e, categories) {
  const cats = categories.filter(c => c.type === e.type && c.id !== e.category)
    .sort((a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0)).slice(0, 11);
  return {
    ...noteCard('🗂️', 'เลือกหมวดใหม่', 'กดปุ่มด้านล่าง 👇'),
    quickReply: {
      items: [
        ...cats.map(c => qb(`${c.icon} ${c.name}`, `a=ecat2&id=${e.id}&c=${c.id}`, `เปลี่ยนเป็น ${c.name}`)),
        qb(e.type === 'income' ? '↔ เป็นรายจ่าย' : '↔ เป็นรายรับ', `a=eflip&id=${e.id}`),
      ],
    },
  };
}

// บอทไม่เข้าใจหลายครั้ง: บอกวิธีพิมพ์ + ปุ่มเปิดหน้าตั้งค่า
export function stuckMessage() {
  const url = liffUrl();
  const sec = l => txt(`• ${l}`, { size: 'sm', margin: 'xs' });
  return {
    type: 'flex', altText: '🤔 บอทยังไม่เข้าใจ ลองแบบนี้นะ',
    contents: {
      type: 'bubble', size: 'kilo',
      header: header('🤔 บอทยังไม่เข้าใจ', 'ลองพิมพ์แบบนี้ดูนะ'),
      body: box([
        sec('จด: ข้าว 50 น้ำมัน 60'),
        sec('แก้: พิมพ์ "แก้ไข" แล้วแตะรายการ'),
        sec('สอนคำ: แซนวิช = ค่ากิน'),
        txt('หรือเปิดหน้าตั้งค่า ทำในเว็บได้เลย 👇', { size: 'xs', color: MUTED, margin: 'md' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: box([
        ...(url ? [{ type: 'button', style: 'primary', color: PINK, height: 'sm', action: { type: 'uri', label: '⚙️ เปิดหน้าตั้งค่า', uri: `${url}?page=settings` } }] : []),
        { type: 'button', style: 'secondary', height: 'sm', margin: 'sm', action: { type: 'message', label: '📒 วิธีใช้ทั้งหมด', text: 'วิธีใช้' } },
      ], { backgroundColor: PINK_BG }),
    },
  };
}

export function withQuick(message, buttons) {
  return { ...message, quickReply: { items: buttons.map(([label, data, shown]) => qb(label, data, shown)) } };
}

// วิธีใช้ แบบการ์ดอ่านง่าย
export function helpMessage(greeting) {
  const sec = (title, lines) => box([
    txt(title, { weight: 'bold', color: PINK }),
    ...lines.map(l => txt(`• ${l}`, { size: 'xs', margin: 'xs' })),
  ], { margin: 'lg' });
  return {
    type: 'flex', altText: '📒 วิธีใช้งาน',
    contents: {
      type: 'bubble',
      header: header(greeting || '🎀 วิธีใช้งาน', 'พิมพ์เหมือนคุยกับเพื่อนได้เลย'),
      body: box([
        sec('✍️ จดรายการ', ['น้ำมัน 60 ข้าว 50', 'วิ่งงาน 1200 ทิป 20', 'ข้าว 30+10 · ข้าวห้าสิบ']),
        sec('📅 ระบุวัน', ['เมื่อวาน ข้าว 50', 'วันที่ 3 ค่าห้อง 3000', 'ศุกร์หน้า ค่ารถ 100']),
        sec('🧠 สอนบอท', ['แซนวิช = ค่ากิน', 'หมวดใหม่ ค่าขนมลูก', 'ลบคำ แซนวิช']),
        sec('✏️ แก้ไข / ลบ', ['พิมพ์ "แก้ไข" แล้วแตะรายการ', 'แก้ข้าว 50 เป็น 60', 'ลบ ข้าว 50']),
        sec('⚙️ คำสั่ง', ['สรุปวันนี้', 'ยกเลิก', 'วิธีใช้']),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
  };
}

export const text = t => ({ type: 'text', text: t });
