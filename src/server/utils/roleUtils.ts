/**
 * Role Utility — Single Source of Truth
 *
 * All role comparisons in the codebase must use these helpers.
 * This eliminates the mixed-case role bug (TANOD vs tanod vs ADMIN vs admin)
 * that caused silent authorization failures in sockets and location handlers.
 */

export type AppRole = 'resident' | 'tanod' | 'admin' | 'super_admin' | 'captain';

/** Normalize any role string to lowercase AppRole. Falls back to 'resident'. */
export function normalizeRole(role: string): AppRole {
  return ((role?.toLowerCase()) || 'resident') as AppRole;
}

/**
 * Returns true for tanod, admin, super_admin, captain.
 * These roles can see the live map, respond to alerts, and join the responders room.
 */
export function isTanodOrAbove(role: string): boolean {
  const r = normalizeRole(role);
  return ['tanod', 'admin', 'super_admin', 'captain'].includes(r);
}

/**
 * Returns true for admin, super_admin, captain only.
 * These roles can manage users, view audit logs, and change system settings.
 */
export function isAdminOrAbove(role: string): boolean {
  const r = normalizeRole(role);
  return ['admin', 'super_admin', 'captain'].includes(r);
}
