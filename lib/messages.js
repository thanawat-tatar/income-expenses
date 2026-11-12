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

export function confirmMessage(items, date, pendingId, catById, orphans = [], coupled = false) {
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
      footer: box([
        hbox([
          btn('ยกเลิก', `a=no&p=${pendingId}`, 'ยกเลิก'),
          btn('✅ ยืนยัน', `a=ok&p=${pendingId}`, 'ยืนยัน', true),
        ], { spacing: 'sm' }),
        ...(coupled ? [{ type: 'button', height: 'sm', style: 'link', color: PINK_DARK, action: { type: 'postback', label: '🔒 ยืนยันแบบส่วนตัว', data: `a=ok&p=${pendingId}&pv=1`, displayText: 'ยืนยันแบบส่วนตัว' } }] : []),
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

// net = ยอดสุทธิของวันนี้ (ส่งมาเฉพาะเมื่อมีรายการของวันนี้ · รายการวันอื่นไม่โชว์ยอดวันนี้ กันสับสน)
export const todayNet = net => `วันนี้ ${net >= 0 ? '▲ กำไร' : '▼ ขาดทุน'} ${baht(Math.abs(net))} ฿`;
export function savedMessage(count, dateLabel, net) {
  return noteCard('✅', `บันทึกแล้ว ${count} รายการ`, net == null ? `จดลงวันที่ ${dateLabel}` : `${dateLabel} · ${todayNet(net)}`);
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

export function editListMessage(entries, catById, sub) {
  return {
    type: 'flex', altText: '✏️ เลือกรายการที่จะแก้',
    contents: {
      type: 'bubble',
      header: header('✏️ แก้ไขรายการ', sub || 'แตะรายการที่ต้องการแก้หรือลบ 👇'),
      body: box(entries.map(e => {
        const c = catById[e.category] || { icon: '🏷️', name: e.category };
        const income = e.type === 'income';
        const note = e.note && e.note !== c.name ? `${e.note} · ` : '';
        return hbox([
          txt(c.icon || '🏷️', { flex: 0, size: 'lg', gravity: 'center' }),
          box([txt(`${c.name}${e.private ? ' 🔒' : ''}`, { weight: 'bold' }), txt(`${note}${shortDate(e.date)}`, { size: 'xxs', color: MUTED })], { flex: 5, margin: 'md' }),
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

export function editEntryMessage(e, catById, coupled = false) {
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
        ...(coupled && e.private ? [txt('🔒 ส่วนตัว · แฟนไม่เห็น', { size: 'xs', color: PINK_DARK })] : []),
        txt('👇 เลือกสิ่งที่จะแก้ด้านล่าง', { size: 'xxs', color: MUTED, margin: 'md' }),
      ], { backgroundColor: PINK_SOFT, paddingAll: '16px' }),
    },
    quickReply: {
      items: [
        qb('💰 จำนวนเงิน', `a=eamt&id=${id}`, 'แก้จำนวนเงิน'),
        qb('🗂️ หมวด', `a=ecat&id=${id}`, 'เปลี่ยนหมวด'),
        { type: 'action', action: { type: 'datetimepicker', label: '📅 วันที่', data: `a=edate&id=${id}`, mode: 'date', initial: e.date } },
        qb('📝 ชื่อรายการ', `a=enote&id=${id}`, 'แก้ชื่อรายการ'),
        ...(coupled ? [e.private ? qb('🔓 ให้แฟนเห็น', `a=epriv&id=${id}&v=0`, 'ให้แฟนเห็นรายการนี้') : qb('🔒 ส่วนตัว', `a=epriv&id=${id}&v=1`, 'ตั้งเป็นส่วนตัว')] : []),
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
        sec('📸 ขี้เกียจพิมพ์? ส่งรูปสลิปมาเลย', ['บอทอ่านยอดให้ แตะหมวดครั้งเดียวจบ', 'ร้านเดิม บอทจำหมวดให้เอง']),
        sec('✍️ จดรายการ', ['น้ำมัน 60 ข้าว 50', 'วิ่งงาน 1200 ทิป 20', 'ข้าว 30+10 · ข้าวห้าสิบ']),
        sec('📅 ระบุวัน', ['เมื่อวาน ข้าว 50', 'วันที่ 3 ค่าห้อง 3000', 'ศุกร์หน้า ค่ารถ 100']),
        sec('🧠 สอนบอท', ['แซนวิช = ค่ากิน', 'หมวดใหม่ ค่าขนมลูก', 'ลบคำ แซนวิช']),
        sec('✏️ แก้ไข / ลบ', ['พิมพ์ "แก้ไข" แล้วแตะรายการ', 'ยกเลิกเมื่อกี้ · แก้ข้าว 50 เป็น 60']),
        sec('💑 โหมดคู่รัก (ถ้าอยากใช้)', ['พิมพ์ "จับคู่" · ดูยอด "ของเรา"', 'แตะ 🔒 = รายการส่วนตัว แฟนไม่เห็น']),
        sec('⚙️ คำสั่ง', ['สรุปวันนี้', 'ยกเลิก', 'วิธีใช้']),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
  };
}

export const text = t => ({ type: 'text', text: t });

// ---------- ด่านรับคน / การยินยอม / ลบข้อมูล ----------
const siteUrl = () => `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'income-expenses-zeta.vercel.app'}`;
export const privacyUrl = () => `${siteUrl()}/privacy.html`;
const uriBtn = (label, uri, primary) => ({ type: 'button', height: 'sm', style: primary ? 'primary' : 'link', ...(primary ? { color: PINK } : { color: PINK_DARK }), action: { type: 'uri', label, uri } });
const row = (emoji, title, sub) => hbox([
  txt(emoji, { flex: 0, size: 'md' }),
  box([txt(title, { weight: 'bold', size: 'xs' }), txt(sub, { size: 'xxs', color: MUTED })], { margin: 'md' }),
], { margin: 'md' });

// แจ้งข้อมูลและขอความยินยอม ก่อนบันทึกรายการแรก (หัวข้อสั้น · รายละเอียดเต็มอยู่ในหน้าเว็บ)
export function consentMessage(greeting) {
  return {
    type: 'flex', altText: '🔒 ขออนุญาตก่อนเริ่มใช้ (กดยอมรับในการ์ด)',
    contents: {
      type: 'bubble',
      header: header(greeting || '🔒 ก่อนเริ่มใช้ ขออนุญาตก่อนนะ', 'สรุป 10 ข้อ · แตะ 📄 อ่านละเอียดได้'),
      body: box([
        row('📦', '1. ข้อมูลที่เก็บ', 'LINE ID · ชื่อในไลน์ · รายการเงิน · ยอด/ผู้รับจากสลิป'),
        row('🎯', '2. ใช้ทำอะไร', 'จดและสรุปรายรับรายจ่ายให้คุณคนเดียว'),
        row('👀', '3. ใครเห็นได้', 'คุณ และผู้ดูแลระบบ (เท่าที่จำเป็นเท่านั้น)'),
        row('🚫', '4. ไม่ขาย ไม่แชร์', 'ไม่ให้บุคคลที่สาม ไม่ทำโฆษณา'),
        row('🌏', '5. เก็บที่ไหน', 'Google Firebase · Vercel (เซิร์ฟเวอร์ต่างประเทศ)'),
        row('📸', '6. อ่านสลิปด้วย AI', 'รูปสลิปส่งให้ Google Gemini อ่าน · ไม่เก็บรูป'),
        row('⏳', '7. เก็บนานแค่ไหน', 'ไม่ใช้ 30 วัน ลบอัตโนมัติ'),
        row('🗑️', '8. สิทธิ์ของคุณ', 'ขอดู แก้ ลบ ถอนความยินยอมได้ทุกเมื่อ'),
        row('🧒', '9. อายุต่ำกว่า 20 ปี', 'ให้ผู้ปกครองรับทราบและยินยอมก่อนใช้'),
        row('⚠️', '10. ข้อตกลงการใช้', 'ใช้ฟรี ไม่ใช่คำแนะนำทางการเงิน'),
        txt('กด "ยอมรับทั้งหมด" = อ่านและยอมรับนโยบายข้อมูลและข้อตกลงการใช้ทั้ง 10 ข้อ', { size: 'xxs', color: MUTED, margin: 'lg' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: box([
        uriBtn('📄 อ่านละเอียดทุกข้อ', privacyUrl()),
        hbox([
          btn('ไม่ยอมรับ', 'a=deny', 'ไม่ยอมรับ'),
          btn('💖 ยอมรับทั้งหมด', 'a=agree', 'ยอมรับทั้งหมด', true),
        ], { spacing: 'sm' }),
      ], { backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// ทักไปบอกคนรอคิวว่าถึงคิวแล้ว (ส่งครั้งเดียว) ต้องอ่านแล้วรู้ทันทีว่าคืออะไร ไม่ดูเหมือนมิจฉาชีพ
const msToISO = ms => new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
export function inviteMessage(waitedAt, deadline) {
  const ok = t => txt(`✅ ${t}`, { size: 'xs', margin: 'xs' });
  return {
    type: 'flex', altText: '🎉 ถึงคิวคุณแล้ว! สมุดรายรับรายจ่ายที่คุณลงชื่อรอไว้',
    contents: {
      type: 'bubble',
      header: header('🎉 ถึงคิวคุณแล้ว!', 'จาก สมุดรายรับรายจ่าย 🎀 (บัญชีไลน์นี้)'),
      body: box([
        txt('จำได้ไหม? 🐷', { weight: 'bold', size: 'md' }),
        txt(`เมื่อ ${thaiDate(msToISO(waitedAt))} คุณลงชื่อรอคิวไว้ เพื่อใช้สมุดจดรายรับรายจ่ายผ่านแชท LINE (ใช้ฟรี)`, { margin: 'sm' }),
        txt(`ตอนนี้มีที่ว่างแล้ว เราเก็บที่ไว้ให้ถึง ${thaiDate(msToISO(deadline))} 💕`, { margin: 'md', weight: 'bold', color: PINK_DARK }),
        box([
          ok('ใช้ฟรี ไม่ต้องจ่ายเงิน'),
          ok('ไม่ขอรหัส เลขบัตร หรือข้อมูลธนาคาร'),
          ok('ไม่ต้องกดลิงก์ไปที่อื่น'),
        ], { margin: 'lg', backgroundColor: '#FFFFFF', cornerRadius: '12px', paddingAll: '10px' }),
        txt('👇 อ่านการ์ดถัดไป แล้วกด "ยอมรับทั้งหมด" เพื่อเริ่มใช้ ถ้าไม่สนใจแล้ว กด "ไม่ยอมรับ" ที่จะส่งต่อให้คนถัดไป', { size: 'xs', color: MUTED, margin: 'lg' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
  };
}

// คนเต็มแล้ว
export function fullMessage(queue) {
  return {
    type: 'flex', altText: '🐷 ตอนนี้เต็มแล้ว',
    contents: {
      type: 'bubble', size: 'kilo',
      header: header('🐷 ตอนนี้ที่เต็มแล้ว', 'เปิดให้ใช้ฟรี แต่รับได้จำนวนจำกัด'),
      body: box([
        txt(queue ? `📋 คุณอยู่คิวที่ ${queue}` : 'ลงชื่อรอคิวไว้ได้นะ', { weight: 'bold' }),
        txt('ถึงคิวเมื่อไหร่ บอทจะทักไปบอกเอง และเก็บที่ไว้ให้ 3 วัน', { size: 'xs', color: MUTED, margin: 'sm' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      ...(queue ? {} : { footer: box([btn('📋 ลงชื่อรอคิว', 'a=wait', 'ลงชื่อรอคิว', true)], { backgroundColor: PINK_BG }) }),
    },
  };
}

// ลบข้อมูลของฉัน (ถาม 2 ขั้น)
export function wipeAskMessage(step2) {
  const t = Date.now();
  return {
    type: 'flex', altText: '🗑️ ลบข้อมูลทั้งหมด?',
    contents: {
      type: 'bubble', size: 'kilo',
      header: header(step2 ? '⚠️ ยืนยันครั้งสุดท้าย' : '🗑️ ลบข้อมูลทั้งหมด?', step2 ? 'ลบแล้วกู้คืนไม่ได้นะ' : 'รายการ ยอดสรุป หมวด คำที่สอน'),
      body: box([
        txt(step2 ? 'ข้อมูลทุกอย่างของคุณจะหายถาวร 🥺' : 'ทุกอย่างของคุณจะถูกลบออกจากระบบ', { size: 'sm' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: hbox([
        btn('ยกเลิก', 'a=wipeno', 'ยกเลิก'),
        { type: 'button', style: 'primary', color: RED, height: 'sm', action: { type: 'postback', label: step2 ? '🗑️ ลบเลย' : 'ลบทั้งหมด', data: step2 ? `a=wipe2&t=${t}` : 'a=wipe1', displayText: step2 ? 'ลบเลย' : 'ลบทั้งหมด' } },
      ], { spacing: 'sm', backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// ผู้ใช้เดิม: แจ้งครั้งเดียวว่ามีนโยบายข้อมูลแล้ว
export function legacyNoticeMessage() {
  return {
    type: 'flex', altText: '🔒 แจ้งเรื่องข้อมูลของคุณ',
    contents: {
      type: 'bubble', size: 'kilo',
      body: box([
        txt('🔒 แจ้งให้ทราบ', { size: 'xs', weight: 'bold', color: PINK }),
        txt('ระบบเก็บ LINE ID ชื่อในไลน์ และรายการเงิน ไว้จดให้คุณคนเดียว ไม่ขาย ไม่แชร์', { size: 'xs', margin: 'sm' }),
        txt('ไม่ใช้ 30 วันข้อมูลจะถูกลบ · ลบเองได้ พิมพ์ "ลบข้อมูลของฉัน"', { size: 'xxs', color: MUTED, margin: 'sm' }),
      ], { backgroundColor: PINK_SOFT, paddingAll: '14px' }),
      footer: box([uriBtn('📄 อ่านฉบับเต็ม', privacyUrl())], { backgroundColor: PINK_SOFT, paddingAll: '4px' }),
    },
  };
}

// เจ้าของระบบพิมพ์ "หลังบ้าน"
export function adminLinkMessage() {
  const url = liffUrl();
  return {
    ...noteCard('👑', 'หลังบ้าน', url ? 'ดูจำนวนคน คิว และการใช้งาน' : 'ยังไม่ได้ตั้ง LIFF_ID'),
    ...(url ? { quickReply: { items: [{ type: 'action', action: { type: 'uri', label: '📊 เปิดหลังบ้าน', uri: `${url}?page=admin` } }] } } : {}),
  };
}

// ---------- อ่านสลิป ----------
// การ์ดหลังอ่านสลิป: บอกยอด/ผู้รับ/วันที่ แล้วให้แตะหมวด 1 ครั้งจบ
// known = หมวดที่เคยจำไว้กับร้านนี้, guess = หมวดที่ AI เดา
export function slipMessage(item, pid, categories, { known, guess } = {}) {
  const income = item.type === 'income';
  const top = known || guess;
  const others = categories
    .filter(c => c.type === item.type && c.id !== top?.id && !['inc_other', 'exp_other'].includes(c.id))
    .sort((a, b) => (b.custom ? 1 : 0) - (a.custom ? 1 : 0));
  const other = categories.find(c => c.id === (income ? 'inc_other' : 'exp_other'));
  const fixed = 4; // ➕ หมวดใหม่, อื่นๆ, ↔, ✖️
  const cats = others.slice(0, 13 - fixed - (top ? 1 : 0));
  const q = (label, data, shown) => ({ type: 'action', action: { type: 'postback', label: [...label].slice(0, 20).join(''), data, displayText: shown } });
  const base = `p=${pid}`;
  const title = known ? `${known.icon} ${known.name} ใช่ไหม?` : 'เป็นหมวดไหนดี?';
  return {
    type: 'flex', altText: `🧾 สลิป ${baht(item.amount)} บาท · ${title}`,
    contents: {
      type: 'bubble', size: 'kilo',
      header: header('🧾 อ่านสลิปแล้ว', `📅 ${thaiDateDow(item.date)}`),
      body: box([
        txt(`${income ? '+' : '-'}${baht(item.amount)} บาท`, { size: 'xxl', weight: 'bold', color: income ? TEAL : RED }),
        ...(item.note ? [txt(`${income ? 'รับจาก' : 'จ่ายให้'} ${item.note}`, { size: 'sm', color: MUTED })] : []),
        box([
          txt(title, { weight: 'bold', size: 'md' }),
          txt(known ? 'บอทจำร้านนี้ได้ แตะ ✅ ด้านล่างได้เลย' : top ? `✨ บอทเดาว่า ${top.name} · แตะเลือกด้านล่าง` : '👇 แตะเลือกหมวดด้านล่าง', { size: 'xs', color: MUTED, margin: 'xs' }),
        ], { margin: 'lg', backgroundColor: PINK_SOFT, cornerRadius: '12px', paddingAll: '12px' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
    quickReply: {
      items: [
        ...(top ? [q(`${known ? '✅' : '✨'} ${top.name}`, `a=scat&${base}&c=${top.id}`, `${top.icon} ${top.name}`)] : []),
        ...cats.map(c => q(`${c.icon} ${c.name}`, `a=scat&${base}&c=${c.id}`, `${c.icon} ${c.name}`)),
        q('➕ หมวดใหม่', `a=snew&${base}`, 'สร้างหมวดใหม่'),
        ...(other ? [q(`${other.icon} ${other.name}`, `a=scat&${base}&c=${other.id}`, other.name)] : []),
        q(income ? '↔ เป็นรายจ่าย' : '↔ เป็นรายรับ', `a=sflip&${base}`, income ? 'เป็นรายจ่าย' : 'เป็นรายรับ'),
        q('✖️ ไม่จด', `a=sno&${base}`, 'ไม่จดสลิปนี้'),
      ],
    },
  };
}

// AI คิวเต็ม / อ่านไม่ออก: ให้ทางเลือกที่ไม่ต้องรอ
export function slipFallbackMessage(reason) {
  const url = liffUrl();
  const t = {
    busy: ['⏳', 'ตอนนี้คนส่งสลิปเยอะ', 'รอ 1 นาทีแล้วส่งใหม่ หรือเลือกด้านล่างได้เลย'],
    notslip: ['🤔', 'อ่านสลิปนี้ไม่ออก', 'ลองส่งรูปสลิปที่ชัดๆ หรือเลือกด้านล่าง'],
    error: ['😵', 'อ่านสลิปไม่สำเร็จ', 'ลองส่งใหม่อีกครั้ง หรือเลือกด้านล่าง'],
    off: ['🔧', 'ระบบอ่านสลิปยังไม่เปิด', 'พิมพ์แทนได้เลย เช่น ข้าว 50'],
    big: ['📦', 'รูปใหญ่เกินไป', 'ลองแคปหน้าจอสลิปแล้วส่งใหม่'],
  }[reason] || ['😵', 'อ่านสลิปไม่สำเร็จ', 'ลองใหม่อีกครั้ง'];
  return {
    ...noteCard(...t),
    quickReply: {
      items: [
        { type: 'action', action: { type: 'postback', label: '✍️ พิมพ์เอง', data: 'a=stype', displayText: 'พิมพ์เอง' } },
        ...(url ? [{ type: 'action', action: { type: 'uri', label: '🔢 กดตัวเลข', uri: `${url}?add=1` } }] : []),
      ],
    },
  };
}

// ---------- 💑 โหมดคู่รัก ----------
const PURPLE = '#B58CFF';
const LOVE = { type: 'linearGradient', angle: '135deg', startColor: PINK, endColor: PURPLE };
const loveHeader = (title, sub) => box([
  txt(title, { color: '#FFFFFF', weight: 'bold', size: 'lg' }),
  ...(sub ? [txt(sub, { color: '#FFF0F8', size: 'xs', margin: 'xs' })] : []),
], { background: LOVE, backgroundColor: PINK, paddingAll: '16px', paddingBottom: '14px' });
const msgBtn = (label, textMsg) => ({ type: 'action', action: { type: 'message', label: [...label].slice(0, 20).join(''), text: textMsg } });

// สิ่งที่ต้องรู้ก่อนยินยอม (ใช้ทั้งฝั่งคนเชิญและคนรับเชิญ)
const pairTerms = () => [
  row('👀', 'แฟนจะเห็น', 'ยอดรวม "ของเรา" และรายการที่ไม่ได้ 🔒'),
  row('🔒', 'แฟนไม่เห็น', 'รายการที่ตั้งเป็นส่วนตัว · คำที่สอนบอท'),
  row('👋', 'เลิกได้ทุกเมื่อ', 'พิมพ์ "เลิกคู่" ฝ่ายเดียวได้ทันที'),
  row('🧒', 'อายุต่ำกว่า 20 ปี', 'ให้ผู้ปกครองรับทราบก่อนนะ'),
];

// รูปโปรไฟล์วงกลม + ชื่อ (ให้เห็นชัดว่ากำลังจับคู่กับใคร)
const person = (name, pic) => hbox([
  pic
    ? box([{ type: 'image', url: pic, size: 'full', aspectMode: 'cover', aspectRatio: '1:1' }], { width: '56px', height: '56px', cornerRadius: '28px', flex: 0 })
    : box([txt('🐷', { size: 'xxl', align: 'center', gravity: 'center' })], { width: '56px', height: '56px', cornerRadius: '28px', flex: 0, backgroundColor: PINK_SOFT, justifyContent: 'center' }),
  box([txt(name || 'ไม่มีชื่อ', { weight: 'bold', size: 'lg' }), txt('ชื่อและรูปในไลน์', { size: 'xxs', color: MUTED })], { margin: 'lg', justifyContent: 'center' }),
], { backgroundColor: '#FFFFFF', cornerRadius: '16px', paddingAll: '12px' });

// A พิมพ์ "จับคู่": น้องหมูยื่นจดหมายรัก
export function pairIntroMessage() {
  return {
    type: 'flex', altText: '💌 มาสร้างกระปุกออมสินของเราด้วยกันนะ',
    contents: {
      type: 'bubble',
      header: loveHeader('💌 กระปุกออมสินของเรา', 'ชวนแฟนมาจดด้วยกัน ดูยอดรวมของเราสองคน'),
      body: box([
        txt('🐷💕🐷', { size: '3xl', align: 'center' }),
        txt('น้องหมูจะส่งจดหมายเชิญไปให้แฟน', { align: 'center', weight: 'bold', margin: 'sm' }),
        ...pairTerms(),
        txt('กด "สร้างรหัสเชิญ" = ยินยอมให้แฟนเห็นข้อมูลตามด้านบน', { size: 'xxs', color: MUTED, margin: 'lg' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: box([
        uriBtn('📄 อ่านรายละเอียด', `${privacyUrl()}#couple`),
        hbox([btn('ไม่เอา', 'a=pairx', 'ไม่เอา'), btn('💌 สร้างรหัสเชิญ', 'a=pair1', 'สร้างรหัสเชิญ', true)], { spacing: 'sm' }),
      ], { backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// รหัสเชิญ + ปุ่มส่งให้แฟน (เปิดหน้าเลือกเพื่อนในไลน์)
const oaId = () => process.env.LINE_OA_ID || '@514ddese';
export function pairShareUrl(code) {
  const open = `https://line.me/R/oaMessage/${encodeURIComponent(oaId())}/?${encodeURIComponent(`จับคู่ ${code}`)}`;
  return `https://line.me/R/share?text=${encodeURIComponent(`💌 มาสร้างกระปุกออมสินของเราด้วยกันนะ 🐷💕\nแตะลิงก์ แล้วกดส่ง (ใน 10 นาที)\n${open}`)}`;
}
export function pairCodeMessage(code, shown, minutes) {
  return {
    type: 'flex', altText: `💌 รหัสเชิญแฟน ${shown} (ใช้ได้ ${minutes} นาที)`,
    contents: {
      type: 'bubble',
      header: loveHeader('💌 จดหมายเชิญพร้อมแล้ว', `ใช้ได้ ${minutes} นาที · ใช้ได้ครั้งเดียว`),
      body: box([
        box([txt(shown, { size: 'xxl', weight: 'bold', align: 'center', color: PINK_DARK })], { backgroundColor: '#FFFFFF', cornerRadius: '16px', paddingAll: '14px' }),
        txt('1. กด "ส่งให้แฟน" แล้วเลือกแชทแฟน', { size: 'xs', margin: 'lg' }),
        txt('2. แฟนแตะลิงก์ แล้วกดส่ง', { size: 'xs', margin: 'xs' }),
        txt('3. บอทจะถามคุณอีกครั้งว่าใช่แฟนไหม', { size: 'xs', margin: 'xs' }),
        txt('⚠️ ส่งให้แฟนคนเดียวเท่านั้น · ส่งผิด พิมพ์ "ยกเลิกรหัส"', { size: 'xxs', color: RED, margin: 'md' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: box([{ type: 'button', style: 'primary', color: PINK, height: 'sm', action: { type: 'uri', label: '📤 ส่งให้แฟน', uri: pairShareUrl(code) } }], { backgroundColor: PINK_BG }),
    },
  };
}

// B กรอกรหัสถูก: ถามว่าจะจับคู่กับคนนี้ใช่ไหม
export function pairAskJoinMessage(name, pic, hash) {
  return {
    type: 'flex', altText: `💌 จับคู่กับ ${name || 'เจ้าของรหัส'} ใช่ไหม?`,
    contents: {
      type: 'bubble',
      header: loveHeader('💌 มีจดหมายถึงคุณ', 'มาสร้างกระปุกออมสินของเราด้วยกันนะ 💕'),
      body: box([
        person(name, pic),
        txt('จับคู่กับคนนี้ใช่ไหม?', { weight: 'bold', margin: 'lg' }),
        ...pairTerms(),
        txt('กด "ยืนยัน" = ยินยอมให้แฟนเห็นข้อมูลตามด้านบน', { size: 'xxs', color: MUTED, margin: 'lg' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: box([
        uriBtn('📄 อ่านรายละเอียด', `${privacyUrl()}#couple`),
        hbox([btn('ไม่ใช่', 'a=pairx', 'ไม่ใช่'), btn('💑 ยืนยัน', `a=pairok&h=${hash}`, 'ยืนยันจับคู่', true)], { spacing: 'sm' }),
      ], { backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// ถึง A: มีคนตอบรับคำเชิญ → ต้องยืนยันอีกครั้งว่าใช่แฟนจริง (กันรหัสหลุดไปถึงคนอื่น)
export function pairAskOwnerMessage(name, pic, nonce) {
  return {
    type: 'flex', altText: `💌 ${name || 'มีคน'} ตอบรับคำเชิญแล้ว ใช่แฟนคุณไหม?`,
    contents: {
      type: 'bubble',
      header: loveHeader('💌 แฟนตอบรับแล้ว!', 'จาก สมุดรายรับรายจ่าย 🎀 · เช็คอีกนิดก่อนจับคู่'),
      body: box([
        person(name, pic),
        txt('คนนี้ใช่แฟนคุณไหม?', { weight: 'bold', margin: 'lg' }),
        txt('ถ้าใช่ กดยืนยันได้เลย 💕 ถ้าไม่รู้จัก กด "ไม่ใช่" (จะไม่มีใครเห็นข้อมูลคุณ)', { size: 'xs', color: MUTED, margin: 'sm' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: hbox([btn('ไม่ใช่', `a=pairAno&n=${nonce}`, 'ไม่ใช่'), btn('💑 ใช่ จับคู่เลย', `a=pairA&n=${nonce}`, 'ใช่ จับคู่เลย', true)], { spacing: 'sm', backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

export function pairDoneMessage(partnerName) {
  return {
    type: 'flex', altText: `💑 จับคู่กับ ${partnerName} สำเร็จ!`,
    contents: {
      type: 'bubble',
      header: loveHeader('💑 จับคู่สำเร็จ!', `คุณกับ ${partnerName} มีกระปุกของเราแล้ว`),
      body: box([
        txt('🐷💕🐷', { size: '3xl', align: 'center' }),
        row('📊', 'ดูยอดของเรา', 'พิมพ์ "ของเรา" หรือ "สรุปวันนี้"'),
        row('🔒', 'อยากเก็บเป็นความลับ', 'แตะ 🔒 ตอนจด หรือพิมพ์ "แก้ไข" แล้วตั้งทีหลัง'),
        row('👋', 'เลิกคู่', 'พิมพ์ "เลิกคู่" ได้ทุกเมื่อ'),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
    quickReply: { items: [msgBtn('📊 ของเรา', 'ของเรา')] },
  };
}

// พิมพ์ "จับคู่" ตอนมีคู่อยู่แล้ว
export function coupleStatusMessage(partnerName, sinceIso) {
  return {
    ...noteCard('💑', `คู่ของคุณ: ${partnerName}`, `ตั้งแต่ ${thaiDate(sinceIso)}`),
    quickReply: { items: [msgBtn('📊 ของเรา', 'ของเรา'), msgBtn('👋 เลิกคู่', 'เลิกคู่')] },
  };
}

export function unpairAskMessage(partnerName) {
  const t = Date.now();
  return {
    type: 'flex', altText: '👋 เลิกโหมดคู่รัก?',
    contents: {
      type: 'bubble', size: 'kilo',
      header: header('👋 เลิกโหมดคู่รัก?', `กับ ${partnerName}`),
      body: box([
        txt('ทั้งสองคนจะไม่เห็นยอดของกันและกันอีก', { size: 'sm' }),
        txt('รายการของคุณยังอยู่ครบ ไม่มีอะไรถูกลบ', { size: 'xs', color: MUTED, margin: 'sm' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
      footer: hbox([
        btn('ไม่เลิก', 'a=unpairno', 'ไม่เลิก'),
        { type: 'button', style: 'primary', color: RED, height: 'sm', action: { type: 'postback', label: 'เลิกคู่', data: `a=unpair2&t=${t}`, displayText: 'เลิกคู่' } },
      ], { spacing: 'sm', backgroundColor: PINK_BG }),
      styles: { footer: { separator: false } },
    },
  };
}

// แจ้งอีกฝ่ายเรียบๆ ไม่บอกเหตุผล
export const unpairedMessage = () => noteCard('💌', 'โหมดคู่รักถูกยกเลิกแล้ว', 'รายการของคุณยังอยู่ครบ · จดต่อได้ตามปกติ');

// 💑 สรุป "ของเรา": ยอดรวมของสองคน ไม่แยกว่าใครใช้เท่าไหร่ (เป็นทีมเดียวกัน ไม่เทียบกัน)
export function coupleSummaryMessage(d, date, partnerName) {
  const net = d.inc - d.exp, mNet = d.month.inc - d.month.exp;
  const max = Math.max(1, ...d.cats.map(c => c.sum));
  const catRows = d.cats.slice(0, 10).map(c => {
    const income = c.type === 'income';
    return box([
      hbox([
        txt(`${c.icon} ${c.name}`, { flex: 5 }),
        txt(`${income ? '+' : '-'}${baht(c.sum)}`, { weight: 'bold', align: 'end', flex: 3, color: income ? TEAL : RED }),
      ]),
      box([box([], { width: `${Math.max(4, Math.round((c.sum / max) * 100))}%`, height: '6px', background: LOVE, backgroundColor: PINK, cornerRadius: '3px' })],
        { backgroundColor: '#F1DCF2', height: '6px', cornerRadius: '3px', margin: 'xs' }),
    ], { margin: 'md' });
  });
  const cheer = !d.count ? 'วันนี้เรายังไม่ได้จดเลย มาเริ่มกันนะ 📝'
    : net >= 0 ? (d.both ? 'เก่งมาก! วันนี้เราสองคนช่วยกันจดครบเลย 💕' : 'เก่งมาก! วันนี้เราได้กำไร 💕')
    : 'ไม่เป็นไรนะ พรุ่งนี้เราเอาใหม่ด้วยกัน ✊';
  return {
    type: 'flex', altText: `💑 วันนี้ของเรา ${net >= 0 ? 'กำไร' : 'ขาดทุน'} ${baht(Math.abs(net))} บาท`,
    contents: {
      type: 'bubble',
      header: box([
        txt(`💑 วันนี้ของเรา · ${thaiDate(date)}`, { color: '#FFF0F8', size: 'xs' }),
        txt(net >= 0 ? '▲ กำไรของเรา' : '▼ ขาดทุนของเรา', { color: '#FFFFFF', size: 'sm', weight: 'bold', margin: 'sm' }),
        txt(`${net < 0 ? '-' : ''}${baht(Math.abs(net))} ฿`, { color: '#FFFFFF', size: '3xl', weight: 'bold' }),
        txt(`🐷💕🐷 คุณ กับ ${partnerName}`, { color: '#FFF0F8', size: 'xs', margin: 'sm' }),
      ], { background: LOVE, backgroundColor: PINK, paddingAll: '18px' }),
      body: box([
        totalsRow(d.inc, d.exp),
        txt(cheer, { size: 'xs', color: PINK_DARK, weight: 'bold', margin: 'lg', align: 'center' }),
        ...(catRows.length ? [sectionTitle('🗂️ ของเราแยกตามหมวด'), ...catRows] : []),
        box([
          txt('🗓️ เดือนนี้ของเรา', { size: 'xs', weight: 'bold', color: MUTED }),
          hbox([
            txt(`${mNet >= 0 ? '▲ กำไร' : '▼ ขาดทุน'} ${baht(Math.abs(mNet))} ฿`, { weight: 'bold', flex: 5, color: mNet >= 0 ? TEAL : RED }),
            txt(`+${baht(d.month.inc)} / -${baht(d.month.exp)}`, { size: 'xxs', color: MUTED, align: 'end', flex: 5, gravity: 'center' }),
          ], { margin: 'xs' }),
        ], { margin: 'lg', backgroundColor: '#FFFFFF', cornerRadius: '12px', paddingAll: '12px' }),
        txt('ไม่รวมรายการ 🔒 ส่วนตัวของแต่ละคน', { size: 'xxs', color: MUTED, margin: 'md', align: 'center' }),
      ], { backgroundColor: PINK_BG, paddingAll: '16px' }),
    },
  };
}
