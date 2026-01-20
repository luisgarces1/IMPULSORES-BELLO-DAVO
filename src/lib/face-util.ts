
import * as faceapi from 'face-api.js';

// Configuration for models storage
const MODEL_URL = '/models';

export const loadModels = async () => {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);
        return true;
    } catch (error) {
        console.error('Error loading face-api models:', error);
        return false;
    }
};

export const detectFace = async (videoElement: HTMLVideoElement) => {
    if (!videoElement) return null;

    // Detect single face with landmarks and descriptor
    // Using TinyFaceDetector for performance, or SsdMobilenetv1 for accuracy
    const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

    return detection;
};

export const matchFace = (
    descriptor: Float32Array,
    storedDescriptor: number[] | Float32Array
): boolean => {
    // Calculate Euclidean distance
    const distance = faceapi.euclideanDistance(descriptor, storedDescriptor);
    // Threshold usually around 0.6. Lower is stricter.
    return distance < 0.5;
};
