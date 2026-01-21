
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno manualmente del archivo .env
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

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("No se encontraron las credenciales en el archivo .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importData() {
    const filePath = path.join(__dirname, 'DOCS', 'Reporte_CRM_2026-01-21.xlsx');

    if (!fs.existsSync(filePath)) {
        console.error("El archivo Excel no existe en:", filePath);
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Leídas ${workbook.SheetNames.length} hojas. Usando: ${sheetName}`);
    console.log(`Leídas ${data.length} filas del Excel.`);

    if (data.length === 0) {
        console.log("No hay datos para importar.");
        return;
    }

    // Mapear datos del Excel a la estructura de la tabla 'personas'
    const personas = data.map(row => {
        // Intentar detectar columnas por diferentes nombres
        const cedula = String(row['Cédula'] || row['CEDULA'] || row['cedula'] || '');
        const nombre = row['Nombre Completo'] || row['NOMBRE COMPLETO'] || row['Nombre'] || row['nombre_completo'] || 'Sin Nombre';
        const tel = String(row['Teléfono'] || row['TELEFONO'] || row['telefono'] || '');
        const rolRaw = (row['Rol'] || row['ROL'] || row['rol'] || 'asociado').toLowerCase();
        const ldr = String(row['Cédula Líder'] || row['CEDULA LIDER'] || row['cedula_lider'] || '');
        const lugar = row['Lugar Votación'] || row['LUGAR VOTACION'] || row['lugar_votacion'] || '';
        const mun = row['Municipio'] || row['MUNICIPIO'] || row['municipio_votacion'] || 'Bello';
        const bello = row['Vota en Bello'] === 'SÍ' || row['Vota en Bello'] === 'SI' || row['vota_en_bello'] === true;
        const est = row['Estado'] || row['ESTADO'] || 'APROBADO';

        return {
            cedula: cedula.trim(),
            nombre_completo: nombre,
            telefono: tel === 'undefined' ? null : tel,
            rol: rolRaw.includes('lider') ? 'lider' : (rolRaw.includes('asociado') ? 'asociado' : 'asociado'),
            cedula_lider: ldr === '' || ldr === 'undefined' ? null : ldr.trim(),
            lugar_votacion: lugar || null,
            municipio_votacion: mun,
            vota_en_bello: bello,
            estado: est.toUpperCase() === 'PENDIENTE' ? 'PENDIENTE' : (est.toUpperCase() === 'RECHAZADO' ? 'RECHAZADO' : 'APROBADO')
        };
    }).filter(p => p.cedula !== '');

    console.log(`Ejemplo de primer registro mapeado:`, personas[0]);
    console.log(`Llamando a Supabase para insertar ${personas.length} registros...`);

    // Insertar primero los líderes para evitar errores de llave foránea si el excel viene desordenado
    const lideres = personas.filter(p => p.rol === 'lider');
    const asociados = personas.filter(p => p.rol !== 'lider');

    console.log(`Insertando ${lideres.length} líderes...`);
    for (let i = 0; i < lideres.length; i += 50) {
        const chunk = lideres.slice(i, i + 50);
        const { error } = await supabase.from('personas').upsert(chunk);
        if (error) console.error(`Error en líderes bloque ${i}:`, error.message);
    }

    console.log(`Insertando ${asociados.length} asociados...`);
    for (let i = 0; i < asociados.length; i += 50) {
        const chunk = asociados.slice(i, i + 50);
        const { error } = await supabase.from('personas').upsert(chunk);
        if (error) console.error(`Error en asociados bloque ${i}:`, error.message);
    }

    console.log("Proceso de importación finalizado.");
}

importData();
