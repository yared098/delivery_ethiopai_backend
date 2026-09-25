import { readFileSync } from 'fs';
import { join } from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

export const FIREBASE_MESSAGING = 'FIREBASE_MESSAGING';

export const firebaseProvider = {
  provide: FIREBASE_MESSAGING,
  useFactory: (): Messaging => {
    if (!getApps().length) {
      // ── Option A: Load from JSON file (recommended) ──
      const jsonPath = join(
        process.cwd(),
        'secrets',
        'firebase-service-account.json',
      );

      let credential;
      try {
        const serviceAccount = JSON.parse(readFileSync(jsonPath, 'utf-8'));
        credential = cert(serviceAccount);
        console.log('🔥 Firebase Admin initialized (from JSON file)');
      } catch (err) {
        // ── Option B: Fallback to env vars ──
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(
          /\\n/g,
          '\n',
        );

        if (!projectId || !clientEmail || !privateKey) {
          throw new Error(
            'Missing Firebase credentials: neither secrets/firebase-service-account.json nor env vars found',
          );
        }

        credential = cert({ projectId, clientEmail, privateKey });
        console.log('🔥 Firebase Admin initialized (from env vars)');
      }

      initializeApp({ credential });
    }

    return getMessaging();
  },
};