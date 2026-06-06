/**
 * src/server/types/index.ts
 *
 * FIX — CRIT-TYPES-01
 *
 * Bug: UserRole and UserPayload used uppercase string literals
 *   ("CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN") that are completely
 *   disconnected from:
 *     - The actual database `role` column values ('resident', 'tanod', 'admin', 'super_admin')
 *     - src/types.ts UserRole ('resident' | 'tanod' | 'admin' | 'super_admin' | ...)
 *     - The RBAC roleHierarchy in auth.ts (keyed by lowercase)
 *     - The socketAuth.ts hack: `if (normalizedRole === "citizen") normalizedRole = "resident"`
 *
 * This caused:
 *   1. TypeScript accepted wrong role strings that fail DB lookups at runtime.
 *   2. requireRole / roleHierarchy lookups always returned 0 (undefined key)
 *      for any user authenticated through the server types.
 *   3. `CITIZEN` is not a role that exists anywhere in the system — it's `resident`.
 *   4. `super_admin`, `dispatcher`, `captain`, `guest` were completely missing.
 *
 * Fix: Align with src/types.ts and the actual DB schema. All roles lowercase.
 *
 * NOTE: The Incident.status field is also fixed from uppercase literals to
 * match the DB values used throughout the codebase.
 */

import { Socket } from "socket.io";

// ── Role ─────────────────────────────────────────────────────────────────────
// FIX: was "CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN" (all uppercase, wrong)
// Now matches: DB column values, src/types.ts, auth middleware roleHierarchy
export type UserRole =
  | "resident"
  | "tanod"
  | "admin"
  | "super_admin"
  | "captain"
  | "dispatcher"
  | "guest";

// ── Socket payload ────────────────────────────────────────────────────────────
export interface UserPayload {
  id: string;
  // FIX: was "CITIZEN" | "TANOD" | "ADMIN" | "CAPTAIN"
  role: UserRole;
  barangayId?: string;
  name?: string;
  phone?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: {
    user: UserPayload;
  };
}

// ── Location ─────────────────────────────────────────────────────────────────
export interface LocationUpdate {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  speed?: number;
}

// ── Incident ─────────────────────────────────────────────────────────────────
export interface Incident {
  id: string;
  reporterId: string;
  barangayId?: string;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  location?: any;
  // FIX: was uppercase "PENDING" | "DISPATCHED" | "RESPONDING" | "RESOLVED" | "CANCELLED"
  // Now matches DB values used throughout syncController and incidentService
  status: "pending" | "dispatched" | "responding" | "resolved" | "cancelled" | "needs_review";
  aiAnalysis?: any;
  createdAt: Date;
  updatedAt: Date;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "inactive" | "pending" | "suspended" | "verified";
  barangayId?: string;
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Barangay ─────────────────────────────────────────────────────────────────
export interface Barangay {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── Deprecated alias — kept for one-commit backward compatibility ─────────────
// Remove once all imports of UserRole from this file are updated.
/** @deprecated Use UserRole directly */
export type LegacyUserRole = UserRole;
