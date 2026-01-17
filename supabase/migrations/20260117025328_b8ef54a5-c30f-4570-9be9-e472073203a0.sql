-- Crear enum para roles
CREATE TYPE public.user_role AS ENUM ('lider', 'asociado', 'admin');

-- Crear enum para estados
CREATE TYPE public.estado_registro AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- Tabla principal de personas (líderes y asociados)
CREATE TABLE public.personas (
    cedula TEXT PRIMARY KEY,
    nombre_completo TEXT NOT NULL,
    telefono TEXT,
    rol user_role NOT NULL DEFAULT 'asociado',
    cedula_lider TEXT REFERENCES public.personas(cedula),
    lugar_votacion TEXT,
    municipio_votacion TEXT DEFAULT 'Bello',
    vota_en_bello BOOLEAN DEFAULT true,
    estado estado_registro NOT NULL DEFAULT 'PENDIENTE',
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT now(),
    registrado_por TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Tabla de sesiones para login con cédula (sin auth tradicional)
CREATE TABLE public.sesiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula TEXT REFERENCES public.personas(cedula) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    es_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours')
);

-- Tabla de códigos admin
CREATE TABLE public.admin_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar código admin inicial
INSERT INTO public.admin_codes (codigo, descripcion) VALUES ('ADMIN2024', 'Código maestro principal');

-- Habilitar RLS
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para personas (lectura pública para el sistema de login con cédula)
CREATE POLICY "Permitir lectura pública de personas" ON public.personas
    FOR SELECT USING (true);

CREATE POLICY "Permitir inserción pública de personas" ON public.personas
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir actualización pública de personas" ON public.personas
    FOR UPDATE USING (true);

CREATE POLICY "Permitir eliminación pública de personas" ON public.personas
    FOR DELETE USING (true);

-- Políticas para sesiones
CREATE POLICY "Permitir gestión de sesiones" ON public.sesiones
    FOR ALL USING (true);

-- Políticas para admin_codes (solo lectura para validación)
CREATE POLICY "Permitir lectura de códigos admin" ON public.admin_codes
    FOR SELECT USING (true);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para actualizar updated_at
CREATE TRIGGER update_personas_updated_at
    BEFORE UPDATE ON public.personas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Función para contar asociados de un líder
CREATE OR REPLACE FUNCTION public.contar_asociados(cedula_lider_param TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.personas
        WHERE cedula_lider = cedula_lider_param
        AND rol = 'asociado'
    );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;

-- Función para contar cuántos votan en Bello
CREATE OR REPLACE FUNCTION public.contar_votan_bello(cedula_lider_param TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM public.personas
        WHERE cedula_lider = cedula_lider_param
        AND rol = 'asociado'
        AND vota_en_bello = true
    );
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;