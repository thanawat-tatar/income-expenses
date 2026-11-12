import crypto from 'node:crypto';

export function verifySignature(body, signature) {
  if (!signature) return false;
  const hash = crypto.createHmac('sha256', process.env.LINE_CHANNEL_SECRET).update(body).digest();
  const sig = Buffer.from(signature, 'base64');
  return sig.length === hash.length && crypto.timingSafeEqual(sig, hash);
}

// ตอบกลับ (reply) ฟรีไม่จำกัด · ส่งเอง (push) ใช้แค่ตอนแจ้ง "ถึงคิวแล้ว" คนละครั้ง (กินโควต้าข้อความฟรีของ OA)
export async function reply(replyToken, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages: [].concat(messages).slice(0, 5) }),
  });
  if (!res.ok) console.error('LINE reply error', res.status, await res.text());
}

// ขึ้น "…" (กำลังพิมพ์) ในแชท หายเองเมื่อบอทตอบ (ฟรี ไม่กินโควต้า)
export async function showLoading(chatId) {
  const res = await fetch('https://api.line.me/v2/bot/chat/loading/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ chatId, loadingSeconds: 10 }),
  });
  if (!res.ok) console.error('LINE loading', res.status);
}

export async function push(to, messages) {
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
    body: JSON.stringify({ to, messages: [].concat(messages).slice(0, 5) }),
  });
  if (!res.ok) throw new Error(`LINE push ${res.status} ${await res.text()}`);
}

// ชื่อที่แสดงในไลน์ (ฟรี ไม่กินโควต้า) ใช้โชว์ในหลังบ้าน
export async function getName(uid) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${uid}`, { headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` } });
    return res.ok ? String((await res.json()).displayName || '').slice(0, 40) : '';
  } catch { return ''; }
}

// ตรวจ ID token จากเว็บ (LIFF) ว่าเป็นผู้ใช้ LINE จริง
// จำผลไว้ชั่วคราว ไม่ต้องถาม LINE ซ้ำทุกครั้ง (เว็บเร็วขึ้น)
const tokenCache = new Map();
export async function verifyIdToken(idToken) {
  if (!idToken) return null;
  const hit = tokenCache.get(idToken);
  if (hit && hit.until > Date.now()) return hit.user;
  const user = await verifyRemote(idToken);
  if (user) {
    if (tokenCache.size > 500) tokenCache.clear();
    tokenCache.set(idToken, { user, until: Math.min(Date.now() + 10 * 60 * 1000, user.exp * 1000) });
  }
  return user;
}

async function verifyRemote(idToken) {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: process.env.LINE_LOGIN_CHANNEL_ID }),
  });
  if (!res.ok) return null;
  const j = await res.json();
  return j.sub ? { uid: j.sub, name: j.name || '', exp: j.exp || 0 } : null;
}

// ---------- บัตรผ่านของระบบเอง (เว็บไม่ต้องถาม LINE ทุกครั้ง) ----------
// ออกให้หลังยืนยันกับ LINE แล้วเท่านั้น · เซ็นด้วยรหัสลับใน Vercel (ปลอมไม่ได้) · หมดอายุ 12 ชม.
const SESSION_MS = 12 * 3600 * 1000;
const sessKey = () => crypto.createHash('sha256').update('ie-session:' + process.env.LINE_CHANNEL_SECRET).digest();
const sign = payload => crypto.createHmac('sha256', sessKey()).update(payload).digest('base64url');

export function makeSession(user) {
  const exp = Date.now() + SESSION_MS;
  const payload = Buffer.from(JSON.stringify({ u: user.uid, n: user.name || '', e: exp })).toString('base64url');
  return { token: `${payload}.${sign(payload)}`, exp, uid: user.uid };
}

function readSession(token) {
  const [payload, sig] = String(token).split('.');
  if (!payload || !sig) return null;
  const good = Buffer.from(sign(payload)), got = Buffer.from(sig);
  if (good.length !== got.length || !crypto.timingSafeEqual(good, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return p.e > Date.now() && p.u ? { uid: p.u, name: p.n || '', viaSession: true } : null;
  } catch { return null; }
}

// ใช้ได้ทั้ง "Session <บัตรผ่าน>" และ "Bearer <ID token ของ LIFF>"
export async function authUser(request) {
  const h = request.headers.get('authorization') || '';
  if (/^Session\s+/i.test(h)) return readSession(h.replace(/^Session\s+/i, ''));
  return verifyIdToken(h.replace(/^Bearer\s+/i, ''));
}
