
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

async function checkAnori() {
    const { data: d1 } = await supabase.from('puestos_votacion').select('municipio').ilike('municipio', '%ANORI%').limit(1);
    const { data: d2 } = await supabase.from('puestos_votacion').select('municipio').ilike('municipio', 'ANOR%').limit(1);
    console.log("ANORI:", d1?.[0]?.municipio);
    console.log("ANOR:", d2?.[0]?.municipio);
}

checkAnori();
