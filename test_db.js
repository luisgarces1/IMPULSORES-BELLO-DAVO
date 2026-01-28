
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

async function test() {
    try {
        const { data, error } = await supabase.from('personas').select('count');
        console.log("Personas count success:", !!data);
        if (error) console.log("Error:", error.message);

        const { data: pData, error: pError } = await supabase.from('puestos_votacion').select('count');
        console.log("Puestos count success:", !!pData);
        if (pError) console.log("Error Puestos:", pError.message);
    } catch (e) {
        console.log("Catch error:", e.message);
    }
}

test();
