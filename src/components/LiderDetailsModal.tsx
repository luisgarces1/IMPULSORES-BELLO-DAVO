
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Persona } from "@/types/database";
import { Loader2, User, MapPin, Phone, Mail, Users, CheckCircle, Clock, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
            setAssociates(data || []);
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
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span>{lider.rol.toUpperCase()} - <span className={
                                    lider.estado === 'APROBADO' ? 'text-success' :
                                        lider.estado === 'RECHAZADO' ? 'text-destructive' : 'text-warning'
                                }>{lider.estado}</span></span>
                            </div>
                        </div>
                    </div>

                    {/* Associates List */}
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Equipo de Trabajo
                                <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                    {associates.length}
                                </span>
                            </h3>
                        </div>

                        {loading ? (
                            <div className="flex-1 flex items-center justify-center min-h-[200px]">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <ScrollArea className="h-[40vh] border rounded-lg bg-background p-2">
                                {associates.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                                        <Users className="w-8 h-8 mb-2 opacity-20" />
                                        <p>No tiene asociados registrados</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {associates.map((associate) => (
                                            <div key={associate.cedula} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                                                        {associate.nombre_completo.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium leading-none">{associate.nombre_completo}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">CC: {associate.cedula}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className="text-xs font-medium">{associate.municipio_votacion}</p>
                                                        <p className="text-[10px] text-muted-foreground">{associate.lugar_votacion}</p>
                                                    </div>
                                                    <div title={associate.estado}>
                                                        {getStatusIcon(associate.estado)}
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
