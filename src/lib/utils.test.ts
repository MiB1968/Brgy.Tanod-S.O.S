import { describe, it, expect } from 'vitest';
import { formatMobileNumber, formatIdNumber } from './utils';

describe('formatMobileNumber', () => {
  it('formats partial mobile number', () => {
    expect(formatMobileNumber('0912')).toBe('0912');
    expect(formatMobileNumber('09123')).toBe('0912-3');
    expect(formatMobileNumber('0912345')).toBe('0912-345');
    expect(formatMobileNumber('09123456789')).toBe('0912-345-6789');
  });

  it('strips non-digits', () => {
    expect(formatMobileNumber('09a12b3')).toBe('0912-3');
  });

  it('limits to 11 digits', () => {
    expect(formatMobileNumber('09123456789000')).toBe('0912-345-6789');
  });
});

describe('formatIdNumber', () => {
  it('formats partial ID number', () => {
    expect(formatIdNumber('1234')).toBe('1234');
    expect(formatIdNumber('12345')).toBe('1234-5');
    expect(formatIdNumber('123456789012')).toBe('1234-5678-9012');
  });

  it('strips non-alphanumeric characters and capitalizes', () => {
    expect(formatIdNumber('12-ab_3')).toBe('12AB-3');
  });

  it('limits to 12 characters', () => {
    expect(formatIdNumber('123456789012345')).toBe('1234-5678-9012');
  });
});
