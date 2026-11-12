// LINE ส่งข้อความของผู้ใช้มาที่นี่ (Webhook URL = https://<เว็บของคุณ>/api/webhook)
import { verifySignature, reply as lineReply, showLoading, push, getLineProfile } from '../lib/line.js';
import { runCtx, later, docGet, docSet } from '../lib/ctx.js';
import { parseMessage, normalizeThai, hasNumber } from '../lib/parser.js';
import { OTHER } from '../lib/categories.js';
import { bkkDate, thaiDate } from '../lib/date.js';
import { extractDate } from '../lib/parser.js';
import {
  confirmMessage, askMessage, summaryMessage, undoMessage, helpMessage, savedMessage, noteCard, text, baht,
  editListMessage, editEntryMessage, editCategoryMessage, withQuick, stuckMessage,
  consentMessage, fullMessage, wipeAskMessage, legacyNoticeMessage, adminLinkMessage, slipMessage, slipFallbackMessage, todayNet,
  pairIntroMessage, pairCodeMessage, pairAskJoinMessage, pairNotifyOwnerMessage, pairDoneMessage, coupleStatusMessage,
  unpairAskMessage, unpairedMessage, coupleSummaryMessage,
} from '../lib/messages.js';
import {
  createInvite, cancelInvites, codeTurn, findInvite, joinPair, inviteLeft, rememberCode, forgetCode, getCouple, unpair,
  coupleDay, validCode, showCode, codeHash, CODE_MINUTES,
} from '../lib/couple.js';
import { gate, joinWaitlist, setConsent, clearLegacyNotice, deleteUserData, isAdmin, POLICY_VERSION } from '../lib/access.js';
import { isUndo, isEdit, isWipe, isHelp, cleanTarget, isPair, pairCode, isUnpair, isCancelCode, isOurs } from '../lib/intents.js';
import { tooMany } from '../lib/guard.js';
import { slipReady, slipTurn, geminiTurn, fetchImage, readSlip, slipKey, probeModels } from '../lib/slip.js';
import {
  getProfile, saveProfile, addEntries, updateEntry, recentEntries, getEntry, setEdit, getEdit, clearEdit,
  getMiss, setMiss, clearMiss, listEntries, lastBatch, deleteEntries,
  setPending, getPending, clearPending, findSlip, getUser, setPrivate, batchEntries,
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
  await Promise.all(events.map(ev => runCtx(() => handle(ev)).catch(err => {
    console.error(err);
    if (ev.replyToken) return reply(ev.replyToken, text('ขออภัย เกิดข้อผิดพลาด ลองใหม่อีกครั้งนะครับ 🙏'));
  }).finally(() => { prefix.delete(ev.replyToken); loading.delete(ev.replyToken); })));
  return new Response('ok');
}

// ข้อความที่ต้องส่งนำหน้าคำตอบ (เช่น "ถึงคิวแล้ว", "หายไปนานเลย") แนบไปกับ reply ครั้งเดียว
const prefix = new Map();
const loading = new Map();
async function reply(token, messages) {
  const wait = loading.get(token);
  loading.delete(token);
  if (wait) await wait; // ให้ "…" ขึ้นก่อนคำตอบ ไม่งั้นจุดจะค้างหลังบอทตอบ
  const main = [].concat(messages);
  const pre = (prefix.get(token) || []).slice(0, Math.max(0, 5 - main.length));
  prefix.delete(token);
  return lineReply(token, [...pre, ...main]);
}


