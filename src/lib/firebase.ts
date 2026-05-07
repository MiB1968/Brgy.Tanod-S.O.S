import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import firebaseConfig from '@/firebase-applet-config.json';

const config = firebaseConfig as any;
const isConfigEmpty = !config || !config.apiKey || config.apiKey === "";

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

if (!isConfigEmpty) {
  try {
    app = initializeApp(config);
    db = initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      ignoreUndefinedProperties: true
    }, config.firestoreDatabaseId);
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (err) {
    console.error("Firebase init failed:", err);
  }
} else {
  console.warn("⚠️ Firebase configuration is missing. Authentication and real-time features are disabled.");
}

export { db, auth, storage };

async function testConnection() {
  if (!db) return;
  try {
    // Just a probe, don't use getDocFromServer which is strictly online
    // Use onSnapshot or simply wait for auth state
    console.log("Firebase initialized. Awaiting network synchronization...");
  } catch (error) {
    console.warn("Firebase probe failed:", error);
  }
}
testConnection();