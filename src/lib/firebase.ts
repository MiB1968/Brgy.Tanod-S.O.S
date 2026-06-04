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
import { getStorage, FirebaseStorage } from 'firebase/storage';

import firebaseConfig from '../../firebase-applet-config.json';

const finalFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || "mock-key-for-local-build-only",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || "demo-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || "demo-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || "1:123456789:web:mockappid",
};

// ── Singleton init ────────────────────────────────────────────────────────────
// getApps().length prevents "App already exists" crash when HMR re-runs this module.
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(finalFirebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const storage: FirebaseStorage = getStorage(firebaseApp);

// Configure Auth persistence to browserLocalPersistence to prevent sessionStorage partitioning issues on mobile devices
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('[Firebase Auth] Failed to set local storage persistence:', err);
});

export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId || "(default)");

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
