import { describe, it, expect } from 'vitest';
import { normalizeRole, isTanodOrAbove, isAdminOrAbove } from '../server/utils/roleUtils';

describe('normalizeRole', () => {
  it('lowercases uppercase role strings', () => {
    expect(normalizeRole('TANOD')).toBe('tanod');
    expect(normalizeRole('ADMIN')).toBe('admin');
    expect(normalizeRole('CAPTAIN')).toBe('captain');
    expect(normalizeRole('SUPERADMIN')).toBe('superadmin');
    expect(normalizeRole('RESIDENT')).toBe('resident');
  });

  it('passes through already-lowercase roles unchanged', () => {
    expect(normalizeRole('tanod')).toBe('tanod');
    expect(normalizeRole('admin')).toBe('admin');
    expect(normalizeRole('resident')).toBe('resident');
  });

  it('falls back to resident for empty string', () => {
    expect(normalizeRole('')).toBe('resident');
  });
});

describe('isTanodOrAbove', () => {
  it('returns true for tanod and all higher roles', () => {
    expect(isTanodOrAbove('tanod')).toBe(true);
    expect(isTanodOrAbove('TANOD')).toBe(true);
    expect(isTanodOrAbove('admin')).toBe(true);
    expect(isTanodOrAbove('ADMIN')).toBe(true);
    expect(isTanodOrAbove('superadmin')).toBe(true);
    expect(isTanodOrAbove('SUPERADMIN')).toBe(true);
    expect(isTanodOrAbove('captain')).toBe(true);
    expect(isTanodOrAbove('CAPTAIN')).toBe(true);
  });

  it('returns false for resident and unknown roles', () => {
    expect(isTanodOrAbove('resident')).toBe(false);
    expect(isTanodOrAbove('RESIDENT')).toBe(false);
    expect(isTanodOrAbove('')).toBe(false);
    expect(isTanodOrAbove('unknown')).toBe(false);
  });
});

describe('isAdminOrAbove', () => {
  it('returns true for admin, superadmin, and captain', () => {
    expect(isAdminOrAbove('admin')).toBe(true);
    expect(isAdminOrAbove('ADMIN')).toBe(true);
    expect(isAdminOrAbove('superadmin')).toBe(true);
    expect(isAdminOrAbove('SUPERADMIN')).toBe(true);
    expect(isAdminOrAbove('captain')).toBe(true);
    expect(isAdminOrAbove('CAPTAIN')).toBe(true);
  });

  it('returns false for tanod and resident', () => {
    expect(isAdminOrAbove('tanod')).toBe(false);
    expect(isAdminOrAbove('TANOD')).toBe(false);
    expect(isAdminOrAbove('resident')).toBe(false);
    expect(isAdminOrAbove('')).toBe(false);
  });
});
