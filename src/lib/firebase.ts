import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

try {
  if (firebaseConfig.apiKey === 'PLACEHOLDER') {
    throw new Error('Firebase API Key is still set to PLACEHOLDER. Please run set_up_firebase.');
  }

  app = initializeApp(firebaseConfig);
  
  // Initialize Firestore with specific database ID from config
  const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
  db = initializeFirestore(app, {
    ignoreUndefinedProperties: true
  }, dbId);
  
  auth = getAuth(app);
  // Ensure persistence is set, but catch potential errors in private browsing/incognito
  setPersistence(auth, indexedDBLocalPersistence).catch(err => {
    console.warn("Auth persistence failed:", err);
  });
  
  storage = getStorage(app);
} catch (err) {
  console.error("Firebase init failed:", err);
}

export { db, auth, storage };
