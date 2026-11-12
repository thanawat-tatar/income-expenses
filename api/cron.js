// Vercel เรียกวันละครั้ง (ตั้งใน vercel.json): ลบข้อมูลคนที่ไม่ได้ใช้งานเกิน 30 วัน เพื่อให้ที่คนรอคิว
import { removeExpired } from '../lib/access.js';

export async function GET(request) {
  // ถ้าตั้ง CRON_SECRET ใน Vercel ไว้ จะเช็คว่าเป็น Vercel เรียกจริง
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) return new Response('unauthorized', { status: 401 });
  const removed = await removeExpired(50);
  return Response.json({ removed });
}
