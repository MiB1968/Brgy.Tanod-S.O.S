export const USER_ROLES = {
  CITIZEN: "CITIZEN",
  TANOD: "TANOD",
  ADMIN: "ADMIN",
  CAPTAIN: "CAPTAIN",
} as const;

export const INCIDENT_STATUS = {
  PENDING: "PENDING",
  DISPATCHED: "DISPATCHED",
  RESPONDING: "RESPONDING",
  RESOLVED: "RESOLVED",
  CANCELLED: "CANCELLED",
} as const;

export const INCIDENT_TYPES = {
  MEDICAL: "MEDICAL",
  FIRE: "FIRE",
  CRIME: "CRIME",
  DISTURBANCE: "DISTURBANCE",
  NATURAL_DISASTER: "NATURAL_DISASTER",
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

  // General
  JOIN_INCIDENT_ROOM: "join_incident_room",
  LEAVE_INCIDENT_ROOM: "leave_incident_room",
} as const;