async function handle(ev) {
  const uid = ev.source?.userId;
  if (!uid || !ev.replyToken) return;
  const isText = ev.type === 'message' && ev.message?.type === 'text';
  const isImage = ev.type === 'message' && ev.message?.type === 'image';
  if (!isText && !isImage && !['follow', 'postback'].includes(ev.type)) return;
  const msg = isText ? normalizeThai(ev.message.text.trim()) : '';
  const a = ev.type === 'postback' ? new URLSearchParams(ev.postback.data).get('a') : '';
  const t = ev.replyToken;
  if (tooMany('w:' + uid, 40)) return; // ส่งถี่ผิดปกติ (เกิน 40 ข้อความ/นาที) → ไม่ตอบ กันเปลืองโควต้า
  loading.set(t, later(showLoading(uid, isImage ? 40 : 10))); // ขึ้น "…" ในแชททันที ระหว่างบอทคิด

  // ---- ด่านรับคน ---- (อ่านข้อมูลทั้งหมดที่ต้องใช้ในรอบเดียว)
  const g = await gate(uid, { all: true });
  docSet('@uid', uid); // คนที่กำลังคุยในคำขอนี้
  if (g.status === 'full') {
    if (a === 'wait') return reply(t, fullMessage(await joinWaitlist(uid)));
    return reply(t, fullMessage(g.queue));
  }
  const pre = [];
  if (g.fromQueue) pre.push(noteCard('🎉', 'ถึงคิวคุณแล้ว!', 'ยินดีต้อนรับนะ 🐷'));
  if (g.back) pre.push(noteCard('🥺', 'หายไปนานเลย คิดถึงนะ', 'ถ้าไม่ใช้ 30 วัน ข้อมูลจะถูกลบ'));
  if (g.user.legacyNotice) { pre.push(legacyNoticeMessage()); await clearLegacyNotice(uid); }
  prefix.set(t, pre);

  // ---- ไอดีของฉัน (เจ้าของระบบเอาไปใส่ ADMIN_UID ใน Vercel) / หลังบ้าน ----
  if (/^(ไอดีของฉัน|ไอดี|id|my ?id|id ?ของฉัน)$/i.test(msg)) {
    return reply(t, [noteCard('🪪', 'ไอดีของคุณ', isAdmin(uid) ? '👑 คุณคือเจ้าของระบบ' : 'กดค้างที่ข้อความถัดไปเพื่อคัดลอก'), text(uid)]);
  }
  if (/^เช็ค\s*ai$/i.test(msg) && isAdmin(uid)) {
    if (!slipReady()) return reply(t, text('ยังไม่ได้ใส่ GEMINI_API_KEY'));
    return reply(t, text(('🤖 ผลเช็ค AI\n' + ((await probeModels()).join('\n') || 'ไม่พบรุ่นที่ใช้ได้')).slice(0, 4500)));
  }
  if (/^(หลังบ้าน|แอดมิน|admin)$/i.test(msg) && isAdmin(uid)) {
    return reply(t, adminLinkMessage());
  }

  // ---- ลบข้อมูลของฉัน (ถาม 2 ขั้น) ----
  if (isWipe(msg)) return reply(t, wipeAskMessage(false));
  if (a === 'wipe1') return reply(t, wipeAskMessage(true));
  if (a === 'wipeno') return reply(t, noteCard('👍', 'ไม่ลบแล้ว', 'ข้อมูลยังอยู่ครบ'));
  if (a === 'wipe2') {
    const at = Number(new URLSearchParams(ev.postback.data).get('t'));
    if (!(Date.now() - at < 10 * 60 * 1000)) return reply(t, noteCard('⌛', 'ปุ่มนี้หมดอายุแล้ว', 'พิมพ์ "ลบข้อมูลของฉัน" ใหม่'));
    await deleteUserData(uid);
    prefix.delete(t);
    return reply(t, noteCard('🗑️', 'ลบข้อมูลทั้งหมดแล้ว', 'อยากใช้ใหม่ ทักมาได้ (ต้องกดยอมรับใหม่)'));
  }

  // ---- การยินยอม ---- (นโยบายเปลี่ยนเรื่องสำคัญ → ต้องกดยอมรับฉบับใหม่ก่อนใช้ต่อ)
  const consented = !!g.user.consentAt;
  const current = consented && (g.user.consentVersion || 1) >= POLICY_VERSION;
  if (a === 'agree') {
    if (!current) await setConsent(uid);
    // ส่งรหัสคู่มาก่อนกดยอมรับ → ทำต่อให้เลย ไม่ต้องส่งรหัสใหม่
    if (g.user.pairHash) {
      later(forgetCode(uid));
      const inv = await findInvite(g.user.pairHash);
      if (inv && inv.from !== uid) {
        const pr = await getLineProfile(inv.from);
        return reply(t, [noteCard('💖', 'ขอบคุณที่ไว้ใจนะ!', 'อีกขั้นเดียว แตะ 💑 ยืนยัน ด้านล่าง'), pairAskJoinMessage(pr.name, pr.pic, g.user.pairHash)]);
      }
      return reply(t, [noteCard('💖', 'ขอบคุณที่ไว้ใจนะ!', 'รหัสเชิญหมดอายุแล้ว ให้แฟนพิมพ์ "จับคู่" ส่งมาใหม่นะ'), helpMessage()]);
    }
    if (consented && !current) return reply(t, noteCard('💖', 'ขอบคุณที่ยอมรับฉบับใหม่!', 'ลองส่งรูปสลิปมาได้เลย 📸'));
    return reply(t, [noteCard('💖', 'ขอบคุณที่ไว้ใจนะ!', 'เริ่มจดได้เลย 🐷'), helpMessage()]);
  }
  if (a === 'deny') {
    if (current) return reply(t, noteCard('🤔', 'ยอมรับไว้แล้ว', 'ถ้าอยากลบ พิมพ์ "ลบข้อมูลของฉัน"'));
    if (consented) return reply(t, noteCard('🙏', 'ต้องยอมรับฉบับใหม่ก่อน ถึงจะใช้ต่อได้', 'ข้อมูลเดิมยังอยู่ · ลบได้ พิมพ์ "ลบข้อมูลของฉัน"'));
    await deleteUserData(uid);
    prefix.delete(t);
    return reply(t, noteCard('👋', 'ไม่เป็นไรนะ', 'ยังไม่ได้เก็บข้อมูลอะไร · เปลี่ยนใจทักมาได้เสมอ'));
  }
  if (!current) {
    // ยังไม่ยอมรับ / ยังไม่ยอมรับฉบับใหม่ → ไม่บันทึกอะไร
    const welcome = ev.type === 'follow' || g.isNew;
    const pc = isText ? pairCode(msg) : null;
    if (pc && validCode(pc)) { // จำรหัสคู่ไว้ (เก็บแค่ค่าแฮช) กดยอมรับแล้วไปต่อได้เลย
      await rememberCode(uid, codeHash(pc));
      return reply(t, [noteCard('💌', 'ได้รับคำเชิญจากแฟนแล้ว!', 'กด 💖 ยอมรับทั้งหมด ก่อนนะ แล้วจับคู่ต่อได้เลย'), consentMessage('👋 ยินดีต้อนรับ 🎀')]);
    }
    return reply(t, [
      ...(welcome ? [] : consented
        ? [noteCard('📄', 'นโยบายข้อมูลอัปเดตแล้ว', 'เพิ่มเรื่องอ่านสลิปด้วย AI · อ่านแล้วกดยอมรับนะ')]
        : [noteCard('🔒', 'ต้องกดยอมรับก่อนนะ', 'ถึงจะจดรายการให้ได้')]),
      consentMessage(welcome ? '👋 ยินดีต้อนรับ 🎀' : consented ? '📄 นโยบายฉบับใหม่' : undefined),
    ]);
  }
  // ข้อความยาวผิดปกติ (กันคนส่งข้อความยักษ์มาถ่วงระบบ)
  if (msg.length > 1500) return reply(t, noteCard('📏', 'ข้อความยาวเกินไป', 'แบ่งส่งทีละส่วนได้เลย (ครั้งละไม่เกิน 30 รายการ)'));

  if (ev.type === 'follow') return reply(t, helpMessage('👋 ยินดีต้อนรับ 🎀'));
  if (ev.type === 'postback') return onPostback(uid, ev);
  if (isImage) return onImage(uid, ev);
  return onText(uid, ev);
}

const catMap = cats => Object.fromEntries(cats.map(c => [c.id, c]));

async function onText(uid, ev) {
  const msg = ev.message.text.trim();
  const profile = await getProfile(uid);
  const byId = catMap(profile.categories);

  const me = await getUser(uid);
  const coupled = !!me?.coupleId;

  // ---- 💑 โหมดคู่รัก (คนที่ไม่ใช้ จะไม่มีอะไรเปลี่ยน) ----
  const code = pairCode(msg);
  if (code !== null) return onPairCode(uid, ev, code, me);
  if (isPair(msg)) {
    const couple = await getCouple(uid, me);
    if (couple) return reply(ev.replyToken, coupleStatusMessage(couple.partnerName, bkkIso(couple.since)));
    const left = await inviteLeft(uid); // ส่งคำเชิญไปแล้ว ยังรอแฟน → บอกสถานะให้ชัด
    if (left) {
      return reply(ev.replyToken, withQuick(noteCard('💌', 'ส่งคำเชิญแล้ว รอแฟนอยู่', `แฟนต้อง: แตะลิงก์ → กดส่ง → แตะ 💑 ยืนยัน\nรหัสใช้ได้อีก ${left} นาที · เสร็จแล้วบอทจะบอกคุณ`), [
        ['💌 สร้างรหัสใหม่', 'a=pair1', 'สร้างรหัสใหม่'],
        ['✖️ ยกเลิกรหัส', 'a=paircancel', 'ยกเลิกรหัส'],
      ]));
    }
    return reply(ev.replyToken, pairIntroMessage());
  }
  if (isCancelCode(msg)) {
    const n = await cancelInvites(uid);
    return reply(ev.replyToken, n ? noteCard('✖️', 'ยกเลิกรหัสเชิญแล้ว', 'รหัสเดิมใช้ไม่ได้แล้ว · สร้างใหม่ พิมพ์ "จับคู่"') : noteCard('🤔', 'ไม่มีรหัสเชิญที่ค้างอยู่'));
  }
  if (isUnpair(msg)) {
    const couple = await getCouple(uid, me);
    if (!couple) return reply(ev.replyToken, noteCard('🤔', 'ตอนนี้ยังไม่ได้จับคู่กับใคร', 'อยากใช้ พิมพ์ "จับคู่"'));
    return reply(ev.replyToken, unpairAskMessage(couple.partnerName));
  }
  if (isOurs(msg)) {
    const couple = await getCouple(uid, me);
    if (!couple) return reply(ev.replyToken, noteCard('💑', 'ยังไม่ได้จับคู่กับใคร', 'ชวนแฟนมาใช้ด้วยกัน พิมพ์ "จับคู่"'));
    const today = bkkDate();
    return reply(ev.replyToken, coupleSummaryMessage(await coupleDay(uid, couple, today), today, couple.partnerName));
  }

  if (/^(สรุป|สรุปวันนี้|ยอดวันนี้)$/.test(msg)) {
    const today = bkkDate();
    const couple = coupled ? await getCouple(uid, me) : null;
    const [mine, ours] = await Promise.all([listEntries(uid, today, today), couple ? coupleDay(uid, couple, today) : null]);
    return reply(ev.replyToken, [summaryMessage(mine, today, byId), ...(ours ? [coupleSummaryMessage(ours, today, couple.partnerName)] : [])]);
  }
  if (isHelp(msg)) return reply(ev.replyToken, helpMessage());
  if (isUndo(msg)) { // "ยกเลิก", "ยกเลิกเมื่อกี้", "ลบอันล่าสุด", "จดซ้ำ" ...
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
    later(clearEdit(uid));
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
    return reply(ev.replyToken, editEntryMessage(e, byId, coupled));
  }
  // ---- แก้/ลบ แบบบอกว่าอันไหน: "แก้ค่ากินวันที่12", "แก้รายการวันที่11", "ลบค่ากินเมื่อวาน", "ลบ ข้าว 50" ----
  const target = msg.match(/^(?:ขอ)?(แก้(?!ว)(?:ไข)?|ลบ(?!คำ)|เอาออก)\s*(.*)$/);
  if (target && target[2] && cleanTarget(target[2])) { // "ขอแก้ราคาได้ไหม" ไม่ได้ระบุอันไหน → ไปเปิดรายการวันนี้ด้านล่าง
    const found = await findTargets(uid, target[2], profile, byId);
    if (found) {
      const del = !target[1].startsWith('แก้');
      const what = [found.word, found.num ? `${baht(found.num)} บาท` : '', found.date ? thaiDate(found.date) : ''].filter(Boolean).join(' · ');
      if (!found.matches.length) {
        return reply(ev.replyToken, [noteCard('🔍', `ไม่เจอรายการ ${what}`, 'แตะเลือกจากรายการล่าสุดได้เลย'), await editList(uid, byId)]);
      }
      if (found.matches.length === 1) {
        return reply(ev.replyToken, del ? deleteAsk(found.matches[0], byId) : editEntryMessage(found.matches[0], byId, coupled));
      }
      return reply(ev.replyToken, [
        noteCard('🔍', `เจอ ${found.matches.length} รายการ`, `${what} · แตะอันที่จะ${del ? 'ลบ' : 'แก้'}`),
        editListMessage(found.matches.slice(0, 10), byId),
      ]);
    }
  }

  // ---- อยากแก้/ลบ แต่ไม่ได้บอกว่าอันไหน: "ขอแก้ไข", "พิมพ์ผิด", "ลบอันเก่า", "ย้อนกลับ" ----
  if (!hasDigit && isEdit(msg)) {
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
    if (pending.slip) return saveSlip(uid, ev, pending, cat, profile, [...profile.customCategories, cat]);
    applyWord(pending, word, cat, pending.awaitCat);
    delete pending.awaitCat;
    await Promise.all([learn(uid, profile, word, cat.id, [...profile.customCategories, cat]), setPending(uid, pending)]); // บันทึกพร้อมกัน
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
        applyWord(pending, word, cat, q);
        await Promise.all([learn(uid, profile, word, cat.id), setPending(uid, pending)]); // บันทึกพร้อมกัน
        return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...nextStep(pending, byId, profile.categories)]);
      }
      const cat = msg.length <= 20 ? findCategory(msg, profile) : null;
      if (cat) {
        applyWord(pending, word, cat, q);
        await Promise.all([learn(uid, profile, word, cat.id), setPending(uid, pending)]); // บันทึกพร้อมกัน
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
    later(setMiss(uid, { count, at: Date.now() }));
    if (count >= 2) return reply(ev.replyToken, stuckMessage());
    return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอจำนวนเงิน', 'ลองพิมพ์ เช่น น้ำมัน 60 ข้าว 50\nหรือพิมพ์ "วิธีใช้"'));
  }
  later(clearMiss(uid));
  const pid = Math.random().toString(36).slice(2, 10);
  const pend = { id: pid, items, date, orphans };
  await setPending(uid, pend);
  const out = [confirmMessage(items, date, pid, byId, orphans, coupled), ...nextStep(pend, byId, profile.categories, true)];
  if (truncated) out.unshift(noteCard('⚠️', 'รับได้ครั้งละ 30 รายการ', 'ที่เหลือส่งข้อความใหม่ได้เลย'));
  return reply(ev.replyToken, out);
}

// ---------- อ่านสลิป ----------
async function onImage(uid, ev) {
  const t = ev.replyToken;
  if (!slipReady()) return reply(t, slipFallbackMessage('off'));
  if (!(await slipTurn(uid))) return reply(t, noteCard('😅', 'บอทอ่านไม่ทัน ขอทีละสลิปน้า', 'รอแป๊บ แล้วส่งรูปถัดไปได้เลย'));
  if (!(await geminiTurn())) return reply(t, slipFallbackMessage('busy'));
  const profile = await getProfile(uid);
  let s;
  try {
    const img = await fetchImage(ev.message.id);
    s = await readSlip(img, profile.categories.filter(c => c.type === 'expense'));
  } catch (e) {
    if (e.code !== 'notslip') console.error('slip', e.message);
    return reply(t, slipFallbackMessage(e.code || 'error'));
  }
  const key = slipKey(uid, s);
  const dup = await findSlip(uid, key);
  if (dup) return reply(t, noteCard('🧾', 'สลิปนี้จดไปแล้วนะ', `${baht(dup.amount)} บาท · ${thaiDate(dup.date)}`));
  const byId = catMap(profile.categories);
  const word = s.receiver;
  const learned = word && profile.keywords.find(k => k.word === word);
  const known = learned && byId[learned.category];
  const guess = !known && s.category ? byId[s.category] : null;
  const cat = known || guess;
  const item = {
    type: cat?.type || 'expense', category: cat?.id || OTHER.expense, amount: s.amount,
    note: word, word, date: s.date, slip: key, sure: !!known,
  };
  const pid = Math.random().toString(36).slice(2, 10);
  await setPending(uid, { id: pid, slip: true, items: [item], date: s.date });
  return reply(t, slipMessage(item, pid, profile.categories, { known, guess }));
}

