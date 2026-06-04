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

// Support safe fallback to Vite environment variables if JSON fields are empty or placeholder.
const finalConfig = {
  apiKey: firebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: firebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: firebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: firebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: firebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: firebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || "",
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)"
};

// ── Singleton init ────────────────────────────────────────────────────────────
// getApps().length prevents "App already exists" crash when HMR re-runs this module.
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(finalConfig);

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
}, finalConfig.firestoreDatabaseId);

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
