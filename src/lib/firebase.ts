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
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

import firebaseConfig from '../../firebase-applet-config.json';

// Support safe fallback to Vite environment variables if JSON fields are empty or placeholder.
const finalConfig = {
  apiKey: firebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "MISSING_API_KEY",
  authDomain: firebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "missing-domain.firebaseapp.com",
  projectId: firebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "missing-project-id",
  storageBucket: firebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "missing-bucket.appspot.com",
  messagingSenderId: firebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: firebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  firestoreDatabaseId: firebaseConfig.firestoreDatabaseId || "(default)"
};

if (finalConfig.apiKey === "MISSING_API_KEY") {
  console.error("🚨 CRITICAL: Firebase configuration is missing! Ensure all VITE_FIREBASE_* environment variables are set in your deployment dashboard.");
}

// ── Singleton init ────────────────────────────────────────────────────────────
// getApps().length prevents "App already exists" crash when HMR re-runs this module.
const firebaseApp: FirebaseApp =
  getApps().length > 0 ? getApp() : initializeApp(finalConfig);

export let appCheck: AppCheck | null = null;

if (typeof window !== 'undefined') {
  // Use a debug token in development, or standard reCAPTCHA for production
  if (import.meta.env.DEV) {
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  
  try {
    appCheck = initializeAppCheck(firebaseApp, {
      provider: new ReCaptchaV3Provider(
        import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI' // Public sandbox key if not provided
      ),
      isTokenAutoRefreshEnabled: true
    });
  } catch (err) {
    console.warn('[Firebase] App Check initialization failed:', err);
  }
}

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

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export { firebaseApp };
