/**
 * src/utils/crypto.ts
 *
 * FIX BATCH — CRIT-02 + CRIT-04
 *
 * Changes from original:
 *   1. encryptField / decryptField now accept `string | null | undefined`.
 *      Passing null/undefined returns null instead of crashing cipher.update().
 *      This aligns the implementation with the test contract in
 *      src/tests/encryption.test.ts (line 25: expect(encryptField(null)).toBeNull()).
 *
 *   2. SECRET_KEY is now read from config.encryptionKey (the single source of
 *      truth) instead of re-reading process.env.ENCRYPTION_KEY directly.
 *      Previously config/index.ts generated a random fallback key on startup,
 *      but crypto.ts ignored it and used the hardcoded weak string
 *      'a-very-secret-key-that-should-be-32-chars-long' as its own fallback.
 *      Both files reading the env var independently caused split-brain
 *      encryption on any deployment where ENCRYPTION_KEY is unset.
 *
 *   3. decryptField also returns null for null/undefined input, and gracefully
 *      returns the raw value unchanged if it does not look like an encrypted
 *      string (no ':' separator), matching the test expectation on line 31.
 *
 *   4. Both functions support JSON-serializable inputs (objects, arrays) by
 *      JSON-stringifying before encrypt and JSON-parsing after decrypt when
 *      the decrypted string looks like JSON. This matches the test cases on
 *      lines 14–20 and 35–37.
 *
 * No callers need to change — the function signatures are backward-compatible.
 */

import nodeCrypto from 'node:crypto';
import { config } from '../server/config/index';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

// Single source of truth: use the key from config, which already handles the
// random-fallback logic and warns ops when the env var is missing.
// .slice(0, 32) ensures exactly 32 bytes for AES-256 regardless of key length.
function getKey(): Buffer {
  return Buffer.from(config.encryptionKey.slice(0, 32), 'utf8');
}

/**
 * Encrypts a value for storage. Returns null for null/undefined inputs.
 * Non-string values are JSON-serialized before encryption so arrays and
 * objects round-trip correctly through decryptField.
 */
export function encryptField(text: string | null | undefined): string | null {
  if (text === null || text === undefined) return null;

  // Serialize non-string types so objects/arrays survive the round-trip.
  const plaintext = typeof text === 'string' ? text : JSON.stringify(text);

  const iv = nodeCrypto.randomBytes(IV_LENGTH);
  const cipher = nodeCrypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a value from storage. Returns null for null/undefined inputs.
 * Returns the raw value unchanged if it does not look like an encrypted
 * string (i.e. has no ':' separator), so unencrypted legacy rows don't crash.
 * Attempts JSON.parse on the decrypted string so objects/arrays are
 * returned as their original type.
 */
export function decryptField(text: string | null | undefined): any {
  if (text === null || text === undefined) return null;

  // If the value was never encrypted (e.g. a legacy row), return as-is.
  if (!text.includes(':')) return text;

  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = nodeCrypto.createDecipheriv(ALGORITHM, getKey(), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    const str = decrypted.toString('utf8');

    // Attempt JSON parse so objects/arrays come back as their original type.
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  } catch {
    // Decryption failed (wrong key, corrupted data). Return null rather than
    // crashing the request — callers must handle null gracefully.
    return null;
  }
}
