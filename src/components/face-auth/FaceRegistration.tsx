
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
    const [selectedAdmin, setSelectedAdmin] = useState<any>(null);
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
            const cleanCode = adminCode.trim();
            console.log("Verificando código:", cleanCode);

            const { data, error } = await supabase
                .from('admin_codes')
                .select('*')
                .ilike('codigo', cleanCode)
                .single();

            if (error || !data) {
                console.error("Error verificando código:", error);
                toast.error("Código no encontrado");
                setLoading(false);
                return;
            }

            console.log("Admin encontrado:", data);
            setSelectedAdmin(data);
            setAdminCode(data.codigo);
            await startCamera();
        } catch (e) {
            console.error("Excepción en handleAuth:", e);
            toast.error("Error de conexión");
            setLoading(false);
        }
    };

    const captureAndSave = async () => {
        if (!webcamRef.current || !webcamRef.current.video || !selectedAdmin) {
            console.error("Faltan datos para guardar:", { webcam: !!webcamRef.current, admin: !!selectedAdmin });
            return;
        }

        setLoading(true);
        try {
            const detection = await detectFace(webcamRef.current.video);

            if (!detection) {
                toast.error("No se detectó ningún rostro.");
                setLoading(false);
                return;
            }

            const descriptorArray = Array.from(detection.descriptor);
            const faceData = JSON.stringify({ face_descriptor: descriptorArray });

            console.log("Intentando actualizar admin ID:", selectedAdmin.id || selectedAdmin.codigo);

            // Intentamos actualizar por ID si existe, si no por código
            let query = supabase.from('admin_codes').update({
                descripcion: faceData,
                activo: true
            } as any);

            if (selectedAdmin.id) {
                query = query.eq('id', selectedAdmin.id);
            } else {
                query = query.eq('codigo', selectedAdmin.codigo);
            }

            const { data, error } = await query.select();

            if (error) {
                console.error("Error en update Supabase:", error);
                toast.error(`Error de Base de Datos: ${error.message}`);
            } else if (!data || data.length === 0) {
                // Si llegamos aquí, es 99% seguro que es RLS
                console.error("Fallo de RLS detectado o registro no encontrado");
                toast.error("ERROR DE PERMISOS: No se pudo actualizar el registro. Verifica las políticas RLS.");

                // Mostramos un alert con instrucciones técnicas
                alert("INSTRUCCIONES PARA EL ADMINISTRADOR:\n1. Ve a tu proyecto de Supabase.\n2. Ve a Table Editor -> admin_codes.\n3. Haz clic en 'RLS Disabled' (o añade una Policy que permita UPDATE para el rol anon/authenticated).\n4. Guarda los cambios e intenta registrarte de nuevo.");
            } else {
                toast.success("¡Rostro registrado y activado!");
                setIsOpen(false);
                setStep('auth');
                setAdminCode('');
                setSelectedAdmin(null);
            }
        } catch (e) {
            console.error("Excepción en captureAndSave:", e);
            toast.error("Error al procesar el rostro.");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setStep('auth');
        setAdminCode('');
        setSelectedAdmin(null);
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
