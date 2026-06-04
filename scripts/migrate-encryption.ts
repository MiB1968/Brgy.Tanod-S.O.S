import { pool } from '../src/server/db/index.js';
import { encryptField } from '../src/server/utils/crypto.js';

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
      // Temporary column to hold stringified data
      await pool.query('ALTER TABLE residents ADD COLUMN medical_conditions_temp TEXT');
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
    const { rows: residents } = await pool.query('SELECT id, blood_type, medical_conditions FROM residents');
    console.log(`[MIGRATION] Found ${residents.length} residents to migrate.`);

    // 4. Encrypt existing data and update records
    for (const resident of residents) {
      // Check if already encrypted (contains colon)
      const isBloodTypeEncrypted = resident.blood_type && resident.blood_type.includes(':');
      const isMedEncrypted = resident.medical_conditions && resident.medical_conditions.includes(':');

      const encryptedBloodType = isBloodTypeEncrypted ? resident.blood_type : encryptField(resident.blood_type);
      const encryptedMedicalConditions = isMedEncrypted ? resident.medical_conditions : encryptField(resident.medical_conditions);

      await pool.query(
        'UPDATE residents SET blood_type = $1, medical_conditions = $2 WHERE id = $3',
        [encryptedBloodType, encryptedMedicalConditions, resident.id]
      );
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
