import { describe, it, expect } from 'vitest';
import { isRuben } from '../constants';

describe('isRuben', () => {
  it('returns true for authorized super admin UIDs', () => {
    expect(isRuben('G6fWn6Crv1Yh2Tz9fSreFmX3G1r1')).toBe(true);
    expect(isRuben('v1')).toBe(true);
    expect(isRuben('anonymous_admin_demo')).toBe(true);
  });

  it('returns false for unauthorized UIDs', () => {
    expect(isRuben('user123')).toBe(false);
    expect(isRuben('malicious_admin')).toBe(false);
    expect(isRuben('admin')).toBe(false);
  });

  it('returns false for undefined UID', () => {
    expect(isRuben()).toBe(false);
    expect(isRuben(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isRuben('')).toBe(false);
  });
});
