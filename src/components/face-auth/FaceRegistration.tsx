
import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { supabase } from '@/integrations/supabase/client';
import { loadModels, detectFace } from '@/lib/face-util';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Save, Loader2, ShieldCheck, X } from 'lucide-react';

export default function FaceRegistration() {
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState<'auth' | 'camera'>('auth');
    const [adminCode, setAdminCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const webcamRef = useRef<Webcam>(null);
    const [streamActive, setStreamActive] = useState(false);

    const startCamera = async () => {
        setLoading(true);
        const loaded = await loadModels();
        setModelsLoaded(loaded);
        setLoading(false);
        if (loaded) {
            setStep('camera');
        } else {
            toast.error("Error al cargar los modelos de reconocimiento facial.");
        }
    };

    const handleAuth = async () => {
        if (!adminCode) return;
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('admin_codes')
                .select('*')
                .eq('codigo', adminCode)
                .single();

            if (error || !data) {
                toast.error("Código inválido");
                setLoading(false);
                return;
            }

            await startCamera();
        } catch (e) {
            toast.error("Error de conexión");
            setLoading(false);
        }
    };

    const captureAndSave = async () => {
        if (!webcamRef.current || !webcamRef.current.video) return;

        setLoading(true);
        try {
            const detection = await detectFace(webcamRef.current.video);

            if (!detection) {
                toast.error("No se detectó ningún rostro. Intenta ajustar la iluminación o posición.");
                setLoading(false);
                return;
            }

            // Convert Float32Array to regular array for JSON storage
            const descriptorArray = Array.from(detection.descriptor);

            // Update the admin code entry with the face descriptor stored in 'descripcion'
            // We use a delimiter or just stringify the whole object if we don't care about the old description
            const faceData = JSON.stringify({ face_descriptor: descriptorArray });

            const { error } = await supabase
                .from('admin_codes')
                .update({ descripcion: faceData } as any)
                .eq('codigo', adminCode);

            if (error) {
                console.error(error);
                toast.error(`Error de base de datos: ${error.message || error.details || 'Desconocido'}`);
            } else {
                toast.success("¡Rostro registrado exitosamente!");
                setIsOpen(false);
                setStep('auth');
                setAdminCode('');
            }
        } catch (e) {
            console.error(e);
            toast.error("Error inesperado al procesar el rostro.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setStep('auth');
        setAdminCode('');
        setStreamActive(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="text-sm text-primary hover:underline mt-2 flex items-center gap-1 justify-center w-full">
                    <Camera className="w-4 h-4" />
                    Configurar Ingreso Facial
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Configuración de Rostro</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {step === 'auth' ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Ingresa tu código de administrador para autorizar el registro de tu rostro.
                            </p>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Código Admin</label>
                                <input
                                    type="password"
                                    value={adminCode}
                                    onChange={(e) => setAdminCode(e.target.value)}
                                    className="input-field w-full"
                                    placeholder="ADMIN2024"
                                />
                            </div>
                            <button
                                onClick={handleAuth}
                                disabled={loading || !adminCode}
                                className="btn-primary w-full"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar"}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                            {!modelsLoaded ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    <p className="text-sm text-muted-foreground">Cargando modelos...</p>
                                </div>
                            ) : (
                                <div className="relative rounded-lg overflow-hidden border-2 border-primary shadow-lg bg-black aspect-video w-full group">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{ facingMode: "user" }}
                                        className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                                        onUserMedia={() => setStreamActive(true)}
                                    />

                                    {/* Oval Overlay for Face Guide */}
                                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                                        <div className="w-48 h-64 border-2 border-white/50 rounded-[50%] shadow-[0_0_0_999px_rgba(0,0,0,0.5)]"></div>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-muted-foreground text-center">
                                Asegúrate de tener buena iluminación y mirar directamente a la cámara.
                            </p>

                            <div className="flex gap-2 w-full">
                                <button
                                    onClick={handleClose}
                                    className="btn-secondary flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={captureAndSave}
                                    disabled={loading || !streamActive}
                                    className="btn-primary flex-1 gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Registrar Rostro
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
