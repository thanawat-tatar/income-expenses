// API สำหรับเว็บแอป (ต้องล็อกอินด้วย LINE ผ่าน LIFF)
import { authUser, makeSession, getLineProfile, push } from '../lib/line.js';
import { getCouple, coupleEntries, coupleYear, unpair } from '../lib/couple.js';
import { unpairedMessage } from '../lib/messages.js';
import { bkkDate } from '../lib/date.js';
import {
  getProfile, saveProfile, addEntries, updateEntry, deleteEntries, listEntries, yearSummary, compactOld,
} from '../lib/store.js';
import { gate, POLICY_VERSION } from '../lib/access.js';
import { runCtx, later } from '../lib/ctx.js';
import { tooMany, tooBig } from '../lib/guard.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const auth = authUser;

// เว็บใช้ได้เฉพาะคนที่อยู่ในระบบและกดยอมรับในแชทแล้ว (รับคนใหม่ผ่านแชทเท่านั้น)
async function allowed(user) {
  const g = await gate(user.uid, { displayName: user.name, admit: false });
  if (g.status !== 'member') return 'not_member';
  if (!g.user.consentAt || (g.user.consentVersion || 1) < POLICY_VERSION) return 'no_consent';
  return '';
}

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
    if (action === 'boot') { // เปิดเว็บครั้งแรก: ดึงหมวด + รายการเดือนนี้ในครั้งเดียว
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!isDate(from) || !isDate(to)) return json({ error: 'bad date' }, 400);
      // 💑 มีคู่ไหม (คนโสดไม่มีการอ่านเพิ่ม) → ชื่อ+รูปแฟน ไว้โชว์ปุ่ม "ของเรา"
      // รูปแฟนดึงจาก LINE ไม่เกิน 0.7 วิ (ช้ากว่านั้นใช้รูปที่เว็บจำไว้ ไม่ให้หน้าเว็บรอ)
      const picOf = id => Promise.race([getLineProfile(id).then(p => p.pic), new Promise(r => setTimeout(() => r(''), 700))]);
      const couplePromise = getCouple(user.uid).then(async c => (c ? { name: c.partnerName, since: c.since, pic: await picOf(c.partner) } : null));
      const [profile, entries, couple] = await Promise.all([getProfile(user.uid), listEntries(user.uid, from, to), couplePromise]);
      later(compactOld(user.uid, bkkDate())); // รวมข้อมูลเก่า เดือนละครั้ง (ทำหลังตอบ)
      return json({ profile: { ...profile, name: user.name }, entries, couple, session: makeSession(user) });
    }
    if (action === 'entries') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!isDate(from) || !isDate(to)) return json({ error: 'bad date' }, 400);
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
      if (!isDate(from) || !isDate(to) || Date.parse(to) - Date.parse(from) > 62 * 86400000) return json({ error: 'bad date' }, 400);
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
    return json({ error: e.message }, 500);
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
    const { action, ...b } = await request.json();
    if (action === 'add') return json({ entries: await addEntries(user.uid, [b.entry]) });
    if (action === 'update') return json({ entry: await updateEntry(user.uid, String(b.id), b.entry) });
    if (action === 'delete') return json({ deleted: await deleteEntries(user.uid, [String(b.id)]) });
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
    return json({ error: e.message }, 400);
  }
}
