import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro, LiderWithStats } from '@/types/database';
import { Search, Filter, MapPin, Users, Phone } from 'lucide-react';
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
      // Get all lideres
      const { data: lideresData, error: lideresError } = await supabase
        .from('personas')
        .select('*')
        .eq('rol', 'lider')
        .order('created_at', { ascending: false });

      if (lideresError) throw lideresError;

      // Get all asociados to calculate stats
      const { data: asociadosData } = await supabase
        .from('personas')
        .select('*')
        .eq('rol', 'asociado');

      // Calculate stats for each lider
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
        <div className="p-8 flex items-center justify-center h-[80vh]">
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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Gestión de Líderes
          </h1>
          <p className="text-muted-foreground">
            Administra todos los líderes electorales y sus equipos
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Líderes</p>
                <p className="text-xl font-bold font-display">{lideres.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-xl font-bold font-display">
                  {lideres.filter((l) => l.estado === 'PENDIENTE').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-success" />
              <div>
                <p className="text-xs text-muted-foreground">Aprobados</p>
                <p className="text-xl font-bold font-display">
                  {lideres.filter((l) => l.estado === 'APROBADO').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <div>
                <p className="text-xs text-muted-foreground">Rechazados</p>
                <p className="text-xl font-bold font-display">
                  {lideres.filter((l) => l.estado === 'RECHAZADO').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-panel p-4 mb-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[240px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre o cédula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as EstadoRegistro | 'TODOS')}
                className="input-field w-auto"
              >
                <option value="TODOS">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Líderes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLideres.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No se encontraron líderes
            </div>
          ) : (
            filteredLideres.map((lider) => (
              <div key={lider.cedula} className="glass-panel p-6 animate-fade-in">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {lider.nombre_completo.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{lider.nombre_completo}</h3>
                      <p className="text-sm text-muted-foreground">CC: {lider.cedula}</p>
                    </div>
                  </div>
                  <StatusBadge estado={lider.estado} />
                </div>

                <div className="space-y-3 mb-4">
                  {lider.telefono && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{lider.telefono}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{lider.lugar_votacion || 'Sin asignar'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg mb-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Asociados</p>
                    <p className="text-lg font-bold font-display">{lider.total_asociados}</p>
                  </div>
                  <div className="text-center border-x border-border">
                    <p className="text-xs text-muted-foreground">Bello</p>
                    <p className="text-lg font-bold font-display text-success">
                      {lider.votan_bello}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Otros</p>
                    <p className="text-lg font-bold font-display text-warning">
                      {lider.no_votan_bello}
                    </p>
                  </div>
                </div>

                <select
                  value={lider.estado}
                  onChange={(e) => updateEstado(lider.cedula, e.target.value as EstadoRegistro)}
                  className="w-full text-sm px-3 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="PENDIENTE">Pendiente</option>
                  <option value="APROBADO">Aprobado</option>
                  <option value="RECHAZADO">Rechazado</option>
                </select>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
