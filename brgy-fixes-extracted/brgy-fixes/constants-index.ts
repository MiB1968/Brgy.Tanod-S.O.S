/**
 * src/server/constants/index.ts
 *
 * FIX — MED-CONSTANTS-01
 *
 * Bug: USER_ROLES used uppercase values ("CITIZEN", "TANOD", "ADMIN", "CAPTAIN")
 * that do not match the actual database `role` column values ('resident',
 * 'tanod', 'admin', 'super_admin').
 *
 * Any code that compared req.user.role === USER_ROLES.CITIZEN would always
 * be false because the DB and auth middleware normalize to lowercase.
 *
 * Bug: USER_ROLES.CITIZEN doesn't map to any real role — the system uses
 * 'resident'. The mismatch persisted because socketAuth.ts had a special-case
 * hack: `if (normalizedRole === "citizen") normalizedRole = "resident"`.
 *
 * Fix: Lowercase values matching src/types.ts UserRole and the DB schema.
 * CITIZEN is replaced with RESIDENT. super_admin, dispatcher, guest added.
 *
 * NOTE: USER_ROLES.CITIZEN is kept as a deprecated alias pointing to
 * USER_ROLES.RESIDENT for backward compatibility during migration.
 * Remove it once all references are updated.
 */

export const USER_ROLES = {
  // FIX: was "CITIZEN" — no such role in DB or auth system
  RESIDENT: "resident",

  /** @deprecated Use USER_ROLES.RESIDENT — 'citizen' was never a DB role */
  CITIZEN: "resident",

  // FIX: was "TANOD" (uppercase) — DB stores lowercase 'tanod'
  TANOD: "tanod",

  // FIX: was "ADMIN" (uppercase) — DB stores lowercase 'admin'
  ADMIN: "admin",

  SUPER_ADMIN: "super_admin",

  // FIX: was "CAPTAIN" (uppercase) — DB stores lowercase 'captain'
  CAPTAIN: "captain",

  DISPATCHER: "dispatcher",

  GUEST: "guest",
} as const;

export const INCIDENT_STATUS = {
  // FIX: these were uppercase; DB/incidentService use lowercase
  PENDING: "pending",
  DISPATCHED: "dispatched",
  RESPONDING: "responding",
  RESOLVED: "resolved",
  CANCELLED: "cancelled",
  NEEDS_REVIEW: "needs_review",
} as const;

export const INCIDENT_TYPES = {
  MEDICAL: "MEDICAL",
  FIRE: "FIRE",
  CRIME: "CRIME",
  DISTURBANCE: "DISTURBANCE",
  NATURAL_DISASTER: "NATURAL_DISASTER",
  VIOLENCE: "VIOLENCE",
  FLOOD: "FLOOD",
  OTHER: "OTHER",
} as const;

export const SOCKET_EVENTS = {
  // Location
  LOCATION_UPDATE: "location_update",
  LOCATION_UPDATE_DELTA: "location_update_delta",
  LOCATION_REMOVE_DELTA: "location_remove_delta",

  // Incidents
  NEW_INCIDENT: "new_incident",
  INCIDENT_UPDATED: "incident_updated",
  INCIDENT_ASSIGNED: "incident_assigned",

  // SOS
  SOS_ALERT: "sos_alert",

  // Voice Assistant / JARVIS
  VOICE_RESPONSE: "VOICE_RESPONSE",
  JARVIS_ACTION_EXECUTED: "JARVIS_ACTION_EXECUTED",

  // General
  JOIN_INCIDENT_ROOM: "join_incident_room",
  LEAVE_INCIDENT_ROOM: "leave_incident_room",
} as const;
