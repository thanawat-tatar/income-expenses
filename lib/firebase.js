import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

let db;
export function getDb() {
  if (!db) {
    if (!getApps().length) {
      const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      initializeApp({ credential: cert(sa) });
    }
    db = getFirestore();
    db.settings({ preferRest: true }); // เริ่มทำงานเร็วขึ้นบน Vercel
  }
  return db;
}

export { FieldValue };
