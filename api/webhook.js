// LINE ส่งข้อความของผู้ใช้มาที่นี่ (Webhook URL = https://<เว็บของคุณ>/api/webhook)
import { verifySignature, reply } from '../lib/line.js';
import { parseMessage, normalizeThai, hasNumber } from '../lib/parser.js';
import { OTHER } from '../lib/categories.js';
import { bkkDate, thaiDate } from '../lib/date.js';
import { extractDate } from '../lib/parser.js';
import {
  confirmMessage, askMessage, summaryMessage, undoMessage, helpMessage, savedMessage, noteCard, text, baht,
  editListMessage, editEntryMessage, editCategoryMessage, withQuick, stuckMessage,
} from '../lib/messages.js';
import {
  getProfile, saveProfile, addEntries, updateEntry, recentEntries, getEntry, setEdit, getEdit, clearEdit,
  getMiss, setMiss, clearMiss, listEntries, lastBatch, deleteEntries,
  setPending, getPending, clearPending,
} from '../lib/store.js';

const PENDING_TTL = 24 * 3600 * 1000;

export async function GET() {
  return new Response('ok');
}

export async function POST(request) {
  const body = await request.text();
  if (!verifySignature(body, request.headers.get('x-line-signature'))) {
    return new Response('bad signature', { status: 401 });
  }
  const { events = [] } = JSON.parse(body);
  await Promise.all(events.map(ev => handle(ev).catch(err => {
    console.error(err);
    if (ev.replyToken) return reply(ev.replyToken, text('ขออภัย เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะครับ 🙏'));
  })));
  return new Response('ok');
}

async function handle(ev) {
  const uid = ev.source?.userId;
  if (!uid || !ev.replyToken) return;

  if (ev.type === 'follow') {
    return reply(ev.replyToken, helpMessage('👋 ยินดีต้อนรับ 🎀'));
  }
  if (ev.type === 'postback') return onPostback(uid, ev);
  if (ev.type === 'message' && ev.message.type === 'text') return onText(uid, ev);
}

const catMap = cats => Object.fromEntries(cats.map(c => [c.id, c]));

