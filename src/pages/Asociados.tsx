import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro } from '@/types/database';
import { EditPersonaModal } from '@/components/EditPersonaModal';
import { SearchableSelect } from '@/components/SearchableSelect';
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
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <div className="w-full sm:w-[200px]">
              <SearchableSelect
                options={[
                  { value: 'TODOS', label: 'Todos los estados' },
                  { value: 'PENDIENTE', label: 'Pendiente' },
                  { value: 'APROBADO', label: 'Aprobado' },
                  { value: 'RECHAZADO', label: 'Rechazado' },
                ]}
                value={filterEstado}
                onChange={(val) => setFilterEstado((val || 'TODOS') as EstadoRegistro | 'TODOS')}
                placeholder="Todos los estados"
              />
            </div>
            <div className="w-full sm:w-[200px]">
              <SearchableSelect
                options={[
                  { value: 'TODOS', label: 'Votación: Todos' },
                  { value: 'SI', label: 'Votan en Antioquia' },
                  { value: 'NO', label: 'Fuera de Antioquia' },
                ]}
                value={filterAntioquia}
                onChange={(val) => setFilterAntioquia((val || 'TODOS') as 'TODOS' | 'SI' | 'NO')}
                placeholder="Votación: Todos"
              />
            </div>
            {isAdmin && (
              <div className="w-full sm:w-[280px]">
                <SearchableSelect
                  options={[
                    { value: 'TODOS', label: 'Todos los líderes' },
                    ...lideres.map(l => ({ value: l.cedula, label: `Líder: ${l.nombre_completo}` }))
                  ]}
                  value={filterLider}
                  onChange={(val) => setFilterLider(val || 'TODOS')}
                  placeholder="Todos los líderes"
                />
              </div>
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
                          <div className="flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-green-500 fill-current shrink-0" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                            <a
                              href={`https://wa.me/${asociado.telefono.replace(/[\s-]/g, '')}?text=${encodeURIComponent('Hola, soy el coordinador electoral, ¿cómo vas con la inscripción de tus colaboradores?')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 transition-colors font-medium"
                            >
                              {asociado.telefono}
                            </a>
                          </div>
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
