import { useState, useRef, useEffect } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';
import { loadModels, detectFace } from '@/lib/face-util';
import { useAuth } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, ScanFace, CheckCircle2 } from 'lucide-react';

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
                toast.error("No se detectó rostro. Intenta de nuevo.");
                setStatus('failed');
                return;
            }

            // 2. Setup Matcher with DB data
            const { data: admins, error } = await supabase
                .from('admin_codes')
                .select('*')
                .eq('activo', true)
                .not('descripcion', 'is', null);

            if (error || !admins || admins.length === 0) {
                toast.error("No se encontraron registros faciales configurados.");
                setStatus('failed');
                return;
            }

            // 3. Compare
            let bestMatchAdmin = null;
            let bestDistance = 1.0;

            for (const admin of admins) {
                try {
                    let desc = admin.descripcion;
                    if (!desc) continue;

                    let parsed = null;
                    if (typeof desc === 'string') {
                        // Handle potential double-stringified JSON from some environments
                        let current: any = desc.trim();
                        try {
                            if (current.includes('\\"')) current = current.replace(/\\"/g, '"');
                            current = JSON.parse(current);
                            if (typeof current === 'string') current = JSON.parse(current);
                        } catch (e) { /* ignore */ }
                        parsed = current;
                    } else {
                        parsed = desc;
                    }

                    if (parsed && typeof parsed === 'object' && parsed.face_descriptor) {
                        const vals = Object.values(parsed.face_descriptor) as number[];
                        const storedDescriptor = new Float32Array(vals);

                        const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);

                        if (distance < bestDistance) {
                            bestDistance = distance;
                        }

                        if (distance < 0.6) { // Stricter threshold for manual button
                            bestMatchAdmin = admin;
                        }
                    }
                } catch (e) {
                    console.error("Error procesando admin:", admin.codigo, e);
                }
            }

            if (bestMatchAdmin) {
                setStatus('success');
                toast.success(`¡Bienvenido! Acceso concedido.`);

                setTimeout(() => {
                    login('admin', 'Administrador', 'admin', true);
                    navigate('/dashboard');
                }, 1000);
            } else {
                setStatus('failed');
                toast.error(`Rostro no reconocido (Distancia: ${bestDistance.toFixed(2)})`);
            }

        } catch (e) {
            console.error(e);
            toast.error('Error durante el escaneo facial.');
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
                            {status === 'scanning' ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Analizando...
                                </>
                            ) : "Escanear Rostro"}
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
