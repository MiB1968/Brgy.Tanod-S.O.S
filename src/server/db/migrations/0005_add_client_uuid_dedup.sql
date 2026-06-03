-- PATCH: src/server/db/migrations/0005_add_client_uuid_dedup.sql
--
-- CRIT-04 — clientUuid deduplication was in-memory only (processedUuids Set).
-- Server restart or horizontal scale lets duplicate offline-sync SOS through.
--
-- This migration adds a nullable client_uuid column with a UNIQUE constraint
-- to the alerts table. The application-level Set remains as a fast first-pass
-- check; the DB constraint is the durable guarantee.

ALTER TABLE "alerts"
  ADD COLUMN IF NOT EXISTS "client_uuid" TEXT;

-- Partial unique index: only enforce uniqueness when client_uuid is present.
-- This avoids conflicts for alerts that predate this migration or were created
-- without an offline UUID (e.g. direct API calls).
CREATE UNIQUE INDEX IF NOT EXISTS "alerts_client_uuid_unique"
  ON "alerts" ("client_uuid")
  WHERE "client_uuid" IS NOT NULL;