async function onText(uid, ev) {
  const msg = ev.message.text.trim();
  const profile = await getProfile(uid);
  const byId = catMap(profile.categories);

  if (/^(สรุป|สรุปวันนี้|ยอดวันนี้)$/.test(msg)) {
    const today = bkkDate();
    return reply(ev.replyToken, summaryMessage(await listEntries(uid, today, today), today, byId));
  }
  if (/^(วิธีใช้|ช่วย|ช่วยด้วย|help|\?|เมนู|ใช้ยังไง|ทำยังไง)$/i.test(msg)) return reply(ev.replyToken, helpMessage());
  if (/^(ยกเลิก|cancel|ลบล่าสุด|ยกเลิกล่าสุด)$/i.test(msg)) {
    if (await getPending(uid)) {
      await clearPending(uid);
      return reply(ev.replyToken, noteCard('✖️', 'ยกเลิกรายการที่รอยืนยันแล้ว'));
    }
    const last = await lastBatch(uid);
    if (!last.length) return reply(ev.replyToken, noteCard('📝', 'ยังไม่มีรายการให้ยกเลิก'));
    return reply(ev.replyToken, undoMessage(last, byId));
  }

  const hasDigit = hasNumber(msg);
  const pending = hasDigit ? null : await getPending(uid);

  // ---- กำลังแก้รายการ: รอพิมพ์จำนวนเงิน / ชื่อ / วันที่ ----
  const edit = await getEdit(uid);
  if (edit) {
    const e = await getEntry(uid, edit.id);
    if (e && edit.await === 'amount' && hasDigit) {
      const amount = parseMessage(msg, profile.categories, profile.keywords).items[0]?.amount;
      if (amount) return saveEdit(uid, ev, e, { amount }, byId, `${baht(e.amount)} → ${baht(amount)} บาท`);
    }
    if (e && edit.await === 'note' && msg.length <= 60) return saveEdit(uid, ev, e, { note: msg }, byId, `ชื่อ: ${msg}`);
    if (e && edit.await === 'date') {
      const d = extractDate(normalizeThai(msg), bkkDate());
      if (d.marks.length) return saveEdit(uid, ev, e, { date: d.marks[0].date }, byId, thaiDate(d.marks[0].date));
    }
    await clearEdit(uid);
  }

  // ---- แก้ไข/ลบ แบบพิมพ์สั่ง: "แก้ข้าว 50 เป็น 60", "แก้ข้าว เป็น ค่าเดินทาง", "ลบ ข้าว 50" ----
  const change = msg.match(/^(?:ขอ)?(?:แก้|เปลี่ยน)(?:ไข)?\s*(.+?)\s*(?:เป็น|=|->|→)\s*(.+)$/);
  if (change) {
    const recent = await recentEntries(uid, 30);
    const e = findEntry(recent, change[1], byId);
    if (!e) return reply(ev.replyToken, [noteCard('🔍', `ไม่เจอ "${change[1]}"`, 'แตะเลือกรายการที่จะแก้ได้เลย'), ...(recent.length ? [editListMessage(recent.slice(0, 8), byId)] : [])]);
    const target = change[2].trim();
    if (hasNumber(target)) {
      const amount = parseMessage(target, profile.categories, profile.keywords).items[0]?.amount;
      if (amount) return saveEdit(uid, ev, e, { amount }, byId, `${baht(e.amount)} → ${baht(amount)} บาท`);
    }
    const cat = findCategory(target, profile);
    if (cat) return saveEdit(uid, ev, e, { category: cat.id, type: cat.type }, byId, `${cat.icon} ${cat.name}`);
    return reply(ev.replyToken, editEntryMessage(e, byId));
  }
  // ---- แก้/ลบ แบบบอกว่าอันไหน: "แก้ค่ากินวันที่12", "แก้รายการวันที่11", "ลบค่ากินเมื่อวาน", "ลบ ข้าว 50" ----
  const target = msg.match(/^(?:ขอ)?(แก้(?!ว)(?:ไข)?|ลบ(?!คำ)|เอาออก)\s*(.*)$/);
  if (target && target[2]) {
    const found = await findTargets(uid, target[2], profile, byId);
    if (found) {
      const del = !target[1].startsWith('แก้');
      const what = [found.word, found.num ? `${baht(found.num)} บาท` : '', found.date ? thaiDate(found.date) : ''].filter(Boolean).join(' · ');
      if (!found.matches.length) {
        return reply(ev.replyToken, [noteCard('🔍', `ไม่เจอรายการ ${what}`, 'แตะเลือกจากรายการล่าสุดได้เลย'), await editList(uid, byId)]);
      }
      if (found.matches.length === 1) {
        return reply(ev.replyToken, del ? deleteAsk(found.matches[0], byId) : editEntryMessage(found.matches[0], byId));
      }
      return reply(ev.replyToken, [
        noteCard('🔍', `เจอ ${found.matches.length} รายการ`, `${what} · แตะอันที่จะ${del ? 'ลบ' : 'แก้'}`),
        editListMessage(found.matches.slice(0, 10), byId),
      ]);
    }
  }

  // ---- อยากแก้/ลบ แต่ไม่ได้บอกว่าอันไหน: "ขอแก้ไข", "พิมพ์ผิด", "ลบอันเก่า", "ย้อนกลับ" ----
  if (!hasDigit && msg.length <= 40 && EDIT_RE.test(msg) && !/^ลบคำ/.test(msg)) {
    if (pending && !pending.awaitCat) {
      return reply(ev.replyToken, withQuick(noteCard('📝', 'รายการล่าสุดยังไม่ได้บันทึก', 'ยกเลิกแล้วพิมพ์ใหม่ หรือแก้อันที่บันทึกแล้ว'), [
        ['✖️ ยกเลิกอันใหม่', `a=no&p=${pending.id}`, 'ยกเลิก'],
        ['✏️ แก้อันเก่า', 'a=elist', 'แก้รายการที่บันทึกแล้ว'],
      ]));
    }
    return reply(ev.replyToken, await editList(uid, byId));
  }

  // รอชื่อหมวดใหม่ (หลังกด "➕ หมวดใหม่")
  if (!hasDigit && pending && pending.awaitCat != null && msg.length <= 30) {
    const it = pending.items[pending.awaitCat];
    const word = it.word || it.guess;
    const cat = { id: 'c_' + Date.now().toString(36), name: msg, type: it.type, icon: '🏷️' };
    await learn(uid, profile, word, cat.id, [...profile.customCategories, cat]);
    applyWord(pending, word, cat, pending.awaitCat);
    delete pending.awaitCat;
    await setPending(uid, pending);
    byId[cat.id] = cat;
    return reply(ev.replyToken, [noteCard('✨', `สร้างหมวด ${cat.name} แล้ว`, word ? `จำแล้ว "${word}" = ${cat.name}` : ''), ...nextStep(pending, byId, profile.categories.concat(cat))]);
  }

  // สอนคำในแชท: "แซนวิช = ค่ากิน" หรือ "นมลูก คือ ครอบครัว"
  const teach = !hasDigit && msg.match(/^(.{1,30}?)\s*(?:=|คือ)\s*(.{1,30})$/);
  if (teach) {
    const word = normalizeThai(teach[1]).trim(), cat = findCategory(teach[2], profile);
    if (cat) {
      await learn(uid, profile, word, cat.id);
      const extra = [];
      if (pending && applyWord(pending, word, cat)) { await setPending(uid, pending); extra.push(...nextStep(pending, byId, profile.categories)); }
      return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...extra]);
    }
    if (msg.includes('=')) return reply(ev.replyToken, noteCard('🤔', `ไม่พบหมวด "${teach[2]}"`, `สร้างใหม่: พิมพ์ "หมวดใหม่ ${teach[2]}"`));
  }

  // สร้างหมวดในแชท: "หมวดใหม่ ค่าขนมลูก" / "หมวดใหม่ รายรับ ขายของออนไลน์"
  const nc = !hasDigit && msg.match(/^(?:หมวดใหม่|สร้างหมวด|เพิ่มหมวด)\s*(รายรับ|รายจ่าย)?\s*(.{1,30})$/);
  if (nc) {
    const name = nc[2].trim();
    if (profile.categories.some(c => c.name === name)) return reply(ev.replyToken, noteCard('📁', `มีหมวด "${name}" อยู่แล้ว`));
    const cat = { id: 'c_' + Date.now().toString(36), name, type: nc[1] === 'รายรับ' ? 'income' : 'expense', icon: '🏷️' };
    await learn(uid, profile, name, cat.id, [...profile.customCategories, cat]);
    return reply(ev.replyToken, noteCard('✨', `สร้างหมวด ${name} แล้ว`, `${nc[1] || 'รายจ่าย'} · ลองพิมพ์ "${name} 100"`));
  }

  // ลบคำที่สอน: "ลบคำ แซนวิช"
  const del = !hasDigit && msg.match(/^ลบคำ\s*(.{1,30})$/);
  if (del) {
    const word = normalizeThai(del[1]).trim();
    if (!profile.keywords.some(k => k.word === word)) return reply(ev.replyToken, noteCard('🤔', `ไม่มีคำ "${word}" ที่สอนไว้`));
    await saveProfile(uid, { keywords: profile.keywords.filter(k => k.word !== word) });
    return reply(ev.replyToken, noteCard('🗑️', `ลบคำ "${word}" แล้ว`));
  }

  // มีคำถามค้างอยู่ แล้วผู้ใช้พิมพ์ตอบเอง (ไม่กดปุ่ม)
  if (!hasDigit && pending) {
    const q = openQuestion(pending);
    if (q >= 0) {
      const it = pending.items[q];
      const word = it.word || it.guess;
      if (/^(ไม่ใช่|ไม่|ผิด|no)/i.test(msg)) {
        it.word = word; it.guess = ''; it.sure = false; it.category = it.type === 'income' ? OTHER.income : OTHER.expense;
        await setPending(uid, pending);
        return reply(ev.replyToken, [noteCard('👌', 'โอเค งั้นเป็นหมวดไหน?', 'เลือกด้านล่าง หรือกด ➕ หมวดใหม่'), ...nextStep(pending, byId, profile.categories, true)]);
      }
      if (/^(ใช่|ช่าย|ถูก|ok|โอเค|yes)/i.test(msg) && it.guess) {
        const cat = byId[it.category];
        await learn(uid, profile, word, cat.id);
        applyWord(pending, word, cat, q);
        await setPending(uid, pending);
        return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...nextStep(pending, byId, profile.categories)]);
      }
      const cat = msg.length <= 20 ? findCategory(msg, profile) : null;
      if (cat) {
        await learn(uid, profile, word, cat.id);
        applyWord(pending, word, cat, q);
        await setPending(uid, pending);
        return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...nextStep(pending, byId, profile.categories)]);
      }
      return reply(ev.replyToken, [
        noteCard('🤔', 'ยังไม่เจอหมวดนี้', `กด ➕ หมวดใหม่ หรือพิมพ์ชื่อหมวดสั้นๆ เช่น ค่ากิน`),
        ...nextStep(pending, byId, profile.categories, true),
      ]);
    }
  }

  const { date, items, truncated, orphans } = parseMessage(msg, profile.categories, profile.keywords, bkkDate());
  if (!items.length) {
    // ไม่เข้าใจ 2 ครั้งติดกัน (ภายใน 15 นาที) → ส่งปุ่มเปิดหน้าตั้งค่า
    const miss = await getMiss(uid);
    const count = miss && Date.now() - miss.at < 15 * 60 * 1000 ? miss.count + 1 : 1;
    await setMiss(uid, { count, at: Date.now() });
    if (count >= 2) return reply(ev.replyToken, stuckMessage());
    return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอจำนวนเงิน', 'ลองพิมพ์ เช่น น้ำมัน 60 ข้าว 50\nหรือพิมพ์ "วิธีใช้"'));
  }
  clearMiss(uid).catch(() => {});
  const pid = Math.random().toString(36).slice(2, 10);
  const pend = { id: pid, items, date, orphans };
  await setPending(uid, pend);
  const out = [confirmMessage(items, date, pid, byId, orphans), ...nextStep(pend, byId, profile.categories, true)];
  if (truncated) out.unshift(noteCard('⚠️', 'รับได้ครั้งละ 30 รายการ', 'ที่เหลือส่งข้อความใหม่ได้เลย'));
  return reply(ev.replyToken, out);
}

