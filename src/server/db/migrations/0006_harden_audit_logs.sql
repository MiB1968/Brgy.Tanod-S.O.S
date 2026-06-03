-- Migration: Harden Audit Logs
-- Updates audit_logs table with structured columns

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Backfill data from legacy columns if possible
UPDATE audit_logs SET actor_id = citizen_id WHERE actor_id IS NULL AND citizen_id IS NOT NULL;
UPDATE audit_logs SET actor_id = admin_id WHERE actor_id IS NULL AND admin_id IS NOT NULL;
UPDATE audit_logs SET action = type WHERE action IS NULL AND type IS NOT NULL;
UPDATE audit_logs SET entity_type = target_table WHERE entity_type IS NULL AND target_table IS NOT NULL;
UPDATE audit_logs SET entity_id = target_id WHERE entity_id IS NULL AND target_id IS NOT NULL;

-- Ensure action is not null (requirement)
ALTER TABLE audit_logs ALTER COLUMN action SET NOT NULL;
