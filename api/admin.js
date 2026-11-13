// หลังบ้านของเจ้าของระบบ (เปิดได้เฉพาะ LINE ที่ตรงกับ ADMIN_UID ใน Vercel)
// ไม่ส่งยอดเงินหรือรายการของผู้ใช้คนไหนเลย
import { authUser } from '../lib/line.js';
import { isAdmin, adminOverview, setLimit, deleteUserData, removeExpired } from '../lib/access.js';
import { getDb } from '../lib/firebase.js';
import { tooMany, readJson } from '../lib/guard.js';

// บันทึกประวัติทุกการกระทำในหลังบ้าน (ใคร ทำอะไร เมื่อไหร่)
const audit = (by, action, detail) => getDb().collection('audit').add({ at: Date.now(), by, action, detail: String(detail ?? '') }).catch(e => console.error('audit', e));

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function admin(request) {
  const user = await authUser(request);
  if (!user) return { err: json({ error: 'unauthorized' }, 401) };
  if (tooMany('a:' + user.uid, 60)) return { err: json({ error: 'ใช้งานถี่เกินไป' }, 429) };
  if (!isAdmin(user.uid)) return { err: json({ error: process.env.ADMIN_UID ? 'not_admin' : 'no_admin_uid' }, 403) };
  return { user };
}

export async function GET(request) {
  const { err, user } = await admin(request);
  if (err) return err;
  try { return json({ ...(await adminOverview()), me: user.uid }); } catch (e) { console.error(e); return json({ error: e.message }, 500); }
}

export async function POST(request) {
  const { err, user } = await admin(request);
  if (err) return err;
  try {
    const b = await readJson(request, 2000);
    if (!b) return json({ error: 'bad request' }, 400);
    if (b.action === 'limit') { const limit = await setLimit(b.limit); await audit(user.uid, 'limit', limit); return json({ limit }); }
    if (b.action === 'delete') {
      const id = String(b.id || '');
      if (!id || id === user.uid) return json({ error: 'ลบบัญชีตัวเองจากหน้านี้ไม่ได้' }, 400);
      await audit(user.uid, 'delete', id);
      await deleteUserData(id);
      return json({ ok: true });
    }
    if (b.action === 'cleanup') { const removed = await removeExpired(50); await audit(user.uid, 'cleanup', removed); return json({ removed }); }
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e.message }, 400);
  }
}
