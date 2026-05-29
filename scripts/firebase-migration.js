import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to serialize Firestore data types
function serializeData(data) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  // Firestore Timestamp
  if (data instanceof admin.firestore.Timestamp) {
    return {
      __type__: 'timestamp',
      seconds: data.seconds,
      nanoseconds: data.nanoseconds
    };
  }

  // Firestore GeoPoint
  if (data instanceof admin.firestore.GeoPoint) {
    return {
      __type__: 'geopoint',
      latitude: data.latitude,
      longitude: data.longitude
    };
  }

  // Firestore DocumentReference
  if (data instanceof admin.firestore.DocumentReference) {
    return {
      __type__: 'reference',
      path: data.path
    };
  }

  // Plain object
  const serialized = {};
  for (const [key, value] of Object.entries(data)) {
    serialized[key] = serializeData(value);
  }
  return serialized;
}

// Helper to deserialize Firestore data types
function deserializeData(data, db) {
  if (data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(val => deserializeData(val, db));
  }

  if (data.__type__) {
    switch (data.__type__) {
      case 'timestamp':
        return new admin.firestore.Timestamp(data.seconds, data.nanoseconds);
      case 'geopoint':
        return new admin.firestore.GeoPoint(data.latitude, data.longitude);
      case 'reference':
        return db.doc(data.path);
    }
  }

  const deserialized = {};
  for (const [key, value] of Object.entries(data)) {
    deserialized[key] = deserializeData(value, db);
  }
  return deserialized;
}

async function exportCollection(collectionRef, collectionData) {
  const snapshot = await collectionRef.get();

  for (const doc of snapshot.docs) {
    const docData = serializeData(doc.data());
    const docObj = {
      id: doc.id,
      data: docData,
      subCollections: {}
    };

    // Export sub-collections
    const subCollections = await doc.ref.listCollections();
    for (const subColRef of subCollections) {
      docObj.subCollections[subColRef.id] = [];
      await exportCollection(subColRef, docObj.subCollections[subColRef.id]);
    }

    collectionData.push(docObj);
  }
}

async function exportData() {
  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account-old.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: firebase-service-account-old.json not found in root directory.');
    console.log('Please download the service account key for the old project and save it as firebase-service-account-old.json');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  }, 'old-project');

  const db = admin.firestore(admin.app('old-project'));
  const backup = {};

  const topLevelCollections = await db.listCollections();

  console.log('🚀 Starting recursive export from old project...');

  for (const colRef of topLevelCollections) {
    console.log(`📦 Exporting collection: ${colRef.id}...`);
    backup[colRef.id] = [];
    await exportCollection(colRef, backup[colRef.id]);
    console.log(`✅ Exported collection: ${colRef.id}`);
  }

  const exportDir = path.resolve(process.cwd(), 'firebase-exports');
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `firebase-backup-${timestamp}.json`;
  const filePath = path.join(exportDir, filename);

  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2));
  console.log(`\n🎉 Export complete! Data saved to: ${filePath}`);
}

async function importCollection(db, collectionRef, documents) {
  const BATCH_SIZE = 500;

  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const currentBatch = documents.slice(i, i + BATCH_SIZE);

    for (const doc of currentBatch) {
      const docRef = collectionRef.doc(doc.id);
      batch.set(docRef, deserializeData(doc.data, db));

      // Import sub-collections (separately to manage batch sizes)
      for (const [subColId, subColDocs] of Object.entries(doc.subCollections)) {
        await importCollection(db, docRef.collection(subColId), subColDocs);
      }
    }

    await batch.commit();
  }
}

async function importData(backupFilePath) {
  if (!backupFilePath) {
    console.error('❌ Error: Please provide the path to the backup file.');
    console.log('Usage: node scripts/firebase-migration.js import firebase-exports/firebase-backup-TIMESTAMP.json');
    process.exit(1);
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');

  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: firebase-service-account.json not found in root directory.');
    console.log('Please download the service account key for your NEW project and save it as firebase-service-account.json');
    process.exit(1);
  }

  const fullPath = path.resolve(process.cwd(), backupFilePath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ Error: Backup file not found at ${fullPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  const backup = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const db = admin.firestore();
  console.log('🚀 Starting recursive import to new project...');

  for (const [collectionId, documents] of Object.entries(backup)) {
    console.log(`📥 Importing collection: ${collectionId}...`);
    await importCollection(db, db.collection(collectionId), documents);
    console.log(`✅ Imported collection: ${collectionId}`);
  }

  console.log('\n🎉 Import complete!');
}

const command = process.argv[2];
const arg = process.argv[3];

if (command === 'export') {
  exportData().catch(err => {
    console.error('❌ Export failed:', err);
    process.exit(1);
  });
} else if (command === 'import') {
  importData(arg).catch(err => {
    console.error('❌ Import failed:', err);
    process.exit(1);
  });
} else {
  console.log('Usage:');
  console.log('  node scripts/firebase-migration.js export');
  console.log('  node scripts/firebase-migration.js import <path-to-backup-file>');
}
