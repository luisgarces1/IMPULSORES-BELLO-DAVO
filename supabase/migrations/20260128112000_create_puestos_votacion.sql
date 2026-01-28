
-- Create voting stations table
CREATE TABLE IF NOT EXISTS puestos_votacion (
    id BIGSERIAL PRIMARY KEY,
    departamento TEXT,
    municipio TEXT,
    puesto TEXT,
    direccion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_puestos_municipio ON puestos_votacion(municipio);