// บันทึกสลิป (แตะหมวดครั้งเดียวจบ) + จำร้านนี้กับหมวดนี้
async function saveSlip(uid, ev, pending, cat, profile, extraCats) {
  const it = { ...pending.items[0], category: cat.id, type: cat.type };
  const batch = 'b' + pending.id, today = bkkDate();
  const word = it.word;
  const [, saved, before] = await Promise.all([
    clearPending(uid),
    addEntries(uid, [it], batch),
    listEntries(uid, today, today),
    word ? learn(uid, profile, word, cat.id, extraCats) : extraCats ? saveProfile(uid, { categories: extraCats }) : null,
  ]);
  const list = [...before.filter(e => e.batch !== batch), ...(it.date === today ? [it] : [])];
  const net = list.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0);
  // รายการไม่ใช่ของวันนี้ → ไม่โชว์ยอดวันนี้ (กันสับสน) บอกแค่ว่าจดลงวันไหน
  const msg = noteCard('✅', `จดแล้ว ${cat.icon} ${cat.name} ${it.type === 'income' ? '+' : '-'}${baht(it.amount)}`,
    `${it.date === today ? todayNet(net) : `จดลงวันที่ ${thaiDate(it.date)}`}${word ? ` · จำ "${word}" แล้ว` : ''}`);
  return reply(ev.replyToken, withQuick(msg, [
    ['↩️ ยกเลิก', `a=del&b=${batch}`, 'ยกเลิกรายการนี้'],
    ['✏️ แก้', `a=pick&id=${saved[0].id}`, 'แก้รายการนี้'],
    ...(hasCouple() ? [privQuick(batch)] : []),
  ]));
}

// ---------- แก้ไขรายการในแชท ----------

