import { UserRole } from '../types';

export function normalizeRole(role: string | undefined | null): UserRole {
  if (!role) return 'guest';
  const lower = role.toLowerCase();
  
  if (lower === 'super_admin' || lower === 'superadmin') return 'super_admin';
  if (lower === 'admin' || lower === 'administrator') return 'admin';
  if (lower === 'tanod' || lower === 'responder') return 'tanod';
  if (lower === 'resident') return 'resident';
  
  return 'guest';
}
