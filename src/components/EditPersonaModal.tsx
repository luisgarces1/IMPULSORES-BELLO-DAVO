
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Persona, UserRole, EstadoRegistro } from "@/types/database";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { MUNICIPIOS_ANTIOQUIA } from "@/constants/locations";

interface EditPersonaModalProps {
    person: Persona | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPerson: Persona, assignedAssociateIds?: string[]) => Promise<void>;
    lideres?: Persona[]; // List of leaders for selection (only if editing an associate)
}

export function EditPersonaModal({
    person,
    isOpen,
    onClose,
    onSave,
    lideres = [],
}: EditPersonaModalProps) {
    const [formData, setFormData] = useState<Partial<Persona>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [allAssociates, setAllAssociates] = useState<Persona[]>([]);
    const [selectedAssociateIds, setSelectedAssociateIds] = useState<string[]>([]);
    const [loadingAssociates, setLoadingAssociates] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (person && isOpen) {
            setFormData({
                ...person,
            });
            if (person.rol === 'lider' || formData.rol === 'lider') {
                fetchAssociates(person.cedula);
            }
        }
    }, [person, isOpen]);

    useEffect(() => {
        if (formData.rol === 'lider' && person) {
            fetchAssociates(person.cedula);
        }
    }, [formData.rol]);

    const fetchAssociates = async (liderCedula: string) => {
        setLoadingAssociates(true);
        try {
            const { data, error } = await supabase
                .from('personas')
                .select('*')
                .eq('rol', 'asociado');

            if (error) throw error;
            setAllAssociates(data || []);

            // Current associates of this leader
            const currentSelected = (data || [])
                .filter(a => a.cedula_lider === liderCedula)
                .map(a => a.cedula);
            setSelectedAssociateIds(currentSelected);
        } catch (error) {
            console.error("Error fetching associates:", error);
        } finally {
            setLoadingAssociates(false);
        }
    };

    const handleChange = (field: keyof Persona, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleToggleAssociate = (cedula: string) => {
        setSelectedAssociateIds(prev => {
            if (prev.includes(cedula)) {
                return prev.filter(id => id !== cedula);
            } else {
                if (prev.length >= 60) {
                    toast.error("Un líder no puede tener más de 60 asociados");
                    return prev;
                }
                return [...prev, cedula];
            }
        });
    };

    const handleSave = async () => {
        if (!person || !formData) return;
        setIsSaving(true);
        try {
            await onSave(formData as Persona, formData.rol === 'lider' ? selectedAssociateIds : undefined);
            onClose();
        } catch (error) {
            console.error("Error saving:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!person) return null;

    const filteredAssociates = allAssociates.filter(a =>
        a.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.cedula.includes(searchTerm)
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar {formData.rol === 'asociado' ? 'Asociado' : 'Líder'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="nombre_completo">Nombre Completo</Label>
                            <Input
                                id="nombre_completo"
                                value={formData.nombre_completo || ""}
                                onChange={(e) => handleChange("nombre_completo", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="rol">Rol</Label>
                            <Select
                                value={formData.rol || ""}
                                onValueChange={(value) => handleChange("rol", value as UserRole)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar rol" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="asociado">Asociado</SelectItem>
                                    <SelectItem value="lider">Líder</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="cedula">Cédula (No editable)</Label>
                        <Input
                            id="cedula"
                            value={formData.cedula || ""}
                            disabled
                            className="bg-muted"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="telefono">WhatsApp</Label>
                            <Input
                                id="telefono"
                                value={formData.telefono || ""}
                                onChange={(e) => handleChange("telefono", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Correo Electrónico</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email || ""}
                                onChange={(e) => handleChange("email", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="estado">Estado de Registro</Label>
                            <Select
                                value={formData.estado || "PENDIENTE"}
                                onValueChange={(value) => handleChange("estado", value as EstadoRegistro)}
                            >
                                <SelectTrigger id="estado">
                                    <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                                    <SelectItem value="APROBADO">Aprobado</SelectItem>
                                    <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="municipio_votacion">Municipio de Votación</Label>
                            <Select
                                value={formData.municipio_votacion || "Bello"}
                                onValueChange={(value) => {
                                    handleChange("municipio_votacion", value);
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar municipio" />
                                </SelectTrigger>
                                <SelectContent>
                                    {MUNICIPIOS_ANTIOQUIA.map((m) => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="lugar_votacion">Departamento donde vota</Label>
                            <Select
                                value={formData.lugar_votacion || "Antioquia"}
                                onValueChange={(value) => handleChange("lugar_votacion", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar departamento" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Antioquia">Antioquia</SelectItem>
                                    <SelectItem value="Otro departamento">Otro departamento</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.rol === 'asociado' ? (
                        <div className="grid gap-2">
                            <Label htmlFor="cedula_lider">Líder Asignado</Label>
                            <Select
                                value={formData.cedula_lider || ""}
                                onValueChange={(value) => handleChange("cedula_lider", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar líder" />
                                </SelectTrigger>
                                <SelectContent>
                                    {lideres.map((lider) => (
                                        <SelectItem key={lider.cedula} value={lider.cedula}>
                                            {lider.nombre_completo}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="grid gap-2 border-t pt-4 mt-2">
                            <div className="flex justify-between items-center">
                                <Label className="text-primary font-bold">Asignar Asociados a este Líder</Label>
                                <span className={`text-xs font-bold ${selectedAssociateIds.length > 60 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    {selectedAssociateIds.length} / 60
                                </span>
                            </div>
                            <div className="relative mb-2">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar asociados..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {loadingAssociates ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                </div>
                            ) : (
                                <div className="grid gap-2 max-h-[200px] overflow-y-auto border rounded-md p-2 bg-muted/20">
                                    {filteredAssociates.length === 0 ? (
                                        <p className="text-xs text-center p-4 text-muted-foreground">No se encontraron asociados disponibles</p>
                                    ) : (
                                        filteredAssociates.map((associate) => (
                                            <div key={associate.cedula} className="flex items-center space-x-2 p-1 hover:bg-background rounded transition-colors">
                                                <Checkbox
                                                    id={`assoc-${associate.cedula}`}
                                                    checked={selectedAssociateIds.includes(associate.cedula)}
                                                    onCheckedChange={() => handleToggleAssociate(associate.cedula)}
                                                />
                                                <label
                                                    htmlFor={`assoc-${associate.cedula}`}
                                                    className="text-sm font-medium leading-none cursor-pointer flex-1"
                                                >
                                                    {associate.nombre_completo}
                                                    <span className="text-[10px] text-muted-foreground ml-2">CC: {associate.cedula}</span>
                                                </label>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">
                                Selecciona los asociados que formarán parte del equipo de este líder.
                            </p>
                        </div>
                    )}

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
