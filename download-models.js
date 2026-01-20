
import fs from 'fs';
import https from 'https';
import path from 'path';

const models = [
    'tiny_face_detector_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'face_landmark_68_model-weights_manifest.json',
    'face_landmark_68_model-shard1',
    'face_recognition_model-weights_manifest.json',
    'face_recognition_model-shard1',
    'face_recognition_model-shard2'
];

const baseUrl = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
const targetDir = path.join('public', 'models');

if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

models.forEach(file => {
    const url = `${baseUrl}/${file}`;
    const dest = path.join(targetDir, file);

    const fileStream = fs.createWriteStream(dest);
    https.get(url, (response) => {
        response.pipe(fileStream);
        fileStream.on('finish', () => {
            fileStream.close();
            console.log(`Downloaded ${file}`);
        });
    }).on('error', (err) => {
        fs.unlink(dest, () => { }); // Delete the file async. (But we don't check result)
        console.error(`Error downloading ${file}: ${err.message}`);
    });
});
