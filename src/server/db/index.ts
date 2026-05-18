// src/server/db/index.ts
import admin from 'firebase-admin';
import { config } from '../config/index';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl || undefined,
  ssl: (!config.databaseUrl || config.databaseUrl.includes('localhost') || config.databaseUrl.includes('127.0.0.1')) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });

export const query = (text: string, params?: any[]) => {
  if (!config.databaseUrl) {
    throw new Error('Database not configured. Operation aborted.');
  }
  return pool.query(text, params);
};
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

let firebaseDb: admin.firestore.Firestore;

export const initDatabase = (): admin.firestore.Firestore | null => {
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: config.firebase.projectId,
        // For production: use service account credentials
        // credential: admin.credential.cert({...})
      });
      console.log('[DB] Firebase app initialized successfully');
    }

    if (!firebaseDb) {
      firebaseDb = admin.firestore();
      firebaseDb.settings({
        ignoreUndefinedProperties: true,
      });
      console.log('[DB] Firebase Firestore initialized successfully');
    }
    
    return firebaseDb;
  } catch (err) {
    console.error('CRITICAL: Firebase admin initialization failed! Server will run, but Firebase features will break.', err);
    return null as any;
  }
};

export const getDb = (): admin.firestore.Firestore => {
  if (!firebaseDb) {
    const db = initDatabase();
    if (!db) {
      // Return a proxy that logs errors instead of crashing if the dev forgot config
      console.error('[DB] Firestore not initialized. API calls will fail.');
      return {
        collection: () => { throw new Error('Firestore not initialized. Check FIREBASE_PROJECT_ID.'); },
        doc: () => { throw new Error('Firestore not initialized. Check FIREBASE_PROJECT_ID.'); },
      } as any;
    }
    firebaseDb = db;
  }
  return firebaseDb;
};

// Export admin for advanced usage if needed
export { admin };