// ---------- แก้ไขรายการในแชท ----------
const EDIT_RE = /แก้|เปลี่ยน|พิมพ์ผิด|พิมผิด|จดผิด|ใส่ผิด|บันทึกผิด|กดผิด|ลบ|เอาออก|ย้อนกลับ|ย้อน|undo|edit|ไม่ถูกต้อง|ผิดพลาด/i;

async function editList(uid, byId) {
  const recent = await recentEntries(uid, 8);
  return recent.length ? editListMessage(recent, byId) : noteCard('📝', 'ยังไม่มีรายการที่บันทึก');
}

// หารายการจากคำสั่ง เช่น "ค่ากินวันที่12" → ค่ากินของวันที่ 12, "ข้าว 50" → ชื่อมีข้าว เงิน 50
// ไม่ได้บอกอะไรเฉพาะเจาะจง (เช่น "แก้รายการเมื่อกี้") → คืนค่า null ให้โชว์รายการล่าสุดแทน
async function findTargets(uid, query, profile, byId) {
  const q = normalizeThai(query)
    .replace(/[๐-๙]/g, d => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)))
    .replace(/เมื่อกี้|เมื่อกี๊|เมื่อตะกี้|อันล่าสุด|ล่าสุด|อันเก่า|รายการ|อันนี้|อันที่|หน่อย|ได้ไหม|ได้มั้ย|ครับ|ค่ะ|คะ|นะ|ให้หน่อย/g, ' ');
  const d = extractDate(q, bkkDate());
  const date = d.marks[0]?.date || '';
  const rest = d.text.replace(/บาท|฿|ของ|ที่|อัน/g, ' ');
  const num = Number((rest.match(/\d+(?:\.\d+)?/) || [])[0]) || 0;
  const word = rest.replace(/[\d.,]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!date && !word && !num) return null;
  const list = date ? await listEntries(uid, date, date) : await recentEntries(uid, 30);
  const cat = word ? findCategory(word, profile) : null;
  const matches = list.filter(e => {
    const name = `${e.note || ''} ${byId[e.category]?.name || ''}`;
    const byWord = !word || name.includes(word) || (cat && e.category === cat.id);
    return byWord && (!num || e.amount === num);
  });
  return { matches, date, word, num };
}

