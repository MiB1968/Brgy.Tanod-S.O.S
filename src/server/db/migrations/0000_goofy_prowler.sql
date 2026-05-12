CREATE TABLE "alert_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid,
	"sender_id" uuid,
	"sender_name" text,
	"message" text NOT NULL,
	"type" text DEFAULT 'text',
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resident_id" uuid,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"location" jsonb NOT NULL,
	"description" text,
	"severity_score" integer,
	"ai_analysis" jsonb,
	"assigned_to" uuid,
	"assigned_to_name" text,
	"responded_by" uuid,
	"responded_by_name" text,
	"responded_at" timestamp with time zone,
	"resolution_notes" text,
	"responder_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log_archives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_date" text NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now(),
	"archived_by" text,
	"log_count" integer DEFAULT 0,
	"total_incidents" integer DEFAULT 0,
	"resolved_count" integer DEFAULT 0,
	"unresolved_count" integer DEFAULT 0,
	"log_entries" jsonb DEFAULT '[]'::jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_id" uuid,
	"type" text,
	"status" text,
	"citizen_id" uuid,
	"tanod_assigned" text,
	"location_lat" double precision,
	"location_lng" double precision,
	"created_at" timestamp with time zone DEFAULT now(),
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid,
	"tanod_id" uuid,
	"tanod_name" text,
	"timestamp" timestamp with time zone,
	"type" text,
	"location" text,
	"gps_location" jsonb,
	"description" text,
	"persons_involved" text,
	"actions_taken" text,
	"status" text,
	"assigned_to" uuid,
	"assigned_to_name" text,
	"responded_by" uuid,
	"responded_by_name" text,
	"responded_at" timestamp with time zone,
	"resolution_notes" text,
	"responder_notes" text
);
--> statement-breakpoint
CREATE TABLE "patrol_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"tanod_id" uuid,
	"tanod_name" text,
	"start_time" timestamp with time zone DEFAULT now(),
	"end_time" timestamp with time zone,
	"route" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE "patrols" (
	"tanod_id" uuid PRIMARY KEY NOT NULL,
	"tanod_name" text,
	"is_active" boolean DEFAULT false,
	"location" jsonb,
	"status" text,
	"last_ping" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "residents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text,
	"phone" text,
	"address" text,
	"house_number" text,
	"household_size" integer DEFAULT 1,
	"blood_type" text,
	"medical_conditions" text[],
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"gps_lat" double precision,
	"gps_lng" double precision,
	"status" text DEFAULT 'pending',
	"is_verified" boolean DEFAULT false,
	"verification_date" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tanod_id" uuid,
	"tanod_name" text,
	"start_time" timestamp with time zone,
	"end_time" timestamp with time zone,
	"sector" text,
	"status" text DEFAULT 'scheduled',
	"tanod_response" text DEFAULT 'pending',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_broadcasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"isactive" boolean DEFAULT true,
	"admin_id" uuid,
	"admin_name" text,
	"type" text
);
--> statement-breakpoint
CREATE TABLE "system_config" (
	"key" text PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tanod_activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tanod_id" uuid,
	"tanod_name" text,
	"type" text,
	"timestamp" timestamp with time zone DEFAULT now(),
	"details" text,
	"location" jsonb
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'resident' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"last_active" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "witness_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid,
	"witness_user_id" uuid,
	"status" text DEFAULT 'pending' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alert_messages" ADD CONSTRAINT "alert_messages_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alert_messages" ADD CONSTRAINT "alert_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrols" ADD CONSTRAINT "patrols_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "residents" ADD CONSTRAINT "residents_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tanod_activity_logs" ADD CONSTRAINT "tanod_activity_logs_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witness_invites" ADD CONSTRAINT "witness_invites_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "witness_invites" ADD CONSTRAINT "witness_invites_witness_user_id_users_id_fk" FOREIGN KEY ("witness_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;