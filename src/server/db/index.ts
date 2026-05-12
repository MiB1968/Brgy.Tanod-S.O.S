// src/server/db/index.ts
import admin from 'firebase-admin';
import { config } from '../config/index';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseUrl?.includes('localhost') ? false : { rejectUnauthorized: true },
  connectionTimeoutMillis: 5000,
  query_timeout: 10000,
});

export const db = drizzle(pool, { schema });

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

let firebaseDb: admin.firestore.Firestore;

export const initDatabase = (): admin.firestore.Firestore => {
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
};

export const getDb = (): admin.firestore.Firestore => {
  if (!firebaseDb) {
    firebaseDb = initDatabase();
  }
  return firebaseDb;
};

// Export admin for advanced usage if needed
export { admin };
