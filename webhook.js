// LINE ส่งข้อความของผู้ใช้มาที่นี่ (Webhook URL = https://<เว็บของคุณ>/api/webhook)
import { verifySignature, reply } from '../lib/line.js';
import { parseMessage } from '../lib/parser.js';
import { bkkDate, thaiDate } from '../lib/date.js';
import { confirmMessage, summaryMessage, undoMessage, HELP_TEXT, text, baht } from '../lib/messages.js';
import {
  getProfile, addEntries, listEntries, lastBatch, deleteEntries,
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
    return reply(ev.replyToken, text(`สวัสดีครับ 👋 ยินดีต้อนรับสู่สมุดรายรับรายจ่าย\n\n${HELP_TEXT}`));
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
  if (/^(วิธีใช้|ช่วย|help|\?)$/i.test(msg)) return reply(ev.replyToken, text(HELP_TEXT));
  if (/^(ยกเลิก|cancel|ลบ|ลบล่าสุด)$/i.test(msg)) {
    if (await getPending(uid)) {
      await clearPending(uid);
      return reply(ev.replyToken, text('ยกเลิกรายการที่รอยืนยันแล้ว ✖️'));
    }
    const last = await lastBatch(uid);
    if (!last.length) return reply(ev.replyToken, text('ยังไม่มีรายการให้ยกเลิกครับ'));
    return reply(ev.replyToken, undoMessage(last, byId));
  }

  const { dayOffset, items } = parseMessage(msg, profile.categories, profile.keywords);
  if (!items.length) {
    return reply(ev.replyToken, text('ไม่พบจำนวนเงินในข้อความ 🤔\nลองพิมพ์ เช่น "น้ำมัน 60 ข้าว 50"\nหรือพิมพ์ "วิธีใช้"'));
  }
  const date = bkkDate(dayOffset);
  const pid = Math.random().toString(36).slice(2, 10);
  await setPending(uid, { id: pid, items, date });
  return reply(ev.replyToken, confirmMessage(items, date, pid, byId));
}

async function onPostback(uid, ev) {
  const p = new URLSearchParams(ev.postback.data);
  const a = p.get('a');

  if (a === 'ok' || a === 'no') {
    const pending = await getPending(uid);
    if (!pending || pending.id !== p.get('p') || Date.now() - pending.createdAt > PENDING_TTL) {
      return reply(ev.replyToken, text('รายการนี้หมดอายุหรือทำไปแล้วครับ'));
    }
    await clearPending(uid);
    if (a === 'no') return reply(ev.replyToken, text('ยกเลิกแล้ว ✖️ พิมพ์ใหม่ได้เลยครับ'));

    await addEntries(uid, pending.items.map(i => ({ ...i, date: pending.date })), 'b' + pending.id);
    const today = bkkDate();
    const list = await listEntries(uid, today, today);
    const net = list.reduce((s, e) => s + (e.type === 'income' ? e.amount : -e.amount), 0);
    return reply(ev.replyToken, text(
      `บันทึกแล้ว ✅ ${pending.items.length} รายการ (${thaiDate(pending.date)})\n` +
      `ยอดวันนี้: ${net >= 0 ? 'กำไร' : 'ขาดทุน'} ${baht(Math.abs(net))} บาท`));
  }

  if (a === 'del') {
    const last = await lastBatch(uid);
    if (!last.length || last[0].batch !== p.get('b')) return reply(ev.replyToken, text('รายการนี้ถูกลบไปแล้วครับ'));
    await deleteEntries(uid, last.map(e => e.id));
    return reply(ev.replyToken, text(`ลบแล้ว 🗑️ ${last.length} รายการ`));
  }
  if (a === 'keep') return reply(ev.replyToken, text('โอเค ไม่ลบครับ 👍'));
}
