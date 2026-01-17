import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, Persona } from '@/types/database';
import {
  Users,
  UserCheck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
} from 'lucide-react';

export default function Dashboard() {
  const { isAdmin, cedula, nombre } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLideres: 0,
    totalAsociados: 0,
    votanEnBello: 0,
    noVotanBello: 0,
    pendientes: 0,
    aprobados: 0,
    rechazados: 0,
  });
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [isAdmin, cedula]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        // Admin: Get all stats
        const { data: personas } = await supabase
          .from('personas')
          .select('*');

        if (personas) {
          const lideres = personas.filter((p) => p.rol === 'lider');
          const asociados = personas.filter((p) => p.rol === 'asociado');

          setStats({
            totalLideres: lideres.length,
            totalAsociados: asociados.length,
            votanEnBello: personas.filter((p) => p.vota_en_bello).length,
            noVotanBello: personas.filter((p) => !p.vota_en_bello).length,
            pendientes: personas.filter((p) => p.estado === 'PENDIENTE').length,
            aprobados: personas.filter((p) => p.estado === 'APROBADO').length,
            rechazados: personas.filter((p) => p.estado === 'RECHAZADO').length,
          });

          setRecentPersonas(
            personas
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
          );
        }
      } else {
        // Leader: Get only their data
        const { data: misAsociados } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula_lider', cedula);

        const { data: miInfo } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula', cedula)
          .single();

        if (misAsociados && miInfo) {
          setStats({
            totalLideres: 1,
            totalAsociados: misAsociados.length,
            votanEnBello: misAsociados.filter((p) => p.vota_en_bello).length,
            noVotanBello: misAsociados.filter((p) => !p.vota_en_bello).length,
            pendientes: misAsociados.filter((p) => p.estado === 'PENDIENTE').length,
            aprobados: misAsociados.filter((p) => p.estado === 'APROBADO').length,
            rechazados: misAsociados.filter((p) => p.estado === 'RECHAZADO').length,
          });

          setRecentPersonas([miInfo, ...misAsociados]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Cargando dashboard...</p>
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
            {isAdmin ? 'Panel de Administración' : `Bienvenido, ${nombre}`}
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? 'Vista general del sistema de testigos electorales'
              : 'Gestiona tu equipo de testigos electorales'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isAdmin && (
            <StatCard
              title="Total Líderes"
              value={stats.totalLideres}
              icon={Users}
              variant="primary"
              description="Líderes registrados"
            />
          )}
          <StatCard
            title="Asociados"
            value={stats.totalAsociados}
            icon={UserCheck}
            variant="default"
            description={isAdmin ? 'Total de asociados' : 'Tus asociados'}
          />
          <StatCard
            title="Votan en Bello"
            value={stats.votanEnBello}
            icon={MapPin}
            variant="success"
            description="Votantes en el municipio"
          />
          <StatCard
            title="No votan en Bello"
            value={stats.noVotanBello}
            icon={TrendingUp}
            variant="warning"
            description="Votan en otro municipio"
          />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card border-l-4 border-l-warning">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-xl">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold font-display">{stats.pendientes}</p>
              </div>
            </div>
          </div>
          <div className="stat-card border-l-4 border-l-success">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aprobados</p>
                <p className="text-2xl font-bold font-display">{stats.aprobados}</p>
              </div>
            </div>
          </div>
          <div className="stat-card border-l-4 border-l-destructive">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-destructive/10 rounded-xl">
                <XCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rechazados</p>
                <p className="text-2xl font-bold font-display">{stats.rechazados}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-panel p-6">
          <h2 className="text-xl font-display font-semibold mb-4">
            {isAdmin ? 'Registros Recientes' : 'Tu Equipo'}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-header py-3 px-4 text-left">Nombre</th>
                  <th className="table-header py-3 px-4 text-left">Cédula</th>
                  <th className="table-header py-3 px-4 text-left">Rol</th>
                  <th className="table-header py-3 px-4 text-left">Lugar Votación</th>
                  <th className="table-header py-3 px-4 text-left">Estado</th>
                </tr>
              </thead>
              <tbody>
                {recentPersonas.map((persona) => (
                  <tr
                    key={persona.cedula}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-4 px-4 font-medium">{persona.nombre_completo}</td>
                    <td className="py-4 px-4 text-muted-foreground">{persona.cedula}</td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                          persona.rol === 'lider'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {persona.rol === 'lider' ? 'Líder' : 'Asociado'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-muted-foreground">
                      {persona.lugar_votacion || '-'}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge estado={persona.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