// หารายการจากคำที่พิมพ์ เช่น "ข้าว 50" → รายการที่ชื่อมี "ข้าว" และเงิน 50
function findEntry(list, query, byId) {
  const q = normalizeThai(query).replace(/บาท|฿/g, '').trim();
  const num = Number((q.match(/\d+(?:\.\d+)?/) || [])[0]);
  const word = q.replace(/[\d.,]+/g, '').trim();
  return list.find(e => {
    const name = `${e.note || ''} ${byId[e.category]?.name || ''}`;
    return (!word || name.includes(word)) && (!num || e.amount === num) && (word || num);
  });
}

async function saveEdit(uid, ev, e, change, byId, what) {
  const next = { ...e, ...change };
  await updateEntry(uid, e.id, next);
  await clearEdit(uid);
  return reply(ev.replyToken, [noteCard('✅', 'แก้แล้ว', what), editEntryMessage({ ...next, id: e.id }, byId)]);
}

function deleteAsk(e, byId) {
  const c = byId[e.category] || { name: e.category, icon: '🏷️' };
  return withQuick(noteCard('🗑️', `ลบ ${c.icon} ${c.name} ${baht(e.amount)} บาท?`, e.note && e.note !== c.name ? e.note : ''), [
    ['🗑️ ลบเลย', `a=edel2&id=${e.id}`, 'ลบเลย'],
    ['ไม่ลบ', `a=pick&id=${e.id}`, 'ไม่ลบ'],
  ]);
}

