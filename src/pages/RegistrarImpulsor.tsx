import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ArrowRight, CheckCircle, AlertCircle, Share2, Copy, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { MUNICIPIOS_ANTIOQUIA } from '@/constants/locations';
import { SearchableSelect } from '@/components/SearchableSelect';

export default function RegistrarImpulsor() {
    const { cedula: cedulaLider, nombre, isAdmin } = useAuth();
    const [loading, setLoading] = useState(false);
    const [countImpulsores, setCountImpulsores] = useState<number | null>(null);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        cedula: '',
        nombre: '',
        telefono: '',
        email: '',
        municipio: '',
        municipio_puesto: '',
        puesto_votacion: '',
        mesa_votacion: '',
        votos_prometidos: '',
        selectedLider: '',
    });

    const [puestosOptions, setPuestosOptions] = useState<{ value: string; label: string }[]>([]);
    const [loadingPuestos, setLoadingPuestos] = useState(false);

    const [lastRegistered, setLastRegistered] = useState<any>(null);
    const [leadersOptions, setLeadersOptions] = useState<{ value: string; label: string }[]>([]);

    useEffect(() => {
        if (cedulaLider && !formData.selectedLider) {
            setFormData(prev => ({ ...prev, selectedLider: cedulaLider }));
        }
    }, [cedulaLider]);

    useEffect(() => {
        if (isAdmin) {
            const fetchLeaders = async () => {
                const { data } = await supabase
                    .from('personas')
                    .select('cedula, nombre_completo')
                    .eq('rol', 'lider')
                    .neq('cedula', cedulaLider);

                const others = (data || []).map(l => ({
                    value: l.cedula,
                    label: `${l.nombre_completo} (${l.cedula})`
                }));

                setLeadersOptions([
                    { value: cedulaLider || '', label: 'Administrador (Yo)' },
                    ...others
                ]);
            };
            fetchLeaders();
        }
    }, [isAdmin, cedulaLider]);

    const checkCount = async () => {
        const { count } = await supabase
            .from('personas')
            .select('*', { count: 'exact', head: true })
            .eq('cedula_lider', cedulaLider)
            .eq('rol', 'impulsor');

        setCountImpulsores(count || 0);
    };

    useEffect(() => {
        checkCount();
    }, [cedulaLider]);

    useEffect(() => {
        if (formData.municipio_puesto && formData.municipio_puesto !== 'No Se') {
            fetchPuestos(formData.municipio_puesto);
        } else {
            setPuestosOptions([]);
        }
    }, [formData.municipio_puesto]);

    const fetchPuestos = async (municipio: string) => {
        setLoadingPuestos(true);
        const normalizedMin = municipio.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        try {
            const { data, error } = await (supabase as any)
                .from('puestos_votacion')
                .select('puesto')
                .eq('municipio', normalizedMin)
                .order('puesto', { ascending: true });

            if (error) throw error;
            const options = (data || []).map((p: any) => ({
                value: p.puesto,
                label: p.puesto
            }));
            setPuestosOptions(options);
        } catch (error) {
            console.error('Error fetching puestos:', error);
        } finally {
            setLoadingPuestos(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.cedula || !formData.nombre || !formData.municipio || !formData.telefono || !formData.municipio_puesto || !formData.votos_prometidos) {
            setError('Por favor completa todos los campos requeridos');
            return;
        }

        if (formData.telefono.trim().length !== 10) {
            setError('El número de WhatsApp debe tener exactamente 10 dígitos');
            return;
        }

        let effectiveLeader = isAdmin && formData.selectedLider ? formData.selectedLider : cedulaLider;
        if (effectiveLeader === 'admin') effectiveLeader = null;

        setLoading(true);
        setError('');

        try {
            const { data: existing } = await supabase
                .from('personas')
                .select('cedula')
                .eq('cedula', formData.cedula.trim())
                .single();

            if (existing) {
                setError('Esta cédula ya está registrada en el sistema');
                setLoading(false);
                return;
            }

            let calculateEstado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' = 'PENDIENTE';
            if (formData.municipio === 'No Se' || formData.municipio_puesto === 'No Se') {
                calculateEstado = 'PENDIENTE';
            } else if (formData.municipio === formData.municipio_puesto) {
                calculateEstado = 'APROBADO';
            } else {
                calculateEstado = 'RECHAZADO';
            }

            const { error: insertError } = await (supabase as any).from('personas').insert({
                cedula: formData.cedula.trim(),
                nombre_completo: formData.nombre.trim(),
                telefono: formData.telefono.trim() || null,
                email: formData.email.trim() || null,
                rol: 'impulsor',
                cedula_lider: effectiveLeader,
                lugar_votacion: 'Antioquia',
                municipio_votacion: formData.municipio,
                municipio_puesto: formData.municipio_puesto || null,
                puesto_votacion: formData.puesto_votacion || null,
                mesa_votacion: formData.mesa_votacion || null,
                vota_en_bello: formData.municipio_puesto === 'Bello',
                votos_prometidos: parseInt(formData.votos_prometidos) || 0,
                estado: calculateEstado,
                registrado_por: cedulaLider === 'admin' ? null : cedulaLider,
            });

            if (insertError) throw insertError;

            setSuccess(true);
            setLastRegistered(formData);
            if (effectiveLeader === cedulaLider) {
                setCountImpulsores((prev) => (prev !== null ? prev + 1 : 1));
            }
            toast.success('¡Impulsor electoral registrado exitosamente!');

            setFormData({
                cedula: '',
                nombre: '',
                telefono: '',
                email: '',
                municipio: '',
                municipio_puesto: '',
                puesto_votacion: '',
                mesa_votacion: '',
                votos_prometidos: '',
                selectedLider: formData.selectedLider,
            });
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Error al registrar.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 md:p-8">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
                        Registrar Impulsor Electoral
                    </h1>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Agrega un nuevo impulsor electoral a tu equipo
                    </p>
                </div>

                <div className="bg-card rounded-2xl p-6 mb-6 shadow-sm border border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                            <UserPlus className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground font-medium">Impulsores registrados</p>
                            <p className="text-2xl font-bold font-display text-foreground">
                                {countImpulsores !== null ? countImpulsores : '0'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-panel p-6 mb-8 border-purple-200 bg-purple-50 rounded-2xl">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full">
                            <h2 className="text-xl font-display font-bold text-purple-700 mb-2 flex items-center gap-2">
                                <Share2 className="w-5 h-5" />
                                Invitar Impulsor Electoral
                            </h2>
                            <p className="text-sm text-muted-foreground mb-4">
                                Envía este enlace para que un nuevo impulsor electoral se registre:
                            </p>
                            <div className="flex gap-2 p-3 bg-white border border-purple-200 rounded-xl font-mono text-xs overflow-x-auto w-full">
                                {`${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}&rol=impulsor`}
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 w-full md:w-auto">
                            <button
                                onClick={() => {
                                    const baseUrl = window.location.origin;
                                    const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || '')}&rol=impulsor`;
                                    navigator.clipboard.writeText(msg);
                                    toast.success('¡Mensaje copiado!');
                                }}
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 whitespace-nowrap"
                            >
                                <Copy className="w-4 h-4" />
                                Copiar Mensaje
                            </button>
                            <a
                                href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}&rol=impulsor`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#128C7E] transition-all shadow-lg shadow-green-500/20 whitespace-nowrap"
                            >
                                <MessageSquare className="w-4 h-4" />
                                WhatsApp
                            </a>
                        </div>
                    </div>
                </div>

                <div className="bg-card rounded-2xl p-8 max-w-2xl shadow-sm border border-border">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {isAdmin && (
                            <div>
                                <label className="block text-sm font-medium mb-2">Seleccionar Líder</label>
                                <SearchableSelect
                                    options={leadersOptions}
                                    value={formData.selectedLider}
                                    onChange={(val) => setFormData({ ...formData, selectedLider: val })}
                                    placeholder="Buscar líder..."
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium mb-2">Cédula <span className="text-destructive">*</span></label>
                            <input name="cedula" value={formData.cedula} onChange={handleChange} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Nombre Completo <span className="text-destructive">*</span></label>
                            <input name="nombre" value={formData.nombre} onChange={handleChange} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">WhatsApp <span className="text-destructive">*</span></label>
                            <input name="telefono" value={formData.telefono} onChange={handleChange} className="input-field" placeholder="3001234567" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">¿CON CUÁNTOS VOTOS AYUDA? <span className="text-destructive">*</span></label>
                            <input name="votos_prometidos" type="number" value={formData.votos_prometidos} onChange={handleChange} className="input-field" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Municipio Vive <span className="text-destructive">*</span></label>
                            <SearchableSelect
                                options={MUNICIPIOS_ANTIOQUIA}
                                value={formData.municipio}
                                onChange={(val) => setFormData({ ...formData, municipio: val })}
                                placeholder="Seleccionar municipio"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Municipio Votación <span className="text-destructive">*</span></label>
                            <SearchableSelect
                                options={MUNICIPIOS_ANTIOQUIA}
                                value={formData.municipio_puesto}
                                onChange={(val) => {
                                    setFormData({
                                        ...formData,
                                        municipio_puesto: val,
                                        puesto_votacion: ''
                                    });
                                }}
                                placeholder="Seleccionar municipio"
                            />
                        </div>

                        {formData.municipio_puesto && formData.municipio_puesto !== 'No Se' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Puesto de Votación</label>
                                    <SearchableSelect
                                        options={puestosOptions}
                                        value={formData.puesto_votacion}
                                        onChange={(val) => setFormData({ ...formData, puesto_votacion: val })}
                                        placeholder={loadingPuestos ? "Cargando puestos..." : "Seleccionar puesto"}
                                        disabled={loadingPuestos}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Mesa</label>
                                    <input
                                        name="mesa_votacion"
                                        value={formData.mesa_votacion}
                                        onChange={handleChange}
                                        className="input-field"
                                        placeholder="Ej: 5"
                                    />
                                </div>
                            </div>
                        )}

                        {error && <p className="text-destructive text-sm">{error}</p>}

                        <button type="submit" disabled={loading} className="btn-primary w-full bg-purple-600 hover:bg-purple-700">
                            {loading ? 'Registrando...' : 'Registrar Impulsor'}
                        </button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}
