import { 
  pgTable, 
  text, 
  uuid, 
  timestamp, 
  boolean, 
  integer, 
  doublePrecision, 
  jsonb,
  serial,
  varchar
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('resident'),
  status: text('status').notNull().default('pending'),
  barangayId: text('barangay_id').default('default'),
  tokenVersion: integer('token_version').default(1).notNull(),
  firebaseUid: text('firebase_uid'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  lastActive: timestamp('last_active', { withTimezone: true }).defaultNow()
});

export const residents = pgTable('residents', {
  id: uuid('id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name'),
  phone: text('phone'),
  address: text('address'),
  houseNumber: text('house_number'),
  householdSize: integer('household_size').default(1),
  bloodType: text('blood_type'),
  medicalConditions: text('medical_conditions'),
  allergies: text('allergies'),
  medications: text('medications'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  gpsLat: doublePrecision('gps_lat'),
  gpsLng: doublePrecision('gps_lng'),
  selfieUrl: text('selfie_url'),
  status: text('status').default('pending'),
  isVerified: boolean('is_verified').default(false),
  verificationDate: timestamp('verification_date', { withTimezone: true }),
  rejectionReason: text('rejection_reason'),
  isOutsideBarangay: boolean('is_outside_barangay').default(false),
  lastLocationCheck: timestamp('last_location_check', { withTimezone: true }),
});

export const barangayBoundaries = pgTable('barangay_boundaries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  boundaryGeojson: jsonb('boundary_geojson').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientUuid: text('client_uuid').unique(),
  residentId: uuid('resident_id').references(() => users.id),
  type: text('type').notNull(),
  status: text('status').notNull().default('active'),
  barangayId: text('barangay_id').default('default'),
  location: jsonb('location').notNull(),
  description: text('description'),
  severityScore: integer('severity_score'),
  urgencyLevel: text('urgency_level'),
  responderRecommendations: jsonb('responder_recommendations'),
  aiAnalysis: jsonb('ai_analysis'),
  assignedTo: uuid('assigned_to'),
  assignedToName: text('assigned_to_name'),
  respondedBy: uuid('responded_by'),
  respondedByName: text('responded_by_name'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  responderNotes: text('responder_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true })
});

export const patrols = pgTable('patrols', {
  tanodId: uuid('tanod_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  tanodName: text('tanod_name'),
  isActive: boolean('is_active').default(false),
  location: jsonb('location'),
  status: text('status'),
  lastPing: timestamp('last_ping', { withTimezone: true }).defaultNow()
});

export const alertMessages = pgTable('alert_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').references(() => alerts.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').references(() => users.id),
  senderName: text('sender_name'),
  message: text('message').notNull(),
  type: text('type').default('text'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
});

export const systemConfig = pgTable('system_config', {
  key: text('key').primaryKey(),
  data: jsonb('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

export const systemBroadcasts = pgTable('system_broadcasts', {
  id: uuid('id').primaryKey().defaultRandom(),
  incidentId: uuid('incident_id').references(() => alerts.id),
  message: text('message').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  isActive: boolean('isactive').default(false),
  adminId: uuid('admin_id'),
  adminName: text('admin_name'),
  type: text('type'),
  approvalStatus: text('approval_status').default('pending'), // 'pending', 'approved', 'rejected'
  aiRecommendation: jsonb('ai_recommendation')
});

export const witnessInvites = pgTable('witness_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').references(() => alerts.id, { onDelete: 'cascade' }),
  witnessUserId: uuid('witness_user_id').references(() => users.id),
  status: text('status').notNull().default('pending'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
});

export const shifts = pgTable('shifts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tanodId: uuid('tanod_id').references(() => users.id, { onDelete: 'cascade' }),
  tanodName: text('tanod_name'),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  sector: text('sector'),
  status: text('status').default('scheduled'),
  tanodResponse: text('tanod_response').default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 100 }),
  metadata: jsonb('metadata').default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),

  // Legacy fields (kept for compatibility or gradual migration)
  incidentId: uuid('incident_id'),
  type: text('type'),
  status: text('status'),
  citizenId: uuid('citizen_id'),
  tanodAssigned: text('tanod_assigned'),
  locationLat: doublePrecision('location_lat'),
  locationLng: doublePrecision('location_lng'),
  notes: text('notes'),
  adminId: uuid('admin_id').references(() => users.id),
  targetTable: varchar('target_table', { length: 50 }),
  targetId: varchar('target_id', { length: 100 }),
  details: jsonb('details')
});

export const auditLogArchives = pgTable('audit_log_archives', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionDate: text('session_date').notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }).defaultNow(),
  archivedBy: text('archived_by'),
  logCount: integer('log_count').default(0),
  totalIncidents: integer('total_incidents').default(0),
  resolvedCount: integer('resolved_count').default(0),
  unresolvedCount: integer('unresolved_count').default(0),
  logEntries: jsonb('log_entries').default(sql`'[]'::jsonb`),
  notes: text('notes')
});

export const tanodActivityLogs = pgTable('tanod_activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tanodId: uuid('tanod_id').references(() => users.id, { onDelete: 'cascade' }),
  tanodName: text('tanod_name'),
  type: text('type'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
  details: text('details'),
  location: jsonb('location')
});

export const incidents = pgTable('incidents', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').references(() => alerts.id, { onDelete: 'set null' }),
  tanodId: uuid('tanod_id').references(() => users.id, { onDelete: 'set null' }),
  tanodName: text('tanod_name'),
  timestamp: timestamp('timestamp', { withTimezone: true }),
  type: text('type'),
  location: text('location'),
  gpsLocation: jsonb('gps_location'),
  description: text('description'),
  personsInvolved: text('persons_involved'),
  actionsTaken: text('actions_taken'),
  status: text('status'),
  citizenName: text('citizen_name'), // Added column
  barangayId: text('barangay_id').default('default'),
  assignedTo: uuid('assigned_to'),
  assignedToName: text('assigned_to_name'),
  respondedBy: uuid('responded_by'),
  respondedByName: text('responded_by_name'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolutionNotes: text('resolution_notes'),
  responderNotes: text('responder_notes'),
  adminOnDuty: uuid('admin_on_duty') // Added missing column too based on postSync query
});

export const patrolSessions = pgTable('patrol_sessions', {
  id: text('id').primaryKey(),
  tanodId: uuid('tanod_id').references(() => users.id, { onDelete: 'cascade' }),
  tanodName: text('tanod_name'),
  startTime: timestamp('start_time', { withTimezone: true }).defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }),
  route: jsonb('route').default(sql`'[]'::jsonb`)
});
