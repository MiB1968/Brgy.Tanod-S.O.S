import { describe, it, expect } from 'vitest';
import { isValidCoord } from './utils';

describe('isValidCoord', () => {
  it('should return true for valid coordinates', () => {
    expect(isValidCoord(14.5995, 120.9842)).toBe(true);
    expect(isValidCoord('14.5995', '120.9842')).toBe(true);
    expect(isValidCoord(-90, -180)).toBe(true);
    expect(isValidCoord(90, 180)).toBe(true);
  });

  it('should return false for invalid coordinates', () => {
    expect(isValidCoord(NaN, NaN)).toBe(false);
    expect(isValidCoord('invalid', 'invalid')).toBe(false);
    expect(isValidCoord(undefined, undefined)).toBe(false);
    expect(isValidCoord(null, null)).toBe(false);
    expect(isValidCoord({}, {})).toBe(false);
    expect(isValidCoord([], [])).toBe(false);
    expect(isValidCoord('', '')).toBe(false);

    // Partial valid
    expect(isValidCoord(14.5995, 'invalid')).toBe(false);
    expect(isValidCoord('invalid', 120.9842)).toBe(false);
  });

  it('should return false for edge case (0, 0) as per implementation', () => {
    expect(isValidCoord(0, 0)).toBe(false);
    expect(isValidCoord('0', '0')).toBe(false);
    // Note: The implementation also returns false if just one is 0.
    // e.g. isValidCoord(0, 120) => nLat !== 0 && nLng !== 0 => false
    expect(isValidCoord(0, 120.9842)).toBe(false);
    expect(isValidCoord(14.5995, 0)).toBe(false);
  });
});
