
import fs from 'fs';
const data = JSON.parse(fs.readFileSync('public/antioquia-municipios.geojson', 'utf8'));
console.log(data.features[0].properties);
