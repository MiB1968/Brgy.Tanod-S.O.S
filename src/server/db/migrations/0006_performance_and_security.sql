-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_assigned_to ON alerts(assigned_to);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_resident_id ON alerts(resident_id);

-- Create alert_history table for immutable tracking
CREATE TABLE IF NOT EXISTS alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgcrypto for medical data encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns to residents if they don't exist
ALTER TABLE residents ADD COLUMN IF NOT EXISTS medical_conditions_enc TEXT;
ALTER TABLE residents ADD COLUMN IF NOT EXISTS blood_type_enc TEXT;

-- Note: In a real production migration, we would migrate existing data here:
-- UPDATE residents SET medical_conditions_enc = pgp_sym_encrypt(medical_conditions::text, 'YOUR_SECRET_KEY') WHERE medical_conditions IS NOT NULL;
