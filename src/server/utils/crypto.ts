import crypto from 'crypto';
import { config } from '../config/index';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY = Buffer.from(config.encryptionKey, 'hex');

/**
 * Encrypts a field value.
 * Supports strings and JSON-serializable objects/arrays.
 * Returns a colon-separated string: iv:authTag:encryptedContent
 */
export function encryptField(value: any): string | null {
  if (value === null || value === undefined) return null;

  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

    const plainText = typeof value === 'string' ? value : JSON.stringify(value);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err: any) {
    console.error('[CRYPTO] Encryption failed:', err.message);
    return null;
  }
}

/**
 * Decrypts a field value.
 * Expects a colon-separated string: iv:authTag:encryptedContent
 * Attempts to parse the decrypted string as JSON if possible.
 */
export function decryptField(encryptedValue: string | null): any {
  if (!encryptedValue || typeof encryptedValue !== 'string' || !encryptedValue.includes(':')) {
    return encryptedValue;
  }

  try {
    const [ivHex, tagHex, contentHex] = encryptedValue.split(':');
    if (!ivHex || !tagHex || !contentHex) return encryptedValue;

    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

    decipher.setAuthTag(tag);

    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err: any) {
    console.error('[CRYPTO] Decryption failed:', err.message);
    return encryptedValue; // Return original value if decryption fails (e.g. if it wasn't encrypted)
  }
}
