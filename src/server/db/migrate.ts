import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { pool } from './index';
import path from 'path';

/**
 * Replit/Monorepo Database Migration Runner
 * This allows programmatic schema deployment to your database.
 */
async function runMigrations() {
  console.log('[DB Migrate] Starting database migrations...');
  
  try {
    const db = drizzle(pool);
    // Point to the directory where drizzle-kit outputs migration SQL
    const migrationsFolder = path.resolve(process.cwd(), 'src/server/db/migrations');
    
    await migrate(db, { migrationsFolder });
    
    console.log('[DB Migrate] Migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[DB Migrate] Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
