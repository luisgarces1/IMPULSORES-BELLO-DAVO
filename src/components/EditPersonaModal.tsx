
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Persona } from "@/types/database";

interface EditPersonaModalProps {
    person: Persona | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedPerson: Persona) => Promise<void>;
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

    useEffect(() => {
        if (person) {
            setFormData({
                ...person,
            });
        }
    }, [person, isOpen]);

    const handleChange = (field: keyof Persona, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!person || !formData) return;
        setIsSaving(true);
        try {
            await onSave(formData as Persona);
            onClose();
        } catch (error) {
            console.error("Error saving:", error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!person) return null;

    const isAssociate = person.rol === 'asociado';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar {isAssociate ? 'Asociado' : 'Líder'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="nombre_completo">Nombre Completo</Label>
                        <Input
                            id="nombre_completo"
                            value={formData.nombre_completo || ""}
                            onChange={(e) => handleChange("nombre_completo", e.target.value)}
                        />
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
                    <div className="grid gap-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                            id="telefono"
                            value={formData.telefono || ""}
                            onChange={(e) => handleChange("telefono", e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="lugar_votacion">Lugar de Votación</Label>
                        <Input
                            id="lugar_votacion"
                            value={formData.lugar_votacion || ""}
                            onChange={(e) => handleChange("lugar_votacion", e.target.value)}
                        />
                    </div>
                    {/* Only show leader selection if editing an associate */}
                    {isAssociate && (
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
                    )}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="vota_en_bello">¿Vota en Bello?</Label>
                        <Switch
                            id="vota_en_bello"
                            checked={formData.vota_en_bello || false}
                            onCheckedChange={(checked) => handleChange("vota_en_bello", checked)}
                        />
                    </div>

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
