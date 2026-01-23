import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro } from '@/types/database';
import { EditPersonaModal } from '@/components/EditPersonaModal';
import { Search, MapPin, Users, UserCheck, Clock, Pencil, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Asociados() {
  const { isAdmin, cedula } = useAuth();
  const [asociados, setAsociados] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoRegistro | 'TODOS'>('TODOS');
  const [filterAntioquia, setFilterAntioquia] = useState<'TODOS' | 'SI' | 'NO'>('TODOS');
  const [filterLider, setFilterLider] = useState<string>('TODOS');
  const [lideres, setLideres] = useState<Persona[]>([]);
  const [editingAsociado, setEditingAsociado] = useState<Persona | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchAsociados();
    if (isAdmin) {
      fetchLideres();
    }
  }, [isAdmin, cedula]);

  const fetchLideres = async () => {
    try {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .eq('rol', 'lider')
        .order('nombre_completo', { ascending: true });

      if (error) throw error;
      setLideres(data || []);
    } catch (error) {
      console.error('Error fetching lideres:', error);
    }
  };

  const fetchAsociados = async () => {
    setLoading(true);
    try {
      let query = supabase.from('personas').select('*, lider:cedula_lider(nombre_completo)').eq('rol', 'asociado');

      if (!isAdmin) {
        query = query.eq('cedula_lider', cedula);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setAsociados(data || []);
    } catch (error) {
      console.error('Error fetching asociados:', error);
      toast.error('Error al cargar los asociados');
    } finally {
      setLoading(false);
    }
  };

  const updateEstado = async (personaCedula: string, nuevoEstado: EstadoRegistro) => {
    try {
      const { error } = await supabase
        .from('personas')
        .update({ estado: nuevoEstado })
        .eq('cedula', personaCedula);

      if (error) throw error;

      setAsociados((prev) =>
        prev.map((p) =>
          p.cedula === personaCedula ? { ...p, estado: nuevoEstado } : p
        )
      );

      toast.success(`Estado actualizado a ${nuevoEstado}`);
    } catch (error) {
      console.error('Error updating estado:', error);
      toast.error('Error al actualizar el estado');
    }
  };

  const handleSaveAsociado = async (updatedAsociado: Persona, assignedAssociateIds?: string[]) => {
    try {
      // 1. Update the persona itself
      const { error } = await supabase
        .from('personas')
        .update({
          nombre_completo: updatedAsociado.nombre_completo,
          telefono: updatedAsociado.telefono,
          email: updatedAsociado.email,
          lugar_votacion: updatedAsociado.lugar_votacion,
          municipio_votacion: updatedAsociado.municipio_votacion,
          vota_en_bello: updatedAsociado.vota_en_bello,
          cedula_lider: updatedAsociado.rol === 'lider' ? null : updatedAsociado.cedula_lider,
          rol: updatedAsociado.rol,
          estado: updatedAsociado.estado,
        })
        .eq('cedula', updatedAsociado.cedula);

      if (error) throw error;

      // 2. If it's a leader now, handle associated assignments
      if (updatedAsociado.rol === 'lider' && assignedAssociateIds) {
        // Reset current associations of this person (just in case they were already a leader)
        // For associate-to-leader case, this is just assigning new ones.

        // Block update: set cedula_lider of all selected associates
        await supabase
          .from('personas')
          .update({ cedula_lider: updatedAsociado.cedula })
          .in('cedula', assignedAssociateIds);

        // Any associate that was under this leader but not in the list should be unassigned
        // (Only if they were already a leader, but for simplicity we do it)
        if (assignedAssociateIds.length > 0) {
          await supabase
            .from('personas')
            .update({ cedula_lider: null })
            .eq('cedula_lider', updatedAsociado.cedula)
            .not('cedula', 'in', assignedAssociateIds);
        } else {
          await supabase
            .from('personas')
            .update({ cedula_lider: null })
            .eq('cedula_lider', updatedAsociado.cedula);
        }
      }

      toast.success(updatedAsociado.rol === 'lider'
        ? '¡Promovido a Líder y equipo asignado!'
        : 'Asociado actualizado correctamente'
      );

      setIsEditModalOpen(false);
      fetchAsociados(); // Refresh all to reflect role changes
      if (isAdmin) fetchLideres();
    } catch (error) {
      console.error('Error updating asociado:', error);
      toast.error('Error al actualizar el registro');
    }
  };

  const filteredAsociados = asociados.filter((asociado) => {
    const matchesSearch =
      asociado.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asociado.cedula.includes(searchTerm);
    const matchesEstado = filterEstado === 'TODOS' || asociado.estado === filterEstado;
    const matchesAntioquia =
      filterAntioquia === 'TODOS' ||
      (filterAntioquia === 'SI' && asociado.lugar_votacion === 'Antioquia') ||
      (filterAntioquia === 'NO' && asociado.lugar_votacion !== 'Antioquia');
    const matchesLider = filterLider === 'TODOS' || asociado.cedula_lider === filterLider;

    return matchesSearch && matchesEstado && matchesAntioquia && matchesLider;
  });

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando asociados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-2">
            {isAdmin ? 'Todos los Asociados' : 'Mis Asociados'}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {isAdmin
              ? 'Gestiona todos los asociados registrados en el sistema'
              : 'Visualiza y gestiona tu equipo de asociados'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total</p>
                <p className="text-xl font-bold font-display">{asociados.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Aprobados</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.estado === 'APROBADO').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pendientes</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.estado === 'PENDIENTE').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Rechazados</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.estado === 'RECHAZADO').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Votan Antioquia</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.lugar_votacion === 'Antioquia').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por nombre o cédula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10 h-11"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as EstadoRegistro | 'TODOS')}
              className="input-field w-full sm:w-auto h-11"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="APROBADO">Aprobado</option>
              <option value="RECHAZADO">Rechazado</option>
            </select>
            <select
              value={filterAntioquia}
              onChange={(e) => setFilterAntioquia(e.target.value as 'TODOS' | 'SI' | 'NO')}
              className="input-field w-full sm:w-auto h-11"
            >
              <option value="TODOS">Votación: Todos</option>
              <option value="SI">Votan en Antioquia</option>
              <option value="NO">Fuera de Antioquia</option>
            </select>
            {isAdmin && (
              <select
                value={filterLider}
                onChange={(e) => setFilterLider(e.target.value)}
                className="input-field w-full sm:w-auto h-11"
              >
                <option value="TODOS">Todos los líderes</option>
                {lideres.map((lider) => (
                  <option key={lider.cedula} value={lider.cedula}>
                    Líder: {lider.nombre_completo}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel overflow-hidden border border-border/50">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)]">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="table-header py-4 px-6">Nombre</th>
                  <th className="table-header py-4 px-6">Cédula</th>
                  <th className="table-header py-4 px-6 text-center">Estado</th>
                  <th className="table-header py-4 px-6">WhatsApp</th>
                  <th className="table-header py-4 px-6">Email</th>
                  <th className="table-header py-4 px-6">Líder</th>
                  <th className="table-header py-4 px-6 text-center">Municipio</th>
                  <th className="table-header py-4 px-6 text-center">Departamento</th>
                  <th className="table-header py-4 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAsociados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 9 : 8}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No se encontraron asociados
                    </td>
                  </tr>
                ) : (
                  filteredAsociados.map((asociado) => (
                    <tr
                      key={asociado.cedula}
                      className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium">{asociado.nombre_completo}</td>
                      <td className="py-4 px-6 text-muted-foreground">{asociado.cedula}</td>
                      <td className="py-4 px-6 text-center">
                        <StatusBadge estado={asociado.estado} />
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {asociado.telefono ? (
                          <a
                            href={`https://wa.me/${asociado.telefono.replace(/[\s-]/g, '')}?text=${encodeURIComponent('Hola, soy el coordinador electoral, ¿cómo vas con la inscripción de tus colaboradores?')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4 font-medium"
                          >
                            {asociado.telefono}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {asociado.email || '-'}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {asociado.lider?.nombre_completo || asociado.cedula_lider || '-'}
                      </td>
                      <td className="py-4 px-6 text-center text-muted-foreground text-sm">
                        {asociado.municipio_votacion || '-'}
                      </td>
                      <td className="py-4 px-6 text-center text-muted-foreground text-sm">
                        {asociado.lugar_votacion || '-'}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isAdmin && (
                            <select
                              value={asociado.estado}
                              onChange={(e) =>
                                updateEstado(asociado.cedula, e.target.value as EstadoRegistro)
                              }
                              className="text-xs px-2 py-1 bg-background border border-border rounded shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="PENDIENTE">Pendiente</option>
                              <option value="APROBADO">Aprobado</option>
                              <option value="RECHAZADO">Rechazado</option>
                            </select>
                          )}
                          <button
                            onClick={() => {
                              setEditingAsociado(asociado);
                              setIsEditModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            title="Editar Asociado"
                          >
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <EditPersonaModal
          person={editingAsociado}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingAsociado(null);
          }}
          onSave={handleSaveAsociado}
          lideres={lideres}
        />

      </div >
    </Layout >
  );
}
