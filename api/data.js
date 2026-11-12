// API สำหรับเว็บแอป (ต้องล็อกอินด้วย LINE ผ่าน LIFF)
import { authUser, makeSession } from '../lib/line.js';
import { bkkDate } from '../lib/date.js';
import {
  getProfile, saveProfile, addEntries, updateEntry, deleteEntries, listEntries, yearSummary, compactOld,
} from '../lib/store.js';
import { gate } from '../lib/access.js';
import { runCtx, later } from '../lib/ctx.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

const auth = authUser;

// เว็บใช้ได้เฉพาะคนที่อยู่ในระบบและกดยอมรับในแชทแล้ว (รับคนใหม่ผ่านแชทเท่านั้น)
async function allowed(user) {
  const g = await gate(user.uid, { displayName: user.name, admit: false });
  if (g.status !== 'member') return 'not_member';
  if (!g.user.consentAt) return 'no_consent';
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
  try {
    const deny = await allowed(user);
    if (deny) return json({ error: deny }, 403);
    if (action === 'profile') return json({ ...(await getProfile(user.uid)), name: user.name });
    if (action === 'boot') { // เปิดเว็บครั้งแรก: ดึงหมวด + รายการเดือนนี้ในครั้งเดียว
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!isDate(from) || !isDate(to)) return json({ error: 'bad date' }, 400);
      const [profile, entries] = await Promise.all([getProfile(user.uid), listEntries(user.uid, from, to)]);
      later(compactOld(user.uid, bkkDate())); // รวมข้อมูลเก่า เดือนละครั้ง (ทำหลังตอบ)
      return json({ profile: { ...profile, name: user.name }, entries, session: makeSession(user) });
    }
    if (action === 'entries') {
      const from = url.searchParams.get('from'), to = url.searchParams.get('to');
      if (!isDate(from) || !isDate(to)) return json({ error: 'bad date' }, 400);
      return json({ entries: await listEntries(user.uid, from, to) });
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
  const user = await auth(request);
  if (!user) return json({ error: 'unauthorized' }, 401);
  try {
    const deny = await allowed(user);
    if (deny) return json({ error: deny }, 403);
    const { action, ...b } = await request.json();
    if (action === 'add') return json({ entries: await addEntries(user.uid, [b.entry]) });
    if (action === 'update') return json({ entry: await updateEntry(user.uid, String(b.id), b.entry) });
    if (action === 'delete') return json({ deleted: await deleteEntries(user.uid, [String(b.id)]) });
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