// รายการให้แตะแก้: เริ่มที่วันนี้ (ถ้าวันนี้ว่าง → เมื่อวาน) ทีละ 10 รายการ + ปุ่มสลับวัน/เลือกวัน
const PAGE = 10;
async function editList(uid, byId, { day, offset = 0, date } = {}) {
  const today = bkkDate(), yest = bkkDate(-1);
  let d = date || (day === 'y' ? yest : today);
  let list = await listEntries(uid, d, d);
  if (!list.length && !day && !date) { d = yest; list = await listEntries(uid, d, d); }
  const label = d === today ? 'วันนี้' : d === yest ? 'เมื่อวาน' : thaiDate(d);
  const quick = [
    ...(d !== today ? [['📅 วันนี้', 'a=elist&d=t', 'แก้รายการวันนี้']] : []),
    ...(d !== yest ? [['📅 เมื่อวาน', 'a=elist&d=y', 'แก้รายการเมื่อวาน']] : []),
  ];
  const picker = { type: 'action', action: { type: 'datetimepicker', label: '🗓️ เลือกวัน', data: 'a=elist&d=pick', mode: 'date', initial: d, max: today } };
  const withButtons = (m, more) => ({ ...m, quickReply: { items: [...more, ...quick.map(([l, data, shown]) => ({ type: 'action', action: { type: 'postback', label: l, data, displayText: shown } })), picker] } });
  if (!list.length) return withButtons(noteCard('📝', `${label}ยังไม่มีรายการ`, 'เลือกวันอื่นด้านล่างได้เลย'), []);
  const page = list.slice(offset, offset + PAGE);
  const next = offset + PAGE < list.length
    ? [{ type: 'action', action: { type: 'postback', label: '▶️ ถัดไป', data: `a=elist&dt=${d}&o=${offset + PAGE}`, displayText: 'ดูรายการถัดไป' } }] : [];
  const sub = `${label} · ${list.length} รายการ${list.length > PAGE ? ` (${offset + 1}–${offset + page.length})` : ''} · แตะเพื่อแก้ 👇`;
  return withButtons(editListMessage(page, byId, sub), next);
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
  await Promise.all([updateEntry(uid, e.id, next), clearEdit(uid)]);
  return reply(ev.replyToken, [noteCard('✅', 'แก้แล้ว', what), editEntryMessage({ ...next, id: e.id }, byId, hasCouple())]);
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
  return first ? [] : [confirmMessage(pending.items, pending.date, pending.id, byId, pending.orphans || [], hasCouple())];
}
// มีคู่ไหม (อ่านจากข้อมูลผู้ใช้ที่โหลดไว้แล้วในคำขอนี้ ไม่อ่านฐานข้อมูลเพิ่ม)
const hasCouple = (uid = docGet('@uid')) => !!docGet(`users/${uid}`)?.coupleId;
const bkkIso = ms => new Date(ms + 7 * 3600 * 1000).toISOString().slice(0, 10);
const privQuick = batch => ['🔒 ส่วนตัว', `a=privb&b=${batch}`, 'ตั้งเป็นส่วนตัว'];

// ---------- 💑 จับคู่ ----------
// B ส่ง "จับคู่ <รหัส>"
async function onPairCode(uid, ev, code, me) {
  const t = ev.replyToken;
  if (me?.coupleId) return reply(t, noteCard('💑', 'คุณมีคู่อยู่แล้ว', 'อยากเปลี่ยน ต้องพิมพ์ "เลิกคู่" ก่อน'));
  if (!(await codeTurn(uid))) return reply(t, noteCard('⏳', 'ลองหลายครั้งเกินไป', 'รอ 1 ชั่วโมง แล้วให้แฟนสร้างรหัสใหม่นะ'));
  const hash = validCode(code) ? codeHash(code) : '';
  const inv = hash ? await findInvite(hash) : null;
  if (!inv) return reply(t, noteCard('🤔', 'รหัสไม่ถูก หรือหมดอายุแล้ว', `รหัสใช้ได้ ${CODE_MINUTES} นาที · ให้แฟนพิมพ์ "จับคู่" สร้างรหัสใหม่`));
  if (inv.from === uid) return reply(t, noteCard('💌', 'นี่คือรหัสของคุณเอง', 'ส่งให้แฟน แล้วให้แฟนเป็นคนกดนะ'));
  const p = await getLineProfile(inv.from);
  return reply(t, pairAskJoinMessage(p.name, p.pic, hash));
}
const PAIR_ERR = {
  gone: ['⌛', 'คำเชิญนี้หมดอายุหรือใช้ไปแล้ว', 'พิมพ์ "จับคู่" เพื่อเริ่มใหม่'],
  self: ['💌', 'นี่คือรหัสของคุณเอง', 'ส่งให้แฟน แล้วให้แฟนเป็นคนกดนะ'],
  taken: ['🤔', 'คำเชิญนี้ใช้ไม่ได้แล้ว', 'ให้แฟนพิมพ์ "จับคู่" สร้างรหัสใหม่'],
  mine: ['💑', 'คุณมีคู่อยู่แล้ว', 'อยากเปลี่ยน ต้องพิมพ์ "เลิกคู่" ก่อน'],
};
async function onPairPostback(uid, ev, a, p) {
  const t = ev.replyToken;
  if (a === 'pairx') return reply(t, noteCard('👌', 'โอเค ไม่จับคู่', 'เปลี่ยนใจ พิมพ์ "จับคู่" ได้เสมอ'));
  if (a === 'unpairno') return reply(t, noteCard('💕', 'โอเค ยังอยู่ด้วยกันเหมือนเดิม'));
  if (a === 'pair1') { // A สร้างรหัสเชิญ
    if (hasCouple(uid)) return reply(t, noteCard(...PAIR_ERR.mine));
    const code = await createInvite(uid);
    return reply(t, pairCodeMessage(code, showCode(code), CODE_MINUTES));
  }
  if (a === 'paircancel') {
    const n = await cancelInvites(uid);
    return reply(t, n ? noteCard('✖️', 'ยกเลิกรหัสเชิญแล้ว', 'สร้างใหม่ พิมพ์ "จับคู่"') : noteCard('🤔', 'ไม่มีรหัสเชิญที่ค้างอยู่'));
  }
  if (a === 'pairok') { // B แตะยืนยัน → จับคู่เสร็จทันที แล้วบอก A (ชื่อ+รูป + ปุ่ม "ไม่ใช่แฟน")
    const me = await getLineProfile(uid);
    const r = await joinPair(uid, String(p.get('h') || '').slice(0, 40) || 'x', me.name);
    if (r.error) return reply(t, noteCard(...PAIR_ERR[r.error]));
    await push(r.partner, pairNotifyOwnerMessage(me.name || r.myName, me.pic, r.coupleId)).catch(e => console.error('pair push', e.message));
    return reply(t, pairDoneMessage(r.partnerName || 'แฟน'));
  }
  if (a === 'pairundo') { // A: "ไม่ใช่แฟน" → ยกเลิกทันที (เฉพาะคู่นั้น และภายใน 24 ชม.)
    const me = await getUser(uid);
    if (!me?.coupleId || me.coupleId !== p.get('c')) return reply(t, noteCard('🤔', 'การจับคู่นี้ถูกยกเลิกไปแล้ว'));
    if (!(Date.now() - Number(p.get('t')) < 24 * 3600 * 1000)) return reply(t, noteCard('⌛', 'ปุ่มนี้หมดอายุแล้ว', 'ถ้าจะเลิก พิมพ์ "เลิกคู่"'));
    const partner = await unpair(uid);
    if (partner) await push(partner, unpairedMessage()).catch(e => console.error('unpair push', e.message));
    return reply(t, noteCard('🛡️', 'ยกเลิกการจับคู่แล้ว', 'คนนั้นดูยอดของคุณไม่ได้แล้ว · เริ่มใหม่ พิมพ์ "จับคู่"'));
  }
  if (a === 'unpair2') {
    if (!(Date.now() - Number(p.get('t')) < 10 * 60 * 1000)) return reply(t, noteCard('⌛', 'ปุ่มนี้หมดอายุแล้ว', 'พิมพ์ "เลิกคู่" ใหม่'));
    const partner = await unpair(uid);
    if (!partner) return reply(t, noteCard('🤔', 'ตอนนี้ไม่ได้จับคู่กับใครแล้ว'));
    await push(partner, unpairedMessage()).catch(e => console.error('unpair push', e.message));
    return reply(t, noteCard('👋', 'เลิกโหมดคู่รักแล้ว', 'รายการของคุณยังอยู่ครบ · จดต่อได้ตามปกติ'));
  }
}

async function onPostback(uid, ev) {
  const p = new URLSearchParams(ev.postback.data);
  const a = p.get('a');

  if (a === 'ok' || a === 'no') {
    const pending = await getPending(uid);
    if (!pending || pending.id !== p.get('p') || Date.now() - pending.createdAt > PENDING_TTL) {
      return reply(ev.replyToken, noteCard('⌛', 'รายการนี้หมดอายุหรือทำไปแล้ว'));
    }
    if (a === 'no') { later(clearPending(uid)); return reply(ev.replyToken, noteCard('✖️', 'ยกเลิกแล้ว', 'พิมพ์ใหม่ได้เลย')); }

    // บันทึก + อ่านยอดวันนี้ พร้อมกัน (ไม่ต้องรอทีละอย่าง)
    const batch = 'b' + pending.id, today = bkkDate();
    const coupled = hasCouple();
    const priv = coupled && p.get('pv') === '1'; // 🔒 ยืนยันแบบส่วนตัว (เฉพาะคนมีคู่)
    const items = pending.items.map(i => ({ ...i, date: i.date || pending.date, ...(priv ? { private: true } : {}) }));
    const [, , before] = await Promise.all([clearPending(uid), addEntries(uid, items, batch), listEntries(uid, today, today)]);
    const mine = items.filter(i => i.date === today);
    const list = [...before.filter(e => e.batch !== batch), ...mine];
    const net = list.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
    const days = [...new Set(items.map(i => i.date))];
    const saved = savedMessage(items.length, days.length > 1 ? 'หลายวัน' : thaiDate(days[0]), mine.length ? net : null);
    if (priv) return reply(ev.replyToken, [saved, noteCard('🔒', 'ตั้งเป็นส่วนตัวแล้ว', 'แฟนไม่เห็น และไม่นับในยอดของเรา')]);
    return reply(ev.replyToken, coupled ? withQuick(saved, [privQuick(batch)]) : saved);
  }

  if (['pair1', 'pairx', 'pairok', 'pairundo', 'paircancel', 'unpair2', 'unpairno'].includes(a)) return onPairPostback(uid, ev, a, p);

  // 🔒 ตั้งรายการที่เพิ่งจด (ทั้งชุด) เป็นส่วนตัว
  if (a === 'privb') {
    if (!hasCouple()) return reply(ev.replyToken, noteCard('🤔', 'ใช้ได้เมื่อจับคู่แล้ว', 'พิมพ์ "จับคู่" เพื่อเริ่ม'));
    const list = await batchEntries(uid, String(p.get('b') || ''));
    if (!list.length) return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอรายการนี้แล้ว', 'อาจถูกลบไปแล้ว'));
    await setPrivate(uid, list.map(e => e.id), true);
    return reply(ev.replyToken, noteCard('🔒', `ตั้งเป็นส่วนตัวแล้ว ${list.length} รายการ`, 'แฟนไม่เห็น และไม่นับในยอดของเรา · เปลี่ยนได้ที่ "แก้ไข"'));
  }

  if (a === 'stype') return reply(ev.replyToken, noteCard('✍️', 'พิมพ์ได้เลย', 'เช่น ข้าว 50 หรือ น้ำมัน 100'));
  if (['scat', 'snew', 'sflip', 'sno'].includes(a)) {
    const pending = await getPending(uid);
    if (!pending?.slip || pending.id !== p.get('p') || Date.now() - pending.createdAt > PENDING_TTL) {
      return reply(ev.replyToken, noteCard('⌛', 'สลิปนี้หมดเวลาหรือจดไปแล้ว', 'ส่งรูปใหม่ได้เลย'));
    }
    const profile = await getProfile(uid);
    const byId = catMap(profile.categories);
    const it = pending.items[0];
    if (a === 'sno') { later(clearPending(uid)); return reply(ev.replyToken, noteCard('👌', 'โอเค ไม่จดสลิปนี้')); }
    if (a === 'snew') {
      pending.awaitCat = 0;
      await setPending(uid, pending);
      return reply(ev.replyToken, noteCard('✍️', 'พิมพ์ชื่อหมวดใหม่ได้เลย', it.type === 'income' ? 'เช่น ขายของออนไลน์' : 'เช่น ค่าขนมลูก'));
    }
    if (a === 'sflip') {
      it.type = it.type === 'income' ? 'expense' : 'income';
      it.category = OTHER[it.type];
      await setPending(uid, pending);
      return reply(ev.replyToken, slipMessage(it, pending.id, profile.categories));
    }
    const cat = byId[p.get('c')];
    if (!cat) return reply(ev.replyToken, noteCard('🤔', 'ไม่พบหมวดนี้แล้ว'));
    return saveSlip(uid, ev, pending, cat, profile);
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
    applyWord(pending, word, cat, i);
    await Promise.all([learn(uid, profile, word, cat.id), setPending(uid, pending)]); // บันทึกพร้อมกัน
    return reply(ev.replyToken, [noteCard('🧠', `จำแล้ว "${word}"`, `= ${cat.icon} ${cat.name}`), ...nextStep(pending, byId, profile.categories)]);
  }

  // ---- แก้ไขรายการ ----
  if (['elist', 'pick', 'eamt', 'ecat', 'ecat2', 'eflip', 'edate', 'enote', 'edel', 'edel2', 'edone', 'epriv'].includes(a)) {
    const profile = await getProfile(uid);
    const byId = catMap(profile.categories);
    if (a === 'edone') { later(clearEdit(uid)); return reply(ev.replyToken, noteCard('✨', 'เรียบร้อย!', 'พิมพ์รายการใหม่ได้เลย')); }
    if (a === 'elist') {
      const dt = ev.postback.params?.date || p.get('dt') || '';
      const day = p.get('d');
      return reply(ev.replyToken, await editList(uid, byId, {
        day: day === 'y' || day === 't' ? day : undefined, offset: Number(p.get('o')) || 0, date: /^\d{4}-\d{2}-\d{2}$/.test(dt) ? dt : undefined,
      }));
    }
    const e = await getEntry(uid, p.get('id'));
    if (!e) return reply(ev.replyToken, noteCard('🤔', 'ไม่เจอรายการนี้แล้ว', 'อาจถูกลบไปแล้ว'));
    if (a === 'pick') return reply(ev.replyToken, editEntryMessage(e, byId, hasCouple()));
    if (a === 'epriv') {
      const flag = p.get('v') === '1';
      if (!hasCouple()) return reply(ev.replyToken, editEntryMessage(e, byId));
      await setPrivate(uid, [e.id], flag);
      return reply(ev.replyToken, [
        noteCard(flag ? '🔒' : '🔓', flag ? 'ตั้งเป็นส่วนตัวแล้ว' : 'ให้แฟนเห็นแล้ว', flag ? 'แฟนไม่เห็น และไม่นับในยอดของเรา' : 'นับในยอดของเราแล้ว'),
        editEntryMessage({ ...e, private: flag }, byId, true),
      ]);
    }
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
