
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'antioquia-municipios.geojson');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
        console.log(`Valid GeoJSON. Features: ${json.features.length}`);
        if (json.features.length > 0) {
            console.log('First feature:', JSON.stringify(json.features[0].properties));
        }
    } else {
        console.log('Invalid GeoJSON structure');
        process.exit(1);
    }
} catch (e) {
    console.error('Error parsing JSON:', e.message);
    process.exit(1);
}
