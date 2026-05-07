import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Initialize with environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

try {
  app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true
  });
  auth = getAuth(app);
  setPersistence(auth, indexedDBLocalPersistence);
  storage = getStorage(app);
} catch (err) {
  console.error("Firebase init failed (ensure environment variables are set):", err);
}

export { db, auth, storage };

async function testConnection() {
  if (!db) return;
  try {
    console.log("Firebase initialized.");
  } catch (error) {
    console.warn("Firebase probe failed:", error);
  }
}
testConnection();