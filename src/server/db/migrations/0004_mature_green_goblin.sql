ALTER TABLE "system_broadcasts" ALTER COLUMN "isactive" SET DEFAULT false;--> statement-breakpoint
ALTER TABLE "system_broadcasts" ADD COLUMN "incident_id" uuid;--> statement-breakpoint
ALTER TABLE "system_broadcasts" ADD COLUMN "approval_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "system_broadcasts" ADD COLUMN "ai_recommendation" jsonb;--> statement-breakpoint
ALTER TABLE "system_broadcasts" ADD CONSTRAINT "system_broadcasts_incident_id_alerts_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."alerts"("id") ON DELETE no action ON UPDATE no action;