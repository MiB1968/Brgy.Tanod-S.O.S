/**
 * firebase.ts — Single source of truth for Firebase client initialization.
 * Import `auth`, `db`, and `firebaseApp` from here everywhere.
 * Never call initializeApp() in any other file.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// ── Config ────────────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyFakeKeyForLocalDevelopmentAndPreview",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "brgy-tanod-sos.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "brgy-tanod-sos.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:1234567890",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || '(default)'
};

// ── Singleton init ────────────────────────────────────────────────────────────
// getApps().length prevents "App already exists" crash when HMR re-runs this module.
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId || '(default)');
export const messaging = typeof window !== "undefined" && firebaseConfig.messagingSenderId ? getMessaging(firebaseApp) : null;
export { firebaseApp, getToken, onMessage };

// ── Offline persistence (client-only) ────────────────────────────────────────
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Persistence failed: multiple tabs open.');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Persistence not supported in this browser.');
    }
  });
}
