
import XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function inspectPuestos() {
    const filePath = path.join(__dirname, 'DOCS', 'PUESTOS DE VOTACION.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { range: 0 });

    console.log("Columnas encontradas:", Object.keys(data[0]));
    console.log("Ejemplo de fila:", data[0]);
    console.log("Total filas:", data.length);
}

inspectPuestos();
