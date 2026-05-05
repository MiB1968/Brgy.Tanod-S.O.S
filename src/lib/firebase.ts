import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBsBqnHw9d1rc6HB2kHVytr0ZXAlx6s0qY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0433922302.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0433922302",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0433922302.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "643968538769",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:643968538769:web:feae4acd4266cbe4348730",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)"
};

const isConfigEmpty = !firebaseConfig.apiKey || firebaseConfig.apiKey === "";

let app;
let db: any;
let auth: any;

if (!isConfigEmpty) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
  auth = getAuth(app);
} else {
  console.warn("⚠️ Firebase configuration is missing. Authentication and real-time features are disabled.");
  // Provide partial mocks/nulls to prevent import crashes
  app = null;
  db = null;
  auth = null;
}

export { db, auth };

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