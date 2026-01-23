
import https from 'https';
import fs from 'fs';
import path from 'path';
import * as topojson from 'topojson-client';

const url = 'https://gist.githubusercontent.com/john-guerra/727e8992e9599b9d9f1dbfdc4c8e479e/raw/090f8b935a437e24d65b64d87598fbb437c006da/colombia-municipios.json';
const outputPath = path.join(process.cwd(), 'public', 'antioquia-municipios.geojson');

console.log(`Downloading TopoJSON from ${url}...`);

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download: status code ${res.statusCode}`);
        process.exit(1);
    }

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            let features = [];

            if (json.type === 'Topology') {
                console.log('Detected TopoJSON.');
                const objectName = Object.keys(json.objects)[0];
                console.log(`Using object: ${objectName}`);
                const geojson = topojson.feature(json, json.objects[objectName]);
                features = geojson.features;
            } else if (json.type === 'FeatureCollection') {
                features = json.features;
            } else {
                console.error('Unknown JSON format');
                process.exit(1);
            }

            console.log(`Total features: ${features.length}`);

            if (features.length > 0) {
                console.log('First feature properties:', features[0].properties);
            }

            // Filter for Antioquia
            const antioquiaFeatures = features.filter(f => {
                const props = f.properties;
                const dptName = props.dpt || props.DPTO_CNMBR || props.NOMBRE_DPT || props.DEPARTAMEN || '';
                return dptName && dptName.toString().toUpperCase().includes('ANTIOQUIA');
            });

            if (antioquiaFeatures.length > 0) {
                console.log(`Found ${antioquiaFeatures.length} municipalities in Antioquia.`);
                const newGeoJSON = {
                    type: 'FeatureCollection',
                    features: antioquiaFeatures
                };
                fs.writeFileSync(outputPath, JSON.stringify(newGeoJSON));
                console.log(`Saved to ${outputPath}`);
            } else {
                console.error('No Antioquia features found. Check properties.');
                process.exit(1);
            }

        } catch (e) {
            console.error('Error processing JSON:', e.message);
            process.exit(1);
        }
    });
}).on('error', (err) => {
    console.error('Error downloading:', err.message);
    process.exit(1);
});
