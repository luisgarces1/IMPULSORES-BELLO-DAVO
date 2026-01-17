import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Persona, EstadoRegistro } from '@/types/database';
import { Search, Filter, MapPin, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Asociados() {
  const { isAdmin, cedula } = useAuth();
  const [asociados, setAsociados] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<EstadoRegistro | 'TODOS'>('TODOS');
  const [filterBello, setFilterBello] = useState<'TODOS' | 'SI' | 'NO'>('TODOS');

  useEffect(() => {
    fetchAsociados();
  }, [isAdmin, cedula]);

  const fetchAsociados = async () => {
    setLoading(true);
    try {
      let query = supabase.from('personas').select('*').eq('rol', 'asociado');

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

  const filteredAsociados = asociados.filter((asociado) => {
    const matchesSearch =
      asociado.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asociado.cedula.includes(searchTerm);
    const matchesEstado = filterEstado === 'TODOS' || asociado.estado === filterEstado;
    const matchesBello =
      filterBello === 'TODOS' ||
      (filterBello === 'SI' && asociado.vota_en_bello) ||
      (filterBello === 'NO' && !asociado.vota_en_bello);

    return matchesSearch && matchesEstado && matchesBello;
  });

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center h-[80vh]">
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
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            {isAdmin ? 'Todos los Asociados' : 'Mis Asociados'}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Gestiona todos los asociados registrados en el sistema'
              : 'Visualiza y gestiona tu equipo de asociados'}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold font-display">{asociados.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-success" />
              <div>
                <p className="text-xs text-muted-foreground">Votan Bello</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.vota_en_bello).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <div>
                <p className="text-xs text-muted-foreground">Pendientes</p>
                <p className="text-xl font-bold font-display">
                  {asociados.filter((a) => a.estado === 'PENDIENTE').length}
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
                  {asociados.filter((a) => a.estado === 'APROBADO').length}
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
              <select
                value={filterBello}
                onChange={(e) => setFilterBello(e.target.value as 'TODOS' | 'SI' | 'NO')}
                className="input-field w-auto"
              >
                <option value="TODOS">Todos</option>
                <option value="SI">Votan en Bello</option>
                <option value="NO">No votan en Bello</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="table-header py-4 px-6 text-left">Nombre</th>
                  <th className="table-header py-4 px-6 text-left">Cédula</th>
                  {isAdmin && (
                    <th className="table-header py-4 px-6 text-left">Líder</th>
                  )}
                  <th className="table-header py-4 px-6 text-left">Lugar Votación</th>
                  <th className="table-header py-4 px-6 text-left">Bello</th>
                  <th className="table-header py-4 px-6 text-left">Estado</th>
                  {isAdmin && (
                    <th className="table-header py-4 px-6 text-left">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAsociados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 7 : 5}
                      className="py-12 text-center text-muted-foreground"
                    >
                      No se encontraron asociados
                    </td>
                  </tr>
                ) : (
                  filteredAsociados.map((asociado) => (
                    <tr
                      key={asociado.cedula}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium">{asociado.nombre_completo}</td>
                      <td className="py-4 px-6 text-muted-foreground">{asociado.cedula}</td>
                      {isAdmin && (
                        <td className="py-4 px-6 text-muted-foreground">
                          {asociado.cedula_lider}
                        </td>
                      )}
                      <td className="py-4 px-6 text-muted-foreground">
                        {asociado.lugar_votacion || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                            asociado.vota_en_bello
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}
                        >
                          <MapPin className="w-3 h-3" />
                          {asociado.vota_en_bello ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge estado={asociado.estado} />
                      </td>
                      {isAdmin && (
                        <td className="py-4 px-6">
                          <select
                            value={asociado.estado}
                            onChange={(e) =>
                              updateEstado(asociado.cedula, e.target.value as EstadoRegistro)
                            }
                            className="text-sm px-3 py-1.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="APROBADO">Aprobado</option>
                            <option value="RECHAZADO">Rechazado</option>
                          </select>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
