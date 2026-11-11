// LINE ส่งข้อความของผู้ใช้มาที่นี่ (Webhook URL = https://<เว็บของคุณ>/api/webhook)
import { verifySignature, reply } from '../lib/line.js';
import { parseMessage, normalizeThai, hasNumber } from '../lib/parser.js';
import { OTHER } from '../lib/categories.js';
import { bkkDate, thaiDate } from '../lib/date.js';
import { confirmMessage, askMessage, summaryMessage, undoMessage, helpMessage, savedMessage, noteCard, text } from '../lib/messages.js';
import {
  getProfile, saveProfile, addEntries, listEntries, lastBatch, deleteEntries,
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
  if (/^(ยกเลิก|cancel|ลบ|ลบล่าสุด)$/i.test(msg)) {
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
    return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอจำนวนเงิน', 'ลองพิมพ์ เช่น น้ำมัน 60 ข้าว 50\nหรือพิมพ์ "วิธีใช้"'));
  }
  const pid = Math.random().toString(36).slice(2, 10);
  const pend = { id: pid, items, date, orphans };
  await setPending(uid, pend);
  const out = [confirmMessage(items, date, pid, byId, orphans), ...nextStep(pend, byId, profile.categories, true)];
  if (truncated) out.unshift(noteCard('⚠️', 'รับได้ครั้งละ 30 รายการ', 'ที่เหลือส่งข้อความใหม่ได้เลย'));
  return reply(ev.replyToken, out);
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

  if (a === 'del') {
    const last = await lastBatch(uid);
    if (!last.length || last[0].batch !== p.get('b')) return reply(ev.replyToken, noteCard('🗑️', 'รายการนี้ถูกลบไปแล้ว'));
    await deleteEntries(uid, last.map(e => e.id));
    return reply(ev.replyToken, noteCard('🗑️', `ลบแล้ว ${last.length} รายการ`));
  }
  if (a === 'keep') return reply(ev.replyToken, noteCard('👍', 'โอเค ไม่ลบ'));
}
