import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro, LiderWithStats } from '@/types/database';
import { EditPersonaModal } from '@/components/EditPersonaModal';
import { LiderDetailsModal } from '@/components/LiderDetailsModal';
import { Search, MapPin, Users, Phone, Shield, UserCheck, AlertCircle, Pencil, XCircle, MessageSquare, Info, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Lideres() {
  const navigate = useNavigate();
  const [lideres, setLideres] = useState<LiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoRegistro | 'TODOS'>('TODOS');
  const [editingLider, setEditingLider] = useState<Persona | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingLider, setViewingLider] = useState<Persona | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    fetchLideres();
  }, []);

  const fetchLideres = async () => {
    setLoading(true);
    try {
      const { data: lideresData, error: lideresError } = await supabase
        .from('personas')
        .select('*')
        .eq('rol', 'lider')
        .order('created_at', { ascending: false });

      if (lideresError) throw lideresError;

      const { data: asociadosData } = await supabase
        .from('personas')
        .select('*')
        .eq('rol', 'asociado');

      const lideresWithStats: LiderWithStats[] = (lideresData || []).map((lider: any) => {
        const misAsociados = (asociadosData || []).filter(
          (a) => a.cedula_lider === lider.cedula
        );
        return {
          ...lider,
          municipio_puesto: lider.municipio_puesto || null,
          puesto_votacion: lider.puesto_votacion || null,
          mesa_votacion: lider.mesa_votacion || null,
          notas: lider.notas || null,
          total_asociados: misAsociados.length,
          votan_antioquia: misAsociados.filter((a) => a.lugar_votacion === 'Antioquia').length,
          no_votan_antioquia: misAsociados.filter((a) => a.lugar_votacion !== 'Antioquia').length,
        };
      });

      setLideres(lideresWithStats);
    } catch (error) {
      console.error('Error fetching lideres:', error);
      toast.error('Error al cargar los líderes');
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

      setLideres((prev) =>
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

  const handleSaveLider = async (updatedLider: Persona, assignedAssociateIds?: string[]) => {
    try {
      // 1. Update the persona itself
      const { error } = await supabase
        .from('personas')
        .update({
          nombre_completo: updatedLider.nombre_completo,
          telefono: updatedLider.telefono,
          email: updatedLider.email,
          lugar_votacion: updatedLider.lugar_votacion,
          municipio_votacion: updatedLider.municipio_votacion,
          municipio_puesto: updatedLider.municipio_puesto,
          puesto_votacion: updatedLider.puesto_votacion,
          mesa_votacion: updatedLider.mesa_votacion,
          rol: updatedLider.rol,
          estado: updatedLider.estado,
          notas: updatedLider.notas,
          // If downgrading to associate, they need a leader or null
          cedula_lider: updatedLider.rol === 'asociado' ? updatedLider.cedula_lider : null,
        })
        .eq('cedula', updatedLider.cedula);

      if (error) throw error;

      // 2. Handle team assignments/removals
      if (updatedLider.rol === 'lider' && assignedAssociateIds) {
        // Set new team
        await supabase
          .from('personas')
          .update({ cedula_lider: updatedLider.cedula })
          .in('cedula', assignedAssociateIds);

        // Remove those no longer in team
        if (assignedAssociateIds.length > 0) {
          await supabase
            .from('personas')
            .update({ cedula_lider: null })
            .eq('cedula_lider', updatedLider.cedula)
            .not('cedula', 'in', assignedAssociateIds);
        } else {
          await supabase
            .from('personas')
            .update({ cedula_lider: null })
            .eq('cedula_lider', updatedLider.cedula);
        }
      } else if (updatedLider.rol === 'asociado') {
        // If downgraded, their former team is orphaned
        await supabase
          .from('personas')
          .update({ cedula_lider: null })
          .eq('cedula_lider', updatedLider.cedula);
      }

      toast.success(updatedLider.rol === 'asociado'
        ? 'Líder cambiado a Asociado'
        : 'Líder actualizado correctamente'
      );

      setIsEditModalOpen(false);
      fetchLideres();
    } catch (error) {
      console.error('Error updating lider:', error);
      toast.error('Error al actualizar el registro');
    }
  };

  const filteredLideres = lideres.filter((lider) => {
    const matchesSearch =
      lider.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lider.cedula.includes(searchTerm);
    const matchesEstado = filterEstado === 'TODOS' || lider.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  if (loading) {
    return (
      <Layout>
        <div className="p-4 md:p-8 flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando líderes...</p>
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
            Gestión de Líderes
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Administra todos los líderes y sus equipos
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Líderes</p>
                <p className="text-xl font-bold font-display">{lideres.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pendientes</p>
                <p className="text-xl font-bold font-display">
                  {lideres.filter((l) => l.estado === 'PENDIENTE').length}
                </p>
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
                  {lideres.filter((l) => l.estado === 'APROBADO').length}
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
                  {lideres.filter((l) => l.estado === 'RECHAZADO').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Asociados Totales</p>
                <p className="text-xl font-bold font-display">
                  {lideres.reduce((acc, l) => acc + l.total_asociados, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
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
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as EstadoRegistro | 'TODOS')}
            className="input-field w-full sm:w-48 h-11"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="APROBADO">Aprobado</option>
            <option value="RECHAZADO">Rechazado</option>
          </select>
        </div>

        {/* Líderes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredLideres.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground bg-card rounded-2xl border border-dashed border-border">
              No se encontraron líderes
            </div>
          ) : (
            filteredLideres.map((lider) => (
              <div key={lider.cedula} className="glass-panel p-6 animate-fade-in flex flex-col relative group">
                <div className="absolute top-6 right-6">
                  <StatusBadge estado={lider.estado} />
                </div>
                <div className="flex items-start gap-4 mb-6 pr-24">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary">
                      {lider.nombre_completo.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate" title={lider.nombre_completo}>
                      {lider.nombre_completo}
                    </h3>
                    <p className="text-xs text-muted-foreground">CC: {lider.cedula}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {lider.telefono && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <div className="p-1.5 bg-background rounded-md shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-green-500 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
                      </div>
                      <a
                        href={`https://wa.me/57${lider.telefono.replace(/[\s-]/g, '')}?text=${encodeURIComponent(
                          lider.rol === 'lider'
                            ? 'Hola, soy el coordinador electoral, ¿cómo vas con la inscripción de tus colaboradores?'
                            : 'Hola, soy el coordinador electoral, nos encanta tu apoyo a este proyecto, sigue invitando amigos a este equipo ganador. Mil gracias.'
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-500 hover:text-blue-600 transition-colors"
                      >
                        {lider.telefono}
                      </a>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-background rounded-md shadow-sm shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-tight font-medium" title="Municipio donde vive">{lider.municipio_votacion || 'Sin municipio'}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-background rounded-md shadow-sm shrink-0">
                        <Vote className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="leading-tight font-bold text-foreground text-xs" title="Municipio y Puesto de Votación">
                          {lider.municipio_puesto || 'Sin municipio'} - {lider.puesto_votacion || 'Sin puesto'}
                        </span>
                        <span className="text-[10px] opacity-70">
                          Mesa: {lider.mesa_votacion || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {lider.notas && (
                    <div className="mt-2 text-xs italic text-muted-foreground line-clamp-2 px-1" title={lider.notas}>
                      <span className="font-bold not-italic">Notas: </span>
                      {lider.notas}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 p-4 bg-primary/5 rounded-xl mb-6">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Equip</p>
                    <p className="text-lg font-bold font-display text-primary">{lider.total_asociados}</p>
                  </div>
                  <div className="text-center border-x border-primary/10">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Antioq</p>
                    <p className="text-lg font-bold font-display text-success">
                      {lider.votan_antioquia}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Otros</p>
                    <p className="text-lg font-bold font-display text-warning">
                      {lider.no_votan_antioquia}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/50">
                  <div className="space-y-2 flex-1">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1">
                      Cambiar Estado
                    </label>
                    <select
                      value={lider.estado}
                      onChange={(e) => updateEstado(lider.cedula, e.target.value as EstadoRegistro)}
                      className="w-full text-sm px-3 py-2.5 bg-background border border-border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                    >
                      <option value="PENDIENTE">Pendiente</option>
                      <option value="APROBADO">Aprobado</option>
                      <option value="RECHAZADO">Rechazado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest pl-1 invisible">
                      Editar
                    </label>
                    <button
                      onClick={() => {
                        setViewingLider(lider);
                        setIsDetailsModalOpen(true);
                      }}
                      className="h-[42px] px-4 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors border border-blue-200 mb-2"
                      title="Ver Detalles"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingLider(lider);
                        setIsEditModalOpen(true);
                      }}
                      className="h-[42px] px-4 flex items-center justify-center bg-muted/50 hover:bg-muted text-foreground rounded-lg transition-colors border border-border"
                      title="Editar Líder"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        navigate(`/chat?lider=${lider.cedula}&nombre=${encodeURIComponent(lider.nombre_completo)}`);
                      }}
                      className="h-[42px] px-4 flex items-center justify-center bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors border border-primary/20"
                      title="Chatear con Líder"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <EditPersonaModal
          person={editingLider}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingLider(null);
          }}
          onSave={handleSaveLider}
        />

        <LiderDetailsModal
          lider={viewingLider}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false);
            setViewingLider(null);
          }}
        />
      </div>
    </Layout>
  );
}
