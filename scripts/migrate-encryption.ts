import { pool } from '../src/server/db/index.js';
import { encryptField, isEncrypted } from '../src/server/utils/crypto.js';

async function migrate() {
  console.log('[MIGRATION] Starting encryption-at-rest migration...');

  try {
    // 1. Check if medical_conditions is an array and needs conversion
    const typeCheck = await pool.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'residents' AND column_name = 'medical_conditions'
    `);

    const isArray = typeCheck.rows[0]?.data_type === 'ARRAY';

    if (isArray) {
      console.log('[MIGRATION] Converting medical_conditions from ARRAY to TEXT...');
      await pool.query('ALTER TABLE residents ADD COLUMN IF NOT EXISTS medical_conditions_temp TEXT');
      await pool.query('UPDATE residents SET medical_conditions_temp = array_to_string(medical_conditions, \',\')');
      await pool.query('ALTER TABLE residents DROP COLUMN medical_conditions');
      await pool.query('ALTER TABLE residents RENAME COLUMN medical_conditions_temp TO medical_conditions');
    }

    // 2. Add other missing columns
    console.log('[MIGRATION] Ensuring other columns exist...');
    await pool.query(`
      ALTER TABLE residents
      ADD COLUMN IF NOT EXISTS allergies TEXT,
      ADD COLUMN IF NOT EXISTS medications TEXT;
    `);

    // 3. Fetch all existing residents
    const { rows: residents } = await pool.query('SELECT id, blood_type, medical_conditions, allergies, medications FROM residents');
    console.log(`[MIGRATION] Found ${residents.length} residents to migrate.`);

    // 4. Encrypt existing data and update records
    for (const resident of residents) {
      const updates: Record<string, string | null> = {};
      const fields = ['blood_type', 'medical_conditions', 'allergies', 'medications'];

      for (const field of fields) {
        const value = resident[field];
        if (value && !isEncrypted(value)) {
          updates[field] = encryptField(value);
        }
      }

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map((f, i) => `${f} = $${i + 1}`).join(', ');
        await pool.query(
          `UPDATE residents SET ${setClause} WHERE id = $${Object.keys(updates).length + 1}`,
          [...Object.values(updates), resident.id]
        );
      }
    }

    console.log('[MIGRATION] Migration completed successfully.');
  } catch (err) {
    console.error('[MIGRATION] Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
