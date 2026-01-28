
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

async function checkData() {
    console.log("Consultando municipios en puestos_votacion...");
    const { data, error } = await supabase
        .from('puestos_votacion')
        .select('municipio')
        .limit(20);

    if (error) {
        console.error("Error:", error.message);
    } else {
        console.log("Municipios encontrados (ejemplos):", [...new Set(data.map(d => d.municipio))]);
    }
}

checkData();
