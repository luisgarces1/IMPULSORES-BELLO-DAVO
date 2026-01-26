-- Add new voting location columns to personas table
ALTER TABLE personas ADD COLUMN IF NOT EXISTS municipio_puesto TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS puesto_votacion TEXT;
ALTER TABLE personas ADD COLUMN IF NOT EXISTS mesa_votacion TEXT;
