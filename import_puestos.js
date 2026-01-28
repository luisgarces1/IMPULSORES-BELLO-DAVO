
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
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

async function importPuestos() {
    const filePath = path.join(__dirname, 'DOCS', 'PUESTOS DE VOTACION.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Leídos ${rawData.length} puestos.`);

    const batchSize = 100;
    for (let i = 0; i < rawData.length; i += batchSize) {
        const batch = rawData.slice(i, i + batchSize).map(row => ({
            departamento: row.DEPARTAMENTO,
            municipio: row.MUNICIPIO,
            puesto: row.PUESTO,
            direccion: row.DIRECCIÓN || null
        }));

        const { error } = await supabase.from('puestos_votacion').insert(batch);
        if (error) {
            console.error(`Error en lote ${i / batchSize}:`, error.message);
            // Si el error dice que la tabla no existe, paramos.
            if (error.message.includes('relation "puestos_votacion" does not exist')) {
                console.error("ERROR: La tabla 'puestos_votacion' no existe. Ejecuta el SQL primero.");
                return;
            }
        } else {
            console.log(`Lote ${i / batchSize} insertado...`);
        }
    }
    console.log("Importación de puestos finalizada.");
}

importPuestos();