// ---------- บอทถามคำที่ไม่รู้จัก แล้วจำไว้ ----------
// หาหมวดจากชื่อที่ผู้ใช้พิมพ์ เช่น "กิน", "ค่ากิน", "ครอบครัว"
function findCategory(name, profile) {
  const n = normalizeThai(name).trim();
  const cats = profile.categories;
  return cats.find(c => c.name === n)
    || cats.find(c => n.length >= 2 && c.name.includes(n))
    || cats.find(c => n.includes(c.name))
    || (() => { const it = parseMessage(`${n} 1`, cats, profile.keywords).items[0]; return it?.sure ? cats.find(c => c.id === it.category) : null; })();
}

async function learn(uid, profile, word, categoryId, categories) {
  const keywords = word ? [...profile.keywords.filter(k => k.word !== word), { word, category: categoryId }] : profile.keywords;
  await saveProfile(uid, { keywords, ...(categories ? { categories } : {}) });
}

// เปลี่ยนหมวดของรายการที่รอยืนยัน ที่ใช้คำเดียวกัน
function applyWord(pending, word, cat, index) {
  let changed = false;
  pending.items.forEach((it, i) => {
    if (i === index || (word && ((!it.sure && it.word === word) || it.guess === word))) {
      it.category = cat.id; it.type = cat.type; it.sure = true; it.asked = true; changed = true;
    }
  });
  return changed;
}

// ถามคำถัดไปที่ไม่รู้จัก หรือถ้าตอบครบแล้ว ส่งการ์ดยืนยันใหม่
function openQuestion(pending) {
  let i = pending.items.findIndex(it => !it.sure && it.word && !it.skipAsk);
  if (i < 0) i = pending.items.findIndex(it => it.sure && it.guess && !it.skipAsk && !it.asked);
  return i;
}
function nextStep(pending, byId, categories, first) {
  const i = openQuestion(pending);
  if (i >= 0) return [askMessage(pending.items[i], i, pending.id, categories)];
  return first ? [] : [confirmMessage(pending.items, pending.date, pending.id, byId, pending.orphans || [])];
}

