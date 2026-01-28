
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
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/"/g, '').replace(/'/g, '');
            return [key, value];
        })
);

const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_PUBLISHABLE_KEY);

async function checkPuestos() {
    const { count, error } = await supabase
        .from('puestos_votacion')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error al consultar la tabla:", error.message);
    } else {
        console.log(`La tabla 'puestos_votacion' tiene ${count} registros.`);
    }

    const { data: sample } = await (supabase as any)
        .from('puestos_votacion')
        .select('municipio')
        .limit(5);
    console.log("Ejemplos de municipios:", sample);
}

checkPuestos();
