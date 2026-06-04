import { describe, it, expect } from 'vitest';
import { encryptField, decryptField } from '../server/utils/crypto';

describe('Encryption Utility', () => {
  it('should encrypt and decrypt a string', () => {
    const original = 'O+ Positive';
    const encrypted = encryptField(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted).toContain(':');

    const decrypted = decryptField(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should encrypt and decrypt an array (JSON serialization)', () => {
    const original = ['Diabetes', 'Hypertension'];
    const encrypted = encryptField(original);
    expect(typeof encrypted).toBe('string');

    const decrypted = decryptField(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('should return null for null/undefined', () => {
    expect(encryptField(null)).toBeNull();
    expect(encryptField(undefined)).toBeNull();
  });

  it('should return original value for non-encrypted strings in decryptField', () => {
    const raw = 'Not Encrypted';
    expect(decryptField(raw)).toBe(raw);
  });

  it('should handle complex objects', () => {
    const original = { key: 'value', nested: [1, 2, 3] };
    const encrypted = encryptField(original);
    const decrypted = decryptField(encrypted);
    expect(decrypted).toEqual(original);
  });
});
