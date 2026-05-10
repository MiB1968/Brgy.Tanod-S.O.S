// src/server/db/index.ts
import admin from 'firebase-admin';
import { config } from '../config/index';
// Retaining PostgreSQL pool to prevent immediate breakage of other services
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: false }
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export const checkConnection = async () => {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    return false;
  }
};

let db: admin.firestore.Firestore;

export const initDatabase = (): admin.firestore.Firestore => {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: config.firebase.projectId,
      // For production: use service account credentials
      // credential: admin.credential.cert({...})
    });
    
    db = admin.firestore();
    db.settings({
      ignoreUndefinedProperties: true,
    });

    console.log('[DB] Firebase Firestore initialized successfully');
  }
  return db;
};

export const getDb = (): admin.firestore.Firestore => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() in your server entry point.');
  }
  return db;
};

// Export admin for advanced usage if needed
export { admin };
