CREATE TABLE "barangay_boundaries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100),
	"boundary_geojson" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "alerts" DROP CONSTRAINT "alerts_resident_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_alert_id_alerts_id_fk";
--> statement-breakpoint
ALTER TABLE "incidents" DROP CONSTRAINT "incidents_tanod_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patrol_sessions" DROP CONSTRAINT "patrol_sessions_tanod_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "patrols" DROP CONSTRAINT "patrols_tanod_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "shifts" DROP CONSTRAINT "shifts_tanod_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tanod_activity_logs" DROP CONSTRAINT "tanod_activity_logs_tanod_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "client_uuid" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD COLUMN "barangay_id" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "admin_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "action" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "target_table" varchar(50);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "target_id" varchar(100);--> statement-breakpoint
ALTER TABLE "audit_logs" ADD COLUMN "details" jsonb;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "barangay_id" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "residents" ADD COLUMN "selfie_url" text;--> statement-breakpoint
ALTER TABLE "residents" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "residents" ADD COLUMN "is_outside_barangay" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "residents" ADD COLUMN "last_location_check" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "barangay_id" text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "firebase_uid" text;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resident_id_users_id_fk" FOREIGN KEY ("resident_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrol_sessions" ADD CONSTRAINT "patrol_sessions_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patrols" ADD CONSTRAINT "patrols_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tanod_activity_logs" ADD CONSTRAINT "tanod_activity_logs_tanod_id_users_id_fk" FOREIGN KEY ("tanod_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerts_status_idx" ON "alerts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "alerts_created_at_idx" ON "alerts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "alerts_assigned_to_idx" ON "alerts" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "alerts_resident_id_idx" ON "alerts" USING btree ("resident_id");--> statement-breakpoint
CREATE INDEX "users_firebase_uid_idx" ON "users" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_client_uuid_unique" UNIQUE("client_uuid");