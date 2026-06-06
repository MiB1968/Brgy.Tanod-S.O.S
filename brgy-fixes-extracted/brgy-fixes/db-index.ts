/**
 * src/server/db/index.ts
 *
 * FIX — HIGH-DB-SILENT-ERRORS
 *
 * Bug: The pool.query monkey-patch SILENTLY swallowed ALL real database
 * errors by catching every exception and returning { rows: [] }.
 *
 * This meant:
 *   - Auth failures in the DB → silently return empty rows → user not found → wrong 401
 *   - Constraint violations → silently ignored → duplicate data inserted
 *   - Connection pool exhaustion → silently returns empty → app appears to work but data is lost
 *   - Any query that expects rows (e.g. "SELECT ... WHERE id = $1") → gets [] → caller
 *     treats it as "not found" when the real error was a network timeout
 *
 * Fix: Only suppress errors when DATABASE_URL is explicitly not configured
 * (the "mock/offline" intent). When DATABASE_URL IS set, real errors must
 * propagate so callers can handle them correctly (return 500, retry, etc.).
 *
 * This is a DROP-IN REPLACEMENT for src/server/db/index.ts.
 * All exports (pool, db, query, getClient, checkConnection, initDatabase,
 * getDb, admin) are identical.
 */

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
  ssl: (
    !config.databaseUrl ||
    config.databaseUrl.includes('localhost') ||
    config.databaseUrl.includes('127.0.0.1')
  ) ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  query_timeout: 60000,
});

// ── FIX: Only mock when DATABASE_URL is absent; propagate real errors otherwise ──
//
// BEFORE (buggy):
//   (pool as any).query = function (text, params) {
//     if (!config.databaseUrl) { return Promise.resolve({ rows: [] }); }
//     return originalQuery(text, params).catch(e => {
//       console.error(`[DB pool.query Error] ${e.message}`);
//       return { rows: [] };  // ← silently swallowed ALL real errors
//     });
//   };
//
// AFTER: real errors throw so callers get 500 / can retry properly.
if (!config.databaseUrl) {
  const originalQuery = pool.query.bind(pool);
  (pool as any).query = function (text: any, params: any) {
    console.warn(
      `[DB Mock] Intercepted pool.query (DATABASE_URL not set): ${
        typeof text === 'string' ? text.slice(0, 60) : ''
      }...`
    );
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}
// When DATABASE_URL IS set, pool.query is the real pg Pool.query — errors throw.

pool.on('error', (err) => {
  console.error('[DB] Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });

// ── query helper — same fix: only mock when DATABASE_URL is absent ────────────
export const query = (text: string, params?: any[]) => {
  if (!config.databaseUrl) {
    console.warn(
      `[DB Mock] query() intercepted (DATABASE_URL not set): ${text.slice(0, 60)}...`
    );
    return Promise.resolve({ rows: [], rowCount: 0 });
  }
  // Let real errors propagate — do NOT catch here
  return pool.query(text, params);
};

export const getClient = async () => {
  if (!config.databaseUrl) {
    return {
      query: async () => ({ rows: [], rowCount: 0 }),
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

// ── Firebase Admin ────────────────────────────────────────────────────────────
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
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    const cleanMsg = rawMsg.includes('<') ? rawMsg.split('<')[0].trim() : rawMsg;
    console.error('CRITICAL: Firebase admin initialization failed!', cleanMsg);
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
