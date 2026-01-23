import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardStats, Persona } from '@/types/database';
import { toast } from 'sonner';
import {
  Users,
  UserCheck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Download,
  MessageSquare,
} from 'lucide-react';
import * as XLSX from 'xlsx';
// import { AntioquiaMap } from '@/components/AntioquiaMap';

export default function Dashboard() {
  const { isAdmin, cedula, nombre } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalLideres: 0,
    totalAsociados: 0,
    votanEnAntioquia: 0,
    noVotanAntioquia: 0,
    lideres: { pendientes: 0, aprobados: 0, rechazados: 0 },
    asociados: { pendientes: 0, aprobados: 0, rechazados: 0 },
  });
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
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
            votanEnAntioquia: personas.filter((p) => p.lugar_votacion === 'Antioquia').length,
            noVotanAntioquia: personas.filter((p) => p.lugar_votacion !== 'Antioquia').length,
            lideres: {
              pendientes: lideres.filter((l) => l.estado === 'PENDIENTE').length,
              aprobados: lideres.filter((l) => l.estado === 'APROBADO').length,
              rechazados: lideres.filter((l) => l.estado === 'RECHAZADO').length,
            },
            asociados: {
              pendientes: asociados.filter((a) => a.estado === 'PENDIENTE').length,
              aprobados: asociados.filter((a) => a.estado === 'APROBADO').length,
              rechazados: asociados.filter((a) => a.estado === 'RECHAZADO').length,
            },
          });

          setRecentPersonas(
            personas
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
          );
          setAllPersonas(personas);
        }
      } else {
        // Leader: Get only their data
        const { data: misAsociados } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula_lider', cedula)
          .eq('rol', 'asociado');

        const { data: miInfo } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula', cedula)
          .single();

        if (misAsociados && miInfo) {
          setStats({
            totalLideres: 1,
            totalAsociados: misAsociados.length,
            votanEnAntioquia: misAsociados.filter((p) => p.lugar_votacion === 'Antioquia').length,
            noVotanAntioquia: misAsociados.filter((p) => p.lugar_votacion !== 'Antioquia').length,
            lideres: {
              pendientes: miInfo.estado === 'PENDIENTE' ? 1 : 0,
              aprobados: miInfo.estado === 'APROBADO' ? 1 : 0,
              rechazados: miInfo.estado === 'RECHAZADO' ? 1 : 0,
            },
            asociados: {
              pendientes: misAsociados.filter((p) => p.estado === 'PENDIENTE').length,
              aprobados: misAsociados.filter((p) => p.estado === 'APROBADO').length,
              rechazados: misAsociados.filter((p) => p.estado === 'RECHAZADO').length,
            },
          });

          setRecentPersonas([miInfo, ...misAsociados]);
          setAllPersonas([miInfo, ...misAsociados]);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      toast.info('Generando reporte Excel...');
      let dataToExport: any[] = [];

      if (isAdmin) {
        const { data } = await supabase
          .from('personas')
          .select('*, lider:cedula_lider(nombre_completo)')
          .order('rol', { ascending: true });
        dataToExport = data || [];
      } else {
        const { data } = await supabase
          .from('personas')
          .select('*, lider:cedula_lider(nombre_completo)')
          .eq('cedula_lider', cedula);
        dataToExport = data || [];
      }

      if (dataToExport.length === 0) {
        toast.error('No hay datos para exportar');
        return;
      }

      const formattedData = dataToExport.map(p => ({
        'Nombre Completo': p.nombre_completo,
        'Cédula': p.cedula,
        'Rol': p.rol === 'lider' ? 'Líder' : 'Asociado',
        'Cédula Líder': p.cedula_lider || '-',
        'Nombre Líder': p.lider?.nombre_completo || '-',
        'Teléfono': p.telefono || '-',
        'Lugar Votación': p.lugar_votacion || '-',
        'Municipio': p.municipio_votacion || '-',
        'Vota en Bello': p.vota_en_bello ? 'Sí' : 'No',
        'Estado': p.estado,
        'Fecha Registro': p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString() : '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Personas');

      const fileName = `Reporte_CRM_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al generar el reporte Excel');
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
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {isAdmin ? 'Panel de Administración' : `Bienvenido, ${nombre}`}
            </h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? 'Vista general del sistema de testigos electorales'
                : 'Gestiona tu equipo de testigos electorales'}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-success text-white rounded-xl font-medium hover:bg-success/90 transition-all shadow-lg shadow-success/20 w-full md:w-auto"
            >
              <Download className="w-5 h-5" />
              Descargar Excel
            </button>
          )}
        </div>

        {/* Share Invitation Section (for Leaders) */}
        {!isAdmin && (
          <div className="glass-panel p-6 mb-8 border-primary/20 bg-primary/5">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-display font-bold text-primary mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  ¡Haz crecer tu equipo!
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Comparte este enlace con tus conocidos para que se registren directamente bajo tu liderazgo:
                </p>
                <div className="flex gap-2 p-3 bg-background border border-border rounded-xl font-mono text-xs overflow-x-auto">
                  {`${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}`}
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    const baseUrl = window.location.origin;
                    const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || '')}`;
                    navigator.clipboard.writeText(msg);
                    toast.success('¡Mensaje copiado al portapapeles!');
                  }}
                  className="btn-primary whitespace-nowrap"
                >
                  Copiar Mensaje Invitación
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#25D366]/90 transition-all shadow-lg shadow-green-500/20"
                >
                  <MessageSquare className="w-5 h-5" />
                  Compartir en WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

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
            title="Votan en Antioquia"
            value={stats.votanEnAntioquia}
            icon={MapPin}
            variant="success"
            description="Votantes en el departamento"
          />
          <StatCard
            title="Fuera de Antioquia"
            value={stats.noVotanAntioquia}
            icon={TrendingUp}
            variant="warning"
            description="Votan en otro departamento"
          />

        </div>

        {/* Status Cards */}
        <div className="space-y-8 mb-8">
          {isAdmin && (
            <div>
              <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Resumen Líderes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card border-l-4 border-l-warning">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-warning/10 rounded-xl">
                      <Clock className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Líderes Pendientes</p>
                      <p className="text-2xl font-bold font-display">{stats.lideres.pendientes}</p>
                    </div>
                  </div>
                </div>
                <div className="stat-card border-l-4 border-l-success">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-success/10 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Líderes Aprobados</p>
                      <p className="text-2xl font-bold font-display">{stats.lideres.aprobados}</p>
                    </div>
                  </div>
                </div>
                <div className="stat-card border-l-4 border-l-destructive">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-destructive/10 rounded-xl">
                      <XCircle className="w-6 h-6 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Líderes Rechazados</p>
                      <p className="text-2xl font-bold font-display">{stats.lideres.rechazados}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              {isAdmin ? 'Resumen Asociados' : 'Mi Estado y Asociados'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stat-card border-l-4 border-l-warning">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-warning/10 rounded-xl">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Asociados Pendientes</p>
                    <p className="text-2xl font-bold font-display">{stats.asociados.pendientes}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-success">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Asociados Aprobados</p>
                    <p className="text-2xl font-bold font-display">{stats.asociados.aprobados}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-destructive">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <XCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Asociados Rechazados</p>
                    <p className="text-2xl font-bold font-display">{stats.asociados.rechazados}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Antioquia Map */}
        {/* 
        <div className="mb-8">
          <AntioquiaMap
            municipioCounts={allPersonas.reduce((acc, curr) => {
              if (curr.municipio_votacion) {
                const name = curr.municipio_votacion
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toUpperCase()
                  .trim();
                acc[name] = (acc[name] || 0) + 1;
              }
              return acc;
            }, {} as Record<string, number>)}
          />
        </div> 
        */}

        {/* Recent Activity */}
        <div className="glass-panel overflow-hidden border border-border/50">
          <div className="p-6 border-b border-border/50 bg-muted/10">
            <h2 className="text-xl font-display font-semibold">
              {isAdmin ? 'Registros Recientes' : 'Tu Equipo'}
            </h2>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="table-header py-4 px-6">Nombre</th>
                  <th className="table-header py-4 px-6">Cédula</th>
                  <th className="table-header py-4 px-6 text-center">Estado</th>
                  <th className="table-header py-4 px-6">WhatsApp</th>
                  <th className="table-header py-4 px-6">Email</th>
                  <th className="table-header py-4 px-6">Municipio</th>
                  <th className="table-header py-4 px-6">Departamento</th>
                </tr>
              </thead>
              <tbody>
                {recentPersonas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No hay registros recientes
                    </td>
                  </tr>
                ) : (
                  recentPersonas.map((persona) => (
                    <tr
                      key={persona.cedula}
                      className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                    >
                      <td className="py-4 px-6 font-medium">{persona.nombre_completo}</td>
                      <td className="py-4 px-6 text-muted-foreground">{persona.cedula}</td>
                      <td className="py-4 px-6">
                        <StatusBadge estado={persona.estado} />
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {persona.telefono ? (
                          <a
                            href={`https://wa.me/${persona.telefono.replace(/[\s-]/g, '')}?text=${encodeURIComponent('Hola, soy el coordinador electoral, ¿cómo vas con la inscripción de tus colaboradores?')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4 font-medium"
                          >
                            {persona.telefono}
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {persona.email || '-'}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {persona.municipio_votacion || '-'}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground text-sm">
                        {persona.lugar_votacion || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout >
  );
}
