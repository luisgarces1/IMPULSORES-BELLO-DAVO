
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Persona } from "@/types/database";
import { Loader2, User, MapPin, Phone, Mail, Users, CheckCircle, Clock, XCircle, Share2, Copy, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface LiderDetailsModalProps {
    lider: Persona | null;
    isOpen: boolean;
    onClose: () => void;
}

export function LiderDetailsModal({ lider, isOpen, onClose }: LiderDetailsModalProps) {
    const [associates, setAssociates] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lider && isOpen) {
            fetchAssociates(lider.cedula);
        }
    }, [lider, isOpen]);

    const fetchAssociates = async (liderCedula: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('*')
                .eq('rol', 'asociado')
                .eq('cedula_lider', liderCedula)
                .order('nombre_completo', { ascending: true });

            if (error) throw error;
            const associatesWithFields: Persona[] = (data || []).map((p: any) => ({
                ...p,
                municipio_puesto: p.municipio_puesto || null,
                puesto_votacion: p.puesto_votacion || null,
                mesa_votacion: p.mesa_votacion || null,
                notas: p.notas || null,
                updated_at: p.updated_at || p.created_at,
                registrado_por: p.registrado_por || null,
            }));
            setAssociates(associatesWithFields);
        } catch (error) {
            console.error("Error fetching associates:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!lider) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APROBADO': return <CheckCircle className="w-4 h-4 text-success" />;
            case 'PENDIENTE': return <Clock className="w-4 h-4 text-warning" />;
            case 'RECHAZADO': return <XCircle className="w-4 h-4 text-destructive" />;
            default: return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-lg font-bold text-primary">
                                {lider.nombre_completo.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div>
                            {lider.nombre_completo}
                            <p className="text-sm text-muted-foreground font-normal">CC: {lider.cedula}</p>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-6 py-4">
                    {/* Lider Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{lider.telefono || "Sin teléfono"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="w-4 h-4 text-muted-foreground" />
                                <span>{lider.email || "Sin email"}</span>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{lider.municipio_votacion || "Sin municipio"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>{lider.rol.toUpperCase()} - <span className={
                                    lider.estado === 'APROBADO' ? 'text-success' :
                                        lider.estado === 'RECHAZADO' ? 'text-destructive' : 'text-warning'
                                }>{lider.estado}</span></span>
                            </div>
                        </div>
                        {lider.notas && (
                            <div className="col-span-1 md:col-span-2 mt-2 pt-2 border-t border-border/50">
                                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-1">Notas / Observaciones</p>
                                <p className="text-sm italic text-muted-foreground">{lider.notas}</p>
                            </div>
                        )}
                    </div>

                    {/* Invitation Link Section (Admin can see/copy for the leader) */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 text-primary font-bold text-sm">
                                <Share2 className="w-4 h-4" />
                                Enlace de Invitación para {lider.nombre_completo.split(' ')[0]}
                            </div>
                            <div className="p-2 bg-background border rounded-lg font-mono text-[10px] break-all text-muted-foreground">
                                {`${window.location.origin}/registro?lider=${encodeURIComponent(lider.nombre_completo)}`}
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    className="flex-1 gap-2 text-xs h-9"
                                    onClick={() => {
                                        const msg = `Hola soy ${lider.nombre_completo}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(lider.nombre_completo)}`;
                                        navigator.clipboard.writeText(msg);
                                        toast.success("¡Mensaje de invitación copiado!");
                                    }}
                                >
                                    <Copy className="w-3 h-3" />
                                    Copiar
                                </Button>
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${lider.nombre_completo}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(lider.nombre_completo)}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#25D366] text-white rounded-md font-medium hover:bg-[#128C7E] transition-all text-xs h-9"
                                >
                                    <MessageSquare className="w-3 h-3" />
                                    WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Associates List */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-4 px-1">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Equipo de Trabajo
                                <span className="bg-primary/10 text-primary text-sm px-2.5 py-0.5 rounded-full">
                                    {associates.length}
                                </span>
                            </h3>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <ScrollArea className="h-[500px] border rounded-lg bg-background p-2">
                                {associates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                                        <Users className="w-12 h-12 mb-4 opacity-20" />
                                        <p className="text-lg">No tiene asociados registrados</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {associates.map((associate) => (
                                            <div key={associate.cedula} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                                                        {associate.nombre_completo.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-base font-semibold leading-none">{associate.nombre_completo}</p>
                                                        <p className="text-sm text-muted-foreground mt-1.5 font-mono">CC: {associate.cedula}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-1 items-end shrink-0">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-sm font-bold text-primary leading-tight">{associate.municipio_puesto || '-'}</p>
                                                        <p className="text-xs text-muted-foreground leading-tight truncate max-w-[200px] mt-1" title={associate.puesto_votacion || ''}>
                                                            {associate.puesto_votacion || 'Sin puesto'}
                                                        </p>
                                                        <div className="flex items-center justify-end gap-2 mt-2">
                                                            <span className="text-[10px] bg-muted px-2 py-1 rounded-md text-muted-foreground font-mono">
                                                                Mesa: {associate.mesa_votacion || '-'}
                                                            </span>
                                                            <div title={associate.estado} className="scale-110">
                                                                {getStatusIcon(associate.estado)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={onClose}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
