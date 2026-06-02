/**
 * firebase.ts — Single source of truth for Firebase client initialization.
 * Import `auth`, `db`, and `firebaseApp` from here everywhere.
 * Never call initializeApp() in any other file.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// ── Singleton init ────────────────────────────────────────────────────────────
// getApps().length prevents "App already exists" crash when HMR re-runs this module.
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);

// Configure Auth persistence to browserLocalPersistence to prevent sessionStorage partitioning issues on mobile devices
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Failed to set local storage persistence:', err);
});

export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId);

export let messaging: any = null;
isSupported().then(supported => {
  if (supported) {
      try {
        messaging = getMessaging(firebaseApp);
      } catch (err) {
        console.warn('[Firebase] Messaging failed to initialize:', err);
      }
  }
});

export { firebaseApp };
