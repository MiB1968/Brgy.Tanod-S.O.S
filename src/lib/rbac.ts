import { UserRole } from '../types';

export const ROLES = {
  SUPER_ADMIN: 'super_admin' as UserRole,
  ADMIN: 'admin' as UserRole,
  TANOD: 'tanod' as UserRole,
  RESIDENT: 'resident' as UserRole,
  GUEST: 'guest' as UserRole,
};

export const canAccessAdmin = (role: string | null) => 
  role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

export const canAccessTanod = (role: string | null) => 
  role === ROLES.TANOD || role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

export const isResident = (role: string | null) =>
  role === ROLES.RESIDENT;

export const canManageResidents = (role: string | null) =>
  role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;

export const canBroadcast = (role: string | null) =>
  role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