async function onPostback(uid, ev) {
  const p = new URLSearchParams(ev.postback.data);
  const a = p.get('a');

  if (a === 'ok' || a === 'no') {
    const pending = await getPending(uid);
    if (!pending || pending.id !== p.get('p') || Date.now() - pending.createdAt > PENDING_TTL) {
      return reply(ev.replyToken, noteCard('⌛', 'รายการนี้หมดอายุหรือทำไปแล้ว'));
    }
    await clearPending(uid);
    if (a === 'no') return reply(ev.replyToken, noteCard('✖️', 'ยกเลิกแล้ว', 'พิมพ์ใหม่ได้เลย'));

    await addEntries(uid, pending.items.map(i => ({ ...i, date: i.date || pending.date })), 'b' + pending.id);
    const today = bkkDate();
    const list = await listEntries(uid, today, today);
    const net = list.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
    return reply(ev.replyToken, savedMessage(pending.items.length, new Set(pending.items.map(i => i.date || pending.date)).size > 1 ? 'หลายวัน' : thaiDate(pending.date), net));
  }

  if (['learn', 'newcat', 'flip', 'skip', 'skipall'].includes(a)) {
    const pending = await getPending(uid);
    const i = Number(p.get('i'));
    const it = pending?.items?.[i];
    if (!pending || pending.id !== p.get('p') || !it) return reply(ev.replyToken, noteCard('⌛', 'รายการนี้หมดอายุหรือทำไปแล้ว'));
    const profile = await getProfile(uid);
    const byId = catMap(profile.categories);
    if (a === 'newcat') {
      pending.awaitCat = i;
      await setPending(uid, pending);
      return reply(ev.replyToken, noteCard('✍️', 'พิมพ์ชื่อหมวดใหม่ได้เลย', 'เช่น ค่าขนมลูก'));
    }
    if (a === 'flip') {
      it.type = it.type === 'income' ? 'expense' : 'income';
      it.category = OTHER[it.type];
      await setPending(uid, pending);
      return reply(ev.replyToken, nextStep(pending, byId, profile.categories, true));
    }
    if (a === 'skip' || a === 'skipall') {
      (a === 'skipall' ? pending.items : [it]).forEach(x => { x.skipAsk = true; });
      await setPending(uid, pending);
      return reply(ev.replyToken, nextStep(pending, byId, profile.categories));
    }
    const cat = byId[p.get('c')];
    if (!cat) return reply(ev.replyToken, noteCard('🤔', 'ไม่พบหมวดนี้แล้ว'));
    const word = it.word || it.guess;
    await learn(uid, profile, word, cat.id);
    applyWord(pending, word, cat, i);
    await setPending(uid, pending);
    return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...nextStep(pending, byId, profile.categories)]);
  }

  // ---- แก้ไขรายการ ----
  if (['elist', 'pick', 'eamt', 'ecat', 'ecat2', 'eflip', 'edate', 'enote', 'edel', 'edel2', 'edone'].includes(a)) {
    const profile = await getProfile(uid);
    const byId = catMap(profile.categories);
    if (a === 'edone') { await clearEdit(uid); return reply(ev.replyToken, noteCard('✨', 'เรียบร้อย!', 'พิมพ์รายการใหม่ได้เลย')); }
    if (a === 'elist') return reply(ev.replyToken, await editList(uid, byId));
    const e = await getEntry(uid, p.get('id'));
    if (!e) return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอรายการนี้แล้ว', 'อาจถูกลบไปแล้ว'));
    if (a === 'pick') return reply(ev.replyToken, editEntryMessage(e, byId));
    if (a === 'eamt') { await setEdit(uid, { id: e.id, await: 'amount' }); return reply(ev.replyToken, noteCard('💰', 'พิมพ์จำนวนเงินใหม่', `ตอนนี้ ${baht(e.amount)} บาท · เช่น 60 หรือ 30+20`)); }
    if (a === 'enote') { await setEdit(uid, { id: e.id, await: 'note' }); return reply(ev.replyToken, noteCard('📝', 'พิมพ์ชื่อรายการใหม่', 'เช่น ข้าวมันไก่')); }
    if (a === 'ecat') return reply(ev.replyToken, editCategoryMessage(e, profile.categories));
    if (a === 'eflip') {
      const type = e.type === 'income' ? 'expense' : 'income';
      return reply(ev.replyToken, editCategoryMessage({ ...e, type, category: '' }, profile.categories));
    }
    if (a === 'ecat2') {
      const cat = byId[p.get('c')];
      if (!cat) return reply(ev.replyToken, noteCard('🤔', 'ไม่พบหมวดนี้แล้ว'));
      return saveEdit(uid, ev, e, { category: cat.id, type: cat.type }, byId, `${cat.icon} ${cat.name}`);
    }
    if (a === 'edate') {
      const date = ev.postback.params?.date;
      if (date) return saveEdit(uid, ev, e, { date }, byId, thaiDate(date));
      await setEdit(uid, { id: e.id, await: 'date' });
      return reply(ev.replyToken, noteCard('📅', 'พิมพ์วันที่', 'เช่น เมื่อวาน, วันที่ 3, 3 พ.ย.'));
    }
    if (a === 'edel') return reply(ev.replyToken, deleteAsk(e, byId));
    if (a === 'edel2') {
      await deleteEntries(uid, [e.id]);
      return reply(ev.replyToken, withQuick(noteCard('🗑️', 'ลบแล้ว', `${byId[e.category]?.name || ''} ${baht(e.amount)} บาท`), [['📋 แก้รายการอื่น', 'a=elist', 'แก้รายการอื่น']]));
    }
  }

  if (a === 'del') {
    const last = await lastBatch(uid);
    if (!last.length || last[0].batch !== p.get('b')) return reply(ev.replyToken, noteCard('🗑️', 'รายการนี้ถูกลบไปแล้ว'));
    await deleteEntries(uid, last.map(e => e.id));
    return reply(ev.replyToken, noteCard('🗑️', `ลบแล้ว ${last.length} รายการ`));
  }
  if (a === 'keep') return reply(ev.replyToken, noteCard('👍', 'โอเค ไม่ลบ'));
}
