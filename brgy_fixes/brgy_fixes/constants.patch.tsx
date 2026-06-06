/**
 * src/constants.tsx
 *
 * FIX BATCH — CRIT-01 (client-side / constants)
 *
 * Change from original:
 *   The isRuben() function contained a hardcoded check for
 *   'rubenlleg12@gmail.com' as a direct string comparison fallback.
 *   This personal email is removed. The function now relies exclusively
 *   on VITE_MASTER_EMAILS (set in your .env file at build time).
 *
 *   The function is renamed from isRuben() to isMasterAdmin() because
 *   it should not encode a person's name in the business logic.
 *
 *   IMPORTANT: Update the two callers after applying this file:
 *     src/components/NavigationSidebar.tsx  — change isRuben(...) to isMasterAdmin(...)
 *     src/hooks/useAppLogic.ts              — change `isRuben as checkIsRuben` import
 *
 *   Everything else in this file is unchanged (navItems, PATROL_TIMEOUT,
 *   MAMBURAO_CENTER, animation variants, etc.). Only the lines shown below
 *   are different. Copy and paste this entire file over src/constants.tsx.
 *
 * NOTE: This file contains only the changed export. All other exports that
 * were in your original constants.tsx must be preserved. If your file has
 * additional exports not shown here, keep them — this patch only replaces
 * the isRuben block.
 */

// ── CRIT-01 FIX: Personal email removed — env var only ──────────────────────
/**
 * Returns true if the given email appears in the VITE_MASTER_EMAILS build-time
 * environment variable. Used for client-side UI gating (e.g. showing the
 * super-admin panel). This does NOT replace server-side authorization — the
 * server enforces roles independently via the auth middleware.
 *
 * Set VITE_MASTER_EMAILS=your@email.com,other@email.com in your .env file.
 * Never hardcode email addresses in this function.
 */
export const isMasterAdmin = (uid?: string, email?: string): boolean => {
  const normalizedEmail = email?.toLowerCase().trim() || '';
  if (!normalizedEmail) return false;

  const masterEmailsRaw = (import.meta.env.VITE_MASTER_EMAILS || '').toLowerCase();
  if (!masterEmailsRaw) return false;

  const validEmails = masterEmailsRaw.split(',').map((e: string) => e.trim()).filter(Boolean);
  return validEmails.includes(normalizedEmail);
};

// Backward-compat alias so you can rename callers gradually.
// Remove this alias once NavigationSidebar.tsx and useAppLogic.ts are updated.
export const isRuben = isMasterAdmin;
