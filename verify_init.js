
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

async function check() {
    console.log("Checking database content...");
    
    const { data: personas, error: pErr } = await supabase.from('personas').select('*').limit(1);
    console.log("Personas sample:", personas);
    if (pErr) console.error("Error personas:", pErr.message);

    const { data: codes, error: cErr } = await supabase.from('admin_codes').select('*');
    console.log("Admin Codes:", codes);
    if (cErr) console.error("Error admin_codes:", cErr.message);

    const { data: puestos, error: puErr } = await supabase.from('puestos_votacion').select('id').limit(1);
    console.log("Puestos sample:", puestos);
    if (puErr) console.error("Error puestos:", puErr.message);
}

check();
