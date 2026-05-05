import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const isConfigEmpty = !firebaseConfig.apiKey || firebaseConfig.apiKey === "";

let app;
let db: any;
let auth: any;

if (!isConfigEmpty) {
  app = initializeApp(firebaseConfig);
  // Use initializeFirestore with experimentalAutoDetectLongPolling to prevent iframe connection drops
  db = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, firebaseConfig.firestoreDatabaseId);
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
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.warn("Firebase client is currently offline. Retrying in background.");
      } else if (error.message.includes('Missing or insufficient permissions')) {
        // This is expected before login
        console.debug("Firebase connection successful, but user needs to authenticate.");
      }
    }
  }
}
testConnection();