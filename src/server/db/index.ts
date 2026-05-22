// src/server/db/index.ts
import { getFirestore } from 'firebase-admin/firestore';
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

const originalQuery = pool.query.bind(pool);
(pool as any).query = function (text: any, params: any) {
  if (!config.databaseUrl) {
    console.warn(`[DB Mock] Intercepted pool.query: ${typeof text === 'string' ? text.slice(0, 50) : ''}...`);
    return Promise.resolve({ rows: [] });
  }
  return originalQuery(text, params).catch(e => {
    console.error(`[DB pool.query Error] ${e.message}`);
    return { rows: [] };
  });
};

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });

export const query = (text: string, params?: any[]) => {
  if (!config.databaseUrl) {
    console.warn(`[DB Mock] Query intercepted due to missing DATABASE_URL: ${text.slice(0, 50)}...`);
    return Promise.resolve({ rows: [] });
  }
  return pool.query(text, params).catch(e => {
    console.error(`[DB Error] ${e.message}`);
    return { rows: [] };
  });
};
export const getClient = async () => {
  if (!config.databaseUrl) {
    return {
      query: async () => ({ rows: [] }),
      release: () => {},
    } as any;
  }
  return pool.connect();
};
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
      });
      console.log('[DB] Firebase app initialized successfully');
    }

    if (!firebaseDb) {
      const dbId = config.firebase.databaseId || '(default)';
      firebaseDb = getFirestore(admin.app(), dbId);
      firebaseDb.settings({
        ignoreUndefinedProperties: true,
      });
    }
    
    return firebaseDb;
  } catch (err) {
    console.error('CRITICAL: Firebase admin initialization failed!', err);
    return null as any;
  }
};

export const getDb = (): admin.firestore.Firestore => {
  if (!firebaseDb) {
    const db = initDatabase();
    if (!db) {
      console.error('[DB] Firestore not initialized.');
      return {
        collection: () => { throw new Error('Firestore not initialized.'); },
        doc: () => { throw new Error('Firestore not initialized.'); },
      } as any;
    }
    firebaseDb = db;
  }
  return firebaseDb;
};

export { admin };