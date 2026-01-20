
import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';
import { loadModels, detectFace, matchFace } from '@/lib/face-util';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ScanFace, CheckCircle2, XCircle } from 'lucide-react';

export default function FaceLogin() {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const webcamRef = useRef<Webcam>(null);
    const { login } = useAuth();
    const navigate = useNavigate();

    // Load models when dialog opens
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            loadModels().then((loaded) => {
                setModelsLoaded(loaded);
                setLoading(false);
            });
        } else {
            setStatus('idle');
        }
    }, [isOpen]);

    const handleScan = async () => {
        if (!webcamRef.current || !webcamRef.current.video) return;
        setStatus('scanning');

        try {
            // 1. Detect face
            const detection = await detectFace(webcamRef.current.video);
            if (!detection) {
                toast.error("No se detectó rostro. Inténtalo de nuevo.");
                setStatus('idle');
                return;
            }

            // 2. Setup Matcher with DB data
            // Fetch all active admins with descriptors
            const { data: adminsData, error } = await supabase
                .from('admin_codes')
                .select('*')
                .eq('activo', true)
                .not('descripcion', 'is', null);

            const admins = adminsData as any[];

            if (error || !admins || admins.length === 0) {
                console.error(error);
                toast.error("No se encontraron administradores con datos faciales.");
                setStatus('failed');
                return;
            }

            // Debugging: Notify how many records found to verify DB connection
            console.log(`Face Login: Found ${admins.length} admins with descriptions.`);

            // 3. Compare
            let bestMatchAdmin = null;
            let bestDistance = 1.0;

            for (const admin of admins) {
                // Parse descriptor from description field
                let storedDescriptor = null;
                try {
                    let desc = admin.descripcion;

                    // Handle double stringification if it happens
                    if (typeof desc === 'string') {
                        if (desc.trim().startsWith('"') && desc.trim().endsWith('"')) {
                            try {
                                desc = JSON.parse(desc);
                            } catch (e) { /* ignore */ }
                        }
                    }

                    let parsed = null;
                    if (typeof desc === 'string') {
                        if (desc.trim().startsWith('{') || desc.includes('face_descriptor')) {
                            try {
                                parsed = JSON.parse(desc);
                            } catch (e) {
                                console.error("JSON parse error for admin " + admin.codigo, e);
                            }
                        }
                    } else if (typeof desc === 'object' && desc !== null) {
                        parsed = desc;
                    }

                    if (parsed && parsed.face_descriptor) {
                        // Convert regular array back to Float32Array
                        const arr = Object.values(parsed.face_descriptor) as number[];
                        storedDescriptor = new Float32Array(arr);
                    } else {
                        console.log(`Admin ${admin.codigo} has description but no face_descriptor key.`);
                    }

                } catch (e) {
                    console.error('Error processing face descriptor:', e);
                }

                if (storedDescriptor) {
                    const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
                    // Debug login
                    console.log(`Comparing with admin ${admin.codigo || 'unknown'}: distance ${distance}`);

                    // Always track the best distance found
                    if (distance < bestDistance) {
                        bestDistance = distance;
                    }

                    // Relaxed threshold to 0.7 as requested
                    if (distance < 0.7) {
                        bestMatchAdmin = admin;
                    }
                }
            }

            if (bestMatchAdmin) {
                setStatus('success');
                // formatted distance for debug
                const matchScore = bestDistance < 1 ? bestDistance.toFixed(3) : "1.0";
                toast.success(`¡Hola ${bestMatchAdmin.nombre || 'Administrador'}! (Score: ${matchScore})`);

                setTimeout(() => {
                    login('admin', 'Administrador', 'admin', true);
                    navigate('/dashboard');
                }, 1000);
            } else {
                setStatus('failed');
                toast.error(`Rostro no reconocido. Mejor coincidencia: ${bestDistance.toFixed(2)}`);
            }

        } catch (e) {
            console.error(e);
            toast.error("Error en el proceso de reconocimiento.");
            setStatus('failed');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="btn-outline w-full flex items-center justify-center gap-2 mt-4"
                >
                    <ScanFace className="w-4 h-4" />
                    Ingreso Facial
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Acceso Biométrico</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center gap-4 py-4">
                    {!modelsLoaded ? (
                        <div className="flex flex-col items-center justify-center h-48 gap-2">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Inicializando sistema...</p>
                        </div>
                    ) : (
                        <div className="relative rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-black aspect-video w-full group">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user" }}
                                className="w-full h-full object-cover transform scale-x-[-1]"
                            />

                            {/* Oval Overlay for Face Guide */}
                            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                <div className={`w-48 h-64 border-2 rounded-[50%] transition-colors duration-300 shadow-[0_0_0_999px_rgba(0,0,0,0.5)]
                                        ${status === 'scanning' ? 'border-primary animate-pulse' : 'border-white/50'}
                                        ${status === 'success' ? 'border-green-500 shadow-[0_0_0_999px_rgba(0,0,0,0.8)]' : ''}
                                        ${status === 'failed' ? 'border-red-500' : ''}
                                    `}></div>
                            </div>

                            {status === 'success' && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center">
                                    <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce drop-shadow-lg" />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex gap-2 w-full mt-2">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="btn-ghost flex-1"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleScan}
                            disabled={status === 'scanning' || status === 'success' || !modelsLoaded}
                            className="btn-primary flex-1"
                        >
                            {status === 'scanning' ? "Analizando..." : "Escanear Rostro"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
