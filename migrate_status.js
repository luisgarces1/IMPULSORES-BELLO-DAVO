
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = Object.fromEntries(
    envFile.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const parts = line.split('=');
            if (parts.length < 2) return null;
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '').replace(/'/g, '');
            return [key, value];
        })
        .filter(Boolean)
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY);

async function migrateStatus() {
    console.log("Iniciando migración de estados...");

    const { data: personas, error } = await supabase.from('personas').select('*');

    if (error) {
        console.error("Error al obtener personas:", error.message);
        return;
    }

    console.log(`Encontradas ${personas.length} personas.`);

    let actualizados = 0;
    for (const p of personas) {
        let nuevoEstado = 'PENDIENTE';

        if (p.municipio_votacion === 'No Se') {
            nuevoEstado = 'PENDIENTE';
        } else if (p.municipio_votacion && p.municipio_puesto && p.municipio_votacion === p.municipio_puesto) {
            nuevoEstado = 'APROBADO';
        } else if (p.municipio_votacion && p.municipio_puesto) {
            nuevoEstado = 'RECHAZADO';
        } else {
            nuevoEstado = 'PENDIENTE';
        }

        if (nuevoEstado !== p.estado) {
            const { error: updateError } = await supabase
                .from('personas')
                .update({ estado: nuevoEstado })
                .eq('cedula', p.cedula);

            if (updateError) {
                console.error(`Error actualizando CC ${p.cedula}:`, updateError.message);
            } else {
                actualizados++;
            }
        }
    }

    console.log(`Migración finalizada. Se actualizaron ${actualizados} registros.`);
}

migrateStatus();
