
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
import { SearchableSelect } from "@/components/SearchableSelect";

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
                            <Label htmlFor="telefono" className="flex items-center gap-2">
                                WhatsApp
                                <svg viewBox="0 0 24 24" className="w-3 h-3 text-green-500 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                            </Label>
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

                    <div className="grid gap-2">
                        <Label htmlFor="municipio_votacion">Municipio donde vive</Label>
                        <SearchableSelect
                            options={MUNICIPIOS_ANTIOQUIA}
                            value={formData.municipio_votacion || ""}
                            onChange={(value) => handleChange("municipio_votacion", value)}
                            placeholder="Seleccionar municipio"
                        />
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
