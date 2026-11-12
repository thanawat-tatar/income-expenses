// หลังบ้านของเจ้าของระบบ (เปิดได้เฉพาะ LINE ที่ตรงกับ ADMIN_UID ใน Vercel)
// ไม่ส่งยอดเงินหรือรายการของผู้ใช้คนไหนเลย
import { authUser } from '../lib/line.js';
import { isAdmin, adminOverview, setLimit, deleteUserData, removeExpired } from '../lib/access.js';

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

async function admin(request) {
  const user = await authUser(request);
  if (!user) return { err: json({ error: 'unauthorized' }, 401) };
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
    const b = await request.json();
    if (b.action === 'limit') return json({ limit: await setLimit(b.limit) });
    if (b.action === 'delete') {
      const id = String(b.id || '');
      if (!id || id === user.uid) return json({ error: 'ลบบัญชีตัวเองจากหน้านี้ไม่ได้' }, 400);
      await deleteUserData(id);
      return json({ ok: true });
    }
    if (b.action === 'cleanup') return json({ removed: await removeExpired(50) });
    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: e.message }, 400);
  }
}
