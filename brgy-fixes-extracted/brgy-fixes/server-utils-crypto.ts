/**
 * src/server/utils/crypto.ts
 *
 * FIX — BUG-CRYPTO-EMPTY
 *
 * Bug: This file was 0 bytes (empty). Any future server code that tries
 *   `import { encryptField } from '../utils/crypto'` would get undefined
 *   and crash silently or at runtime.
 *
 * The REAL crypto implementation lives at `src/utils/crypto.ts` (client-
 * compatible AES-256-CBC using Node's crypto module). Rather than duplicate
 * code, we re-export everything from there.
 *
 * This keeps a single implementation and a single source of truth for the
 * encryption key derivation logic (via config.encryptionKey).
 *
 * Callers in authController.ts and syncController.ts already correctly
 * import from '../../utils/crypto' — this file now covers the server-utils
 * path as well without duplication.
 */

export { encryptField, decryptField } from '../../utils/crypto';
