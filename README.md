# สมุดรายรับรายจ่าย (LINE + เว็บ) — คู่มือติดตั้ง

ใช้ฟรีทั้งหมด: GitHub (เก็บโค้ด) · Vercel (เว็บ + ตัวรับข้อความ) · Firebase Firestore (ฐานข้อมูล) · LINE OA (แชท) · LIFF (เปิดเว็บในไลน์)

## โครงสร้างไฟล์
```
api/webhook.js   รับข้อความจาก LINE แล้วตอบกลับ
api/data.js      API ให้หน้าเว็บอ่าน/เขียนข้อมูล
lib/             parser (แยกคำ), categories (หมวด+คำ), store (ฐานข้อมูล), messages (ข้อความตอบกลับ)
public/          หน้าเว็บ (index.html, style.css, app.js)
```
ทดลองหน้าเว็บโดยไม่ต้องต่ออะไร: `https://<เว็บของคุณ>/?demo=1`

---

## ขั้น 1 — Firebase (ฐานข้อมูล)
1. https://console.firebase.google.com → โปรเจกต์ **income-expense**
2. เมนูซ้าย **Build → Firestore Database → Create database** → เลือกที่ตั้ง `asia-southeast1` → **Start in production mode**
3. ⚙️ (Project settings) → แท็บ **Service accounts** → **Generate new private key** → ได้ไฟล์ `.json`
   - เปิดไฟล์ด้วย Notepad คัดลอก **ทั้งหมด** เก็บไว้ (ขั้น 4) — ห้ามแชร์ไฟล์นี้ให้ใคร และห้ามอัปขึ้น GitHub

## ขั้น 2 — LINE Messaging API (แชทบอท)
1. https://developers.line.biz/console → สร้าง Provider (ถ้ายังไม่มี) → เลือก Messaging API channel ของ OA คุณ
   - ถ้าไม่เจอ: เข้า https://manager.line.biz → OA ของคุณ → **ตั้งค่า → Messaging API → เปิดใช้งาน**
2. แท็บ **Basic settings** → คัดลอก **Channel secret**
3. แท็บ **Messaging API** → **Channel access token (long-lived) → Issue** → คัดลอก
4. ใน LINE OA Manager → **ตั้งค่าการตอบกลับ**: ปิด "ข้อความตอบกลับอัตโนมัติ", ปิด "ข้อความทักทาย" (ถ้าอยากให้บอทต้อนรับเอง), เปิด **Webhook**

## ขั้น 3 — LINE Login + LIFF (เปิดเว็บในไลน์)
1. ใน Provider เดียวกัน → **Create a new channel → LINE Login** (App types: เลือก **Web app**)
2. คัดลอก **Channel ID** (แท็บ Basic settings)
3. แท็บ **LIFF → Add**
   - Size: **Full**
   - Endpoint URL: `https://<เว็บของคุณ>.vercel.app/`
   - Scopes: ติ๊ก **openid** และ **profile**
   - Bot link feature: **On (Normal)**
4. คัดลอก **LIFF ID** (หน้าตา `1234567890-AbCdEfGh`)
5. ตั้ง channel เป็น **Published** (ปุ่มด้านบน) ไม่งั้นคนอื่นใช้ไม่ได้

## ขั้น 4 — Vercel (ใส่รหัสลับ)
Vercel → โปรเจกต์ **income-expense** → **Settings → Environment Variables** เพิ่ม 5 ตัว:

| Name | Value |
|---|---|
| `LINE_CHANNEL_SECRET` | Channel secret (ขั้น 2) |
| `LINE_CHANNEL_ACCESS_TOKEN` | Channel access token (ขั้น 2) |
| `LINE_LOGIN_CHANNEL_ID` | Channel ID ของ LINE Login (ขั้น 3) |
| `LIFF_ID` | LIFF ID (ขั้น 3) |
| `FIREBASE_SERVICE_ACCOUNT` | เนื้อหาไฟล์ .json ทั้งหมด (ขั้น 1) |

แล้วไป **Deployments → ⋯ → Redeploy** (ต้อง redeploy ทุกครั้งที่แก้ค่าพวกนี้)

## ขั้น 5 — ต่อ Webhook
LINE Developers → Messaging API channel → แท็บ **Messaging API**
- Webhook URL: `https://<เว็บของคุณ>.vercel.app/api/webhook` → **Verify** (ต้องขึ้น Success)
- เปิด **Use webhook**

## ขั้น 6 — Rich Menu (เมนูล่างในแชท)
LINE OA Manager → **หน้าหลัก → Rich menu → สร้าง** → เลือกเทมเพลต 3 ช่อง
| ช่อง | ประเภท | ค่า |
|---|---|---|
| เข้าสู่ระบบ | ลิงก์ | `https://liff.line.me/<LIFF_ID>` |
| ตั้งค่า | ลิงก์ | `https://liff.line.me/<LIFF_ID>?page=settings` |
| สรุปวันนี้ | ข้อความ | `สรุปวันนี้` |

รูปเมนู: ใช้ปุ่ม "สร้างรูปภาพ" ในหน้านั้นได้เลย

---

## ทดสอบ
แชทกับ OA พิมพ์ `น้ำมัน 60 ข้าว 50 ทิป 20` → กด **ยืนยัน** → กดเมนู **เข้าสู่ระบบ** ต้องเห็นรายการในเว็บ

## คำสั่งในแชท
- พิมพ์รายการ+เงิน (หลายรายการได้, ใส่ `เมื่อวาน` ได้)
- `สรุปวันนี้` · `ยกเลิก` · `วิธีใช้`

## ทำไมฟรี
- บอทใช้ **reply** อย่างเดียว (ฟรีไม่จำกัด) ไม่ใช้ push
- ไม่ใช้ AI — แยกคำด้วยพจนานุกรมใน `lib/categories.js` (เพิ่มคำได้ที่นั่น)
- Firestore ฟรี 50,000 อ่าน / 20,000 เขียน ต่อวัน; ดูรายปีอ่านแค่ 12 ครั้ง
