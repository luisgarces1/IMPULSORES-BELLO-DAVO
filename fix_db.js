
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

async function addNotasColumn() {
    console.log("Intentando agregar columna 'notas'...");
    // Since we can't run raw SQL via the client without an RPC, 
    // we can try to 'upsert' or 'update' a row with 'notas' and see the error.
    // Or we can try to use the 'rpc' if available, but usually it's not.

    // Better: let's try to just select it and see if it fails.
    const { error } = await supabase.from('personas').select('notas').limit(1);

    if (error && error.message.includes("column \"notas\" does not exist")) {
        console.log("La columna 'notas' NO EXISTE. Por favor ejecuta el SQL en Supabase.");
    } else if (error) {
        console.log("Error al verificar columna:", error.message);
    } else {
        console.log("La columna 'notas' ya existe.");
    }
}

addNotasColumn();
