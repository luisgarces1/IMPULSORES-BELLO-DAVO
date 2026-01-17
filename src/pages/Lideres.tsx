import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro, LiderWithStats } from '@/types/database';
import { Search, MapPin, Users, Phone, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Lideres() {
  const [lideres, setLideres] = useState<LiderWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoRegistro | 'TODOS'>('TODOS');

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

      const lideresWithStats: LiderWithStats[] = (lideresData || []).map((lider) => {
        const misAsociados = (asociadosData || []).filter(
          (a) => a.cedula_lider === lider.cedula
        );
        return {
          ...lider,
          total_asociados: misAsociados.length,
          votan_bello: misAsociados.filter((a) => a.vota_en_bello).length,
          no_votan_bello: misAsociados.filter((a) => !a.vota_en_bello).length,
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
            Administra todos los líderes electorales y sus equipos
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <div key={lider.cedula} className="glass-panel p-6 animate-fade-in flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
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
                  <div className="shrink-0">
                    <StatusBadge estado={lider.estado} />
                  </div>
                </div>

                <div className="space-y-3 mb-6 flex-1">
                  {lider.telefono && (
                    <div className="flex items-center gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                      <div className="p-1.5 bg-background rounded-md shadow-sm">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium">{lider.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/30 p-2 rounded-lg">
                    <div className="p-1.5 bg-background rounded-md shadow-sm shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="leading-tight">{lider.lugar_votacion || 'Sin asignar'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-4 bg-primary/5 rounded-xl mb-6">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Equip</p>
                    <p className="text-lg font-bold font-display text-primary">{lider.total_asociados}</p>
                  </div>
                  <div className="text-center border-x border-primary/10">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Bello</p>
                    <p className="text-lg font-bold font-display text-success">
                      {lider.votan_bello}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider mb-1">Otros</p>
                    <p className="text-lg font-bold font-display text-warning">
                      {lider.no_votan_bello}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
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
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
