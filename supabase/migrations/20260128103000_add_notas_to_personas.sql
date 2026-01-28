
-- Add notas column to personas table
ALTER TABLE personas ADD COLUMN IF NOT EXISTS notas TEXT;
