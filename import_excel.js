
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
    // CAMBIO: Usar el nuevo archivo proporcionado por el usuario
    const filePath = path.join(__dirname, 'DOCS', 'Reporte_CRM_2026-01-28.xlsx');

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

    // OPCIONAL: Limpiar la base de datos si se desea un reemplazo total
    // Nota: Esto puede fallar si hay llaves foráneas activas. 
    // Como el usuario pidió "cambiar", intentaremos limpiar.
    console.log("Limpiando tabla 'personas' para reemplazo total...");
    // Primero eliminamos sesiones para evitar errores de FK
    const { error: deleteSesionesError } = await supabase.from('sesiones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteSesionesError) console.warn("Aviso al limpiar sesiones:", deleteSesionesError.message);

    // Luego eliminamos personas (los asociados primero, luego líderes por la FK self-referencing)
    const { error: deleteAsociadosError } = await supabase.from('personas').delete().eq('rol', 'asociado');
    if (deleteAsociadosError) console.warn("Aviso al limpiar asociados:", deleteAsociadosError.message);

    const { error: deleteLideresError } = await supabase.from('personas').delete().eq('rol', 'lider');
    if (deleteLideresError) console.warn("Aviso al limpiar líderes:", deleteLideresError.message);

    // Mapear datos del Excel a la estructura de la tabla 'personas'
    const personas = data.map(row => {
        // Intentar detectar columnas por diferentes nombres
        const cedula = String(row['Cédula'] || row['CEDULA'] || row['cedula'] || '');
        const nombre = row['Nombre Completo'] || row['NOMBRE COMPLETO'] || row['Nombre'] || row['nombre_completo'] || 'Sin Nombre';
        const tel = String(row['Teléfono'] || row['TELEFONO'] || row['telefono'] || '');
        const rolRaw = String(row['Rol'] || row['ROL'] || row['rol'] || 'asociado').toLowerCase();
        const ldr = String(row['Cédula Líder'] || row['CEDULA LIDER'] || row['cedula_lider'] || '');

        // Soporte para 'Puesto de Votación' que aparece en el nuevo Excel
        const lugar = row['Puesto de Votación'] || row['Lugar Votación'] || row['LUGAR VOTACION'] || row['lugar_votacion'] || '';

        const mun = row['Municipio'] || row['MUNICIPIO'] || row['municipio_votacion'] || 'Bello';
        const bello = row['Vota en Bello'] === 'SÍ' || row['Vota en Bello'] === 'SI' || row['vota_en_bello'] === true;
        const est = row['Estado'] || row['ESTADO'] || 'APROBADO';

        // Soporte para 'Fecha Registro'
        const rawFecha = row['Fecha Registro'] || row['FECHA REGISTRO'] || row['fecha_registro'];
        let fecha_reg = null;
        if (rawFecha) {
            const dateStr = String(rawFecha).trim();
            // Convertir DD/MM/YYYY a YYYY-MM-DD
            if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                    const d = parts[0].padStart(2, '0');
                    const m = parts[1].padStart(2, '0');
                    const y = parts[2];
                    fecha_reg = `${y}-${m}-${d}`;
                } else {
                    fecha_reg = dateStr;
                }
            } else {
                fecha_reg = dateStr;
            }
        }

        // Soporte para 'Notas'
        const nts = row['Notas'] || row['NOTAS'] || row['notas'] || null;

        return {
            cedula: cedula.trim(),
            nombre_completo: nombre,
            telefono: tel === 'undefined' || tel === '' ? null : tel,
            rol: (rolRaw.includes('lider') || rolRaw.includes('líder')) ? 'lider' : 'asociado',
            cedula_lider: ldr === '' || ldr === 'undefined' || ldr === '0' ? null : ldr.trim(),
            lugar_votacion: lugar || null,
            municipio_votacion: mun,
            vota_en_bello: bello,
            estado: est.toUpperCase() === 'PENDIENTE' ? 'PENDIENTE' : (est.toUpperCase() === 'RECHAZADO' ? 'RECHAZADO' : 'APROBADO'),
            fecha_registro: fecha_reg,
            notas: nts
        };
    }).filter(p => p.cedula !== '' && p.cedula !== 'undefined');

    console.log(`Ejemplo de primer registro mapeado:`, personas[0]);
    console.log(`Llamando a Supabase para procesar ${personas.length} registros...`);

    // Paso 1: Insertar/Actualizar todos los registros con cedula_lider = null
    // Esto asegura que todas las cédulas existan antes de intentar crear relaciones entre ellas.
    console.log("Paso 1: Creando registros base (sin relaciones de líder)...");
    const personasSinLider = personas.map(p => ({ ...p, cedula_lider: null }));

    for (let i = 0; i < personasSinLider.length; i += 50) {
        const chunk = personasSinLider.slice(i, i + 50);
        const { error } = await supabase.from('personas').upsert(chunk);
        if (error) {
            console.error(`Error Paso 1 - Bloque ${i}:`, error.message);
            fs.appendFileSync('import_errors.log', `PASO 1 i=${i}: ` + JSON.stringify(error) + '\n');
        }
    }

    // Paso 2: Actualizar los registros con su cedula_lider real
    console.log("Paso 2: Estableciendo relaciones de liderazgo...");
    for (let i = 0; i < personas.length; i += 50) {
        const chunk = personas.slice(i, i + 50);
        const { error } = await supabase.from('personas').upsert(chunk);
        if (error) {
            console.error(`Error Paso 2 - Bloque ${i}:`, error.message);
            fs.appendFileSync('import_errors.log', `PASO 2 i=${i}: ` + JSON.stringify(error) + '\n');
        }
    }

    console.log("Proceso de importación finalizado con éxito.");
}

importData().catch(err => {
    fs.appendFileSync('import_errors.log', err.stack + '\n');
    console.error(err);
});
