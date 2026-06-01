import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, GeoPoint, DocumentReference } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const configPath = path.resolve(__dirname, '../firebase-applet-config.json');
let db;

function init() {
  try {
    const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
    const app = getApps().length === 0 
      ? initializeApp({ projectId: config.projectId })
      : getApp();
    
    db = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(config.firestoreDatabaseId)
      : getFirestore();
  } catch (e) {
    console.error("Initialization error:", e.message);
    process.exit(1);
  }
}

init();

const SERIALIZED_TYPES = {
  TIMESTAMP: '__timestamp__',
  GEOPOINT: '__geopoint__',
  REFERENCE: '__reference__'
};

/**
 * Recursively serializes Firestore data types for JSON storage
 */
function serializeData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  // Handle Firestore specific types
  if (data instanceof Timestamp) {
    return { [SERIALIZED_TYPES.TIMESTAMP]: data.toMillis() };
  }
  if (data instanceof GeoPoint) {
    return { [SERIALIZED_TYPES.GEOPOINT]: { lat: data.latitude, lng: data.longitude } };
  }
  if (data instanceof DocumentReference) {
    return { [SERIALIZED_TYPES.REFERENCE]: data.path };
  }
  
  // Date fallback
  if (data instanceof Date) {
    return { [SERIALIZED_TYPES.TIMESTAMP]: data.getTime() };
  }

  const serialized = {};
  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeData(value);
  }
  return serialized;
}

/**
 * Recursively restores Firestore data types from JSON storage
 */
function deserializeData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(deserializeData);
  }

  if (data[SERIALIZED_TYPES.TIMESTAMP]) {
    return Timestamp.fromMillis(data[SERIALIZED_TYPES.TIMESTAMP]);
  }
  if (data[SERIALIZED_TYPES.GEOPOINT]) {
    return new GeoPoint(data[SERIALIZED_TYPES.GEOPOINT].lat, data[SERIALIZED_TYPES.GEOPOINT].lng);
  }
  if (data[SERIALIZED_TYPES.REFERENCE]) {
    return db.doc(data[SERIALIZED_TYPES.REFERENCE]);
  }

  const deserialized = {};
  for (const [key, value] of Object.entries(data)) {
    deserialized[key] = deserializeData(value);
  }
  return deserialized;
}

/**
 * Recursively fetches documents and their subcollections
 */
async function getCollectionData(collectionPath) {
  console.log(`Reading collection: ${collectionPath}`);
  const snapshot = await db.collection(collectionPath).get();
  const data = {};

  for (const doc of snapshot.docs) {
    const docData = doc.data();
    const subcollections = await doc.ref.listCollections();
    const subData = {};

    for (const sub of subcollections) {
      subData[sub.id] = await getCollectionData(`${collectionPath}/${doc.id}/${sub.id}`);
    }

    data[doc.id] = {
      _data: serializeData(docData),
      _subcollections: subData
    };
  }

  return data;
}

/**
 * Recursively restores documents and their subcollections
 */
async function setCollectionData(collectionPath, data) {
  const batch = db.batch();
  let count = 0;

  for (const [docId, docContent] of Object.entries(data)) {
    const docRef = db.collection(collectionPath).doc(docId);
    batch.set(docRef, deserializeData(docContent._data));
    count++;

    if (docContent._subcollections) {
      for (const [subId, subData] of Object.entries(docContent._subcollections)) {
        await setCollectionData(`${collectionPath}/${docId}/${subId}`, subData);
      }
    }
    
    // Firestore batch limit is 500
    if (count >= 400) {
      await batch.commit();
      console.log(`Committed batch for ${collectionPath}`);
      // Start new batch (count reset handled by loop finishing or simple reset)
    }
  }

  await batch.commit();
  console.log(`Restored collection: ${collectionPath}`);
}

async function run() {
  const [,, command, targetPath] = process.argv;

  if (command === 'export') {
    const collections = await db.listCollections();
    const backup = {};

    for (const col of collections) {
      backup[col.id] = await getCollectionData(col.id);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `firebase-backup-${timestamp}.json`;
    const exportDir = path.resolve(__dirname, '../firebase-exports');
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir);
    }

    fs.writeFileSync(path.join(exportDir, fileName), JSON.stringify(backup, null, 2));
    console.log(`✅ Exported to firebase-exports/${fileName}`);
  } 
  else if (command === 'import') {
    if (!targetPath) {
      console.error("Usage: node scripts/firebase-migration.js import <path-to-json>");
      process.exit(1);
    }

    const backup = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), targetPath), 'utf8'));
    console.log(`🚀 Starting import from ${targetPath}...`);

    for (const [colId, colData] of Object.entries(backup)) {
      await setCollectionData(colId, colData);
    }

    console.log("🎉 Import completed successfully!");
  } else {
    console.log("Usage:");
    console.log("  node scripts/firebase-migration.js export");
    console.log("  node scripts/firebase-migration.js import <path>");
    process.exit(1);
  }
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
