// API สำหรับเว็บแอป (ต้องล็อกอินด้วย LINE ผ่าน LIFF)
import { authUser, makeSession, getLineProfile, push } from '../lib/line.js';
import { getCouple, coupleEntries, coupleYear, unpair } from '../lib/couple.js';
import { unpairedMessage } from '../lib/messages.js';
import { bkkDate } from '../lib/date.js';
import {
  getProfile, saveProfile, addEntries, updateEntry, deleteEntries, listEntries, yearSummary, compactOld, keepFrom,
} from '../lib/store.js';
import { listDebts, addDebt, moveDebt, deleteDebt, cleanAmount } from '../lib/debts.js';
import { gate, POLICY_VERSION } from '../lib/access.js';
import { runCtx, later } from '../lib/ctx.js';
import { tooMany, tooBig, readJson, validId } from '../lib/guard.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const auth = authUser;

// เว็บใช้ได้เฉพาะคนที่อยู่ในระบบและกดยอมรับในแชทแล้ว (รับคนใหม่ผ่านแชทเท่านั้น)
// ผลตรวจสิทธิ์จำไว้ 20 วิ ต่อเครื่อง (เปิดเว็บ/สลับหน้าไม่ต้องอ่านฐานข้อมูลซ้ำทุกครั้ง)
const okCache = new Map();
async function allowed(user) {
  const hit = okCache.get(user.uid);
  if (hit && hit > Date.now()) return '';
  const g = await gate(user.uid, { displayName: user.name, admit: false });
  if (g.status !== 'member') return 'not_member';
  if (!g.user.consentAt || (g.user.consentVersion || 1) < POLICY_VERSION) return 'no_consent';
  if (okCache.size > 500) okCache.clear();
  okCache.set(user.uid, Date.now() + 20000);
  return '';
}
// ช่วงวันที่ต้องถูกต้องและไม่กว้างเกิน (กันขอข้อมูลก้อนใหญ่)
const okRange = (from, to, days = 62) => isDate(from) && isDate(to) && from <= to && Date.parse(to) - Date.parse(from) <= days * 86400000;

const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

export const GET = request => runCtx(() => get(request), { background: true });
export const POST = request => runCtx(() => post(request), { background: true });

async function get(request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  if (action === 'config') return json({ liffId: process.env.LIFF_ID || '' });

  const user = await auth(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (tooMany('d:' + user.uid)) return json({ error: 'ใช้งานถี่เกินไป รอสักครู่นะ' }, 429);
  try {
    const deny = await allowed(user);
    if (deny) return json({ error: deny }, 403);
    if (action === 'profile') return json({ ...(await getProfile(user.uid)), name: user.name });
    if (action === 'debts') return json({ debts: await listDebts(user.uid) }); // 📒 สมุดหนี้ (เฉพาะของตัวเอง ไม่แชร์ให้แฟน)
    if (action === 'boot') { // เปิดเว็บครั้งแรก: ดึงหมวด + รายการเดือนนี้ในครั้งเดียว
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!okRange(from, to)) return json({ error: 'bad date' }, 400);
      // 💑 มีคู่ไหม (คนโสดไม่มีการอ่านเพิ่ม) → ชื่อ+รูปแฟน ไว้โชว์ปุ่ม "ของเรา"
      // รูปแฟนดึงจาก LINE ไม่เกิน 0.7 วิ (ช้ากว่านั้นใช้รูปที่เว็บจำไว้ ไม่ให้หน้าเว็บรอ)
      // มีคู่ → ส่งข้อมูลคู่รักเดือนนี้มาในคำขอเดียวกันเลย (กดสลับแล้วขึ้นทันที) · รูปแฟนรอไม่เกิน 0.3 วิ
      const picOf = id => Promise.race([getLineProfile(id).then(p => p.pic), new Promise(r => setTimeout(() => r(''), 300))]);
      const minePromise = listEntries(user.uid, from, to);
      const couplePromise = getCouple(user.uid).then(async c => {
        if (!c) return [null, null];
        const [pic, us] = await Promise.all([picOf(c.partner), coupleEntries(user.uid, c, from, to, minePromise)]);
        return [{ name: c.partnerName, since: c.since, pic }, us];
      });
      const [profile, entries, [couple, us]] = await Promise.all([getProfile(user.uid), minePromise, couplePromise]);
      later(compactOld(user.uid, bkkDate())); // รวมข้อมูลเก่า เดือนละครั้ง (ทำหลังตอบ)
      return json({ profile: { ...profile, name: user.name }, entries, couple, us, keepFrom: keepFrom(), session: makeSession(user) });
    }
    if (action === 'entries') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!okRange(from, to)) return json({ error: 'bad date' }, 400);
      return json({ entries: await listEntries(user.uid, from, to) });
    }
    // ---- 💑 ของเรา: เซิร์ฟเวอร์หาคู่จากบัญชีตัวเองเท่านั้น (ไม่รับ uid จากหน้าเว็บ) ----
    if (action === 'coupleEntries' || action === 'coupleYear') {
      const couple = await getCouple(user.uid);
      if (!couple) return json({ error: 'no_couple' }, 409);
      if (action === 'coupleYear') {
        const y = Number(url.searchParams.get('year'));
        if (!(y > 2000 && y < 3000)) return json({ error: 'bad year' }, 400);
        return json(await coupleYear(user.uid, couple, y));
      }
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!okRange(from, to)) return json({ error: 'bad date' }, 400);
      return json(await coupleEntries(user.uid, couple, from, to));
    }
    if (action === 'year') {
      const y = Number(url.searchParams.get('year'));
      if (!(y > 2000 && y < 3000)) return json({ error: 'bad year' }, 400);
      return json({ months: await yearSummary(user.uid, y) });
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'server error' }, 500);
  }
}

async function post(request) {
  if (tooBig(request)) return json({ error: 'ข้อมูลใหญ่เกินไป' }, 413);
  const user = await auth(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  if (tooMany('d:' + user.uid)) return json({ error: 'ใช้งานถี่เกินไป รอสักครู่นะ' }, 429);
  try {
    const deny = await allowed(user);
    if (deny) return json({ error: deny }, 403);
    const body = await readJson(request);
    if (!body) return json({ error: 'bad request' }, 400);
    const { action, ...b } = body;
    if ((action === 'update' || action === 'delete') && !validId(b.id)) return json({ error: 'bad id' }, 400);
    if ((action === 'add' || action === 'update') && (!b.entry || typeof b.entry !== 'object')) return json({ error: 'bad entry' }, 400);
    if (action === 'add') return json({ entries: await addEntries(user.uid, [b.entry]) });
    if (action === 'update') return json({ entry: await updateEntry(user.uid, String(b.id), b.entry) });
    if (action === 'delete') return json({ deleted: await deleteEntries(user.uid, [String(b.id)]) });
    if (action === 'debtAdd') return json({ debt: await addDebt(user.uid, b.name, b.amount) });
    if (action === 'debtMove') {
      if (!validId(b.id)) return json({ error: 'bad id' }, 400);
      const n = cleanAmount(b.amount);
      return json({ debt: await moveDebt(user.uid, b.id, b.repay ? -n : n) });
    }
    if (action === 'debtDel') {
      if (!validId(b.id)) return json({ error: 'bad id' }, 400);
      return json({ deleted: await deleteDebt(user.uid, b.id) });
    }
    if (action === 'unpair') {
      const partner = await unpair(user.uid);
      if (partner) await push(partner, unpairedMessage()).catch(e => console.error('unpair push', e.message));
      return json({ ok: true });
    }
    if (action === 'profile') {
      await saveProfile(user.uid, { categories: b.categories, keywords: b.keywords });
      return json(await getProfile(user.uid));
    }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: /[ก-๙]/.test(e.message) ? e.message : 'bad request' }, 400); // แสดงเฉพาะข้อความที่เราเขียนเอง
  }
}
