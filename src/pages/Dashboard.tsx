import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import MapaAntioquia from '@/components/MapaAntioquia';
import { DashboardStats, Persona } from '@/types/database';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserCheck,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Download,
  Upload,
  MessageSquare,
  Search,
  Filter,
  Share2,
  Copy,
  ChevronRight,
  Map,
  Edit,
  Pencil,
  Zap,
  UserCog,
} from 'lucide-react';
import { SearchableSelect } from '@/components/SearchableSelect';
import { MUNICIPIOS_ANTIOQUIA } from '@/constants/locations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditPersonaModal } from '@/components/EditPersonaModal';
import * as XLSX from 'xlsx';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

const CHART_COLORS = [
  '#0ea5e9', // Sky
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f97316', // Orange
  '#06b6d4', // Cyan
];


export default function Dashboard() {
  const { isAdmin, cedula, nombre } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalLideres: 0,
    totalVotantes: 0,
    votanEnAntioquia: 0,
    noVotanAntioquia: 0,
    lideres: { pendientes: 0, aprobados: 0, rechazados: 0 },
    Votantes: { pendientes: 0, aprobados: 0, rechazados: 0 },
  });
  const [recentPersonas, setRecentPersonas] = useState<Persona[]>([]);
  const [allPersonas, setAllPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMunForPuestos, setSelectedMunForPuestos] = useState<string | null>(null);
  const [selectedPuestoDetails, setSelectedPuestoDetails] = useState<{
    municipio: string;
    puesto: string;
    personas: Persona[];
  } | null>(null);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);

  // MEDICIÓN PRINCIPAL: Municipio donde votan (Sincronizado con estados)
  const municipalityData = allPersonas.reduce((acc: any, curr) => {
    const isNoDefinido = curr.estado === 'PENDIENTE';
    const mun = isNoDefinido ? 'No definido' : (curr.municipio_puesto || 'No definido');
    const existing = acc.find((item: any) => item.name === mun);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: mun, value: 1 });
    }
    return acc;
  }, [])
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 8); // Show top 8 municipalities

  // COMPARATIVA: Municipio donde viven
  const viveMunicipalityData = allPersonas.reduce((acc: any, curr) => {
    const mun = curr.municipio_votacion || 'No definido';
    const existing = acc.find((item: any) => item.name === mun);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: mun, value: 1 });
    }
    return acc;
  }, [])
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 8);

  // DRILL-DOWN: Puestos por municipio seleccionado
  const puestosData = selectedMunForPuestos
    ? allPersonas
      .filter(p => (p.municipio_puesto || 'No definido') === selectedMunForPuestos)
      .reduce((acc: any, curr) => {
        const puesto = curr.puesto_votacion || 'Sin puesto';
        const existing = acc.find((item: any) => item.name === puesto);
        if (existing) {
          existing.value += 1;
        } else {
          acc.push({ name: puesto, value: 1 });
        }
        return acc;
      }, [])
      .sort((a: any, b: any) => b.value - a.value)
    : [];

  // TERRITORIO DATA (Full list for Map)
  const mapMunicipiosData = allPersonas.reduce((acc: any[], curr) => {
    const mun = curr.municipio_puesto || 'No definido';
    const existing = acc.find((item: any) => item.name === mun);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ name: mun, count: 1, percentage: 0 });
    }
    return acc;
  }, [])
    .map(m => ({
      ...m,
      percentage: allPersonas.length > 0 ? (m.count / allPersonas.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  const getColorByCount = (count: number): string => {
    if (count > 30) return '#059669';
    if (count >= 15) return '#10b981';
    if (count >= 5) return '#34d399';
    if (count >= 1) return '#a7f3d0';
    return '#f3f4f6';
  };

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
          const Amigos = personas.filter((p) => p.rol === 'asociado');
          const Impulsores = personas.filter((p) => p.rol === 'impulsor');

          setStats({
            totalLideres: lideres.length,
            totalVotantes: Amigos.length,
            totalImpulsores: Impulsores.length,
            votanEnAntioquia: personas.filter((p) => p.lugar_votacion === 'Antioquia').length,
            lideres: {
              pendientes: lideres.filter((l) => l.estado === 'PENDIENTE').length,
              aprobados: lideres.filter((l) => l.estado === 'APROBADO').length,
              rechazados: lideres.filter((l) => l.estado === 'RECHAZADO').length,
            },
            Votantes: {
              pendientes: Amigos.filter((a) => a.estado === 'PENDIENTE').length,
              aprobados: Amigos.filter((a) => a.estado === 'APROBADO').length,
              rechazados: Amigos.filter((a) => a.estado === 'RECHAZADO').length,
            },
            impulsores: {
              pendientes: Impulsores.filter((i) => i.estado === 'PENDIENTE').length,
              aprobados: Impulsores.filter((i) => i.estado === 'APROBADO').length,
              rechazados: Impulsores.filter((i) => i.estado === 'RECHAZADO').length,
            },
          });

          const personasWithFields: Persona[] = (personas || []).map((p: any) => ({
            ...p,
            municipio_puesto: p.municipio_puesto || null,
            puesto_votacion: p.puesto_votacion || null,
            mesa_votacion: p.mesa_votacion || null,
            notas: p.notas || null,
          }));

          setRecentPersonas(
            personasWithFields
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 5)
          );
          setAllPersonas(personasWithFields);
        }
      } else {
        // Leader: Get only their data
        const { data: misVotantes } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula_lider', cedula)
          .eq('rol', 'asociado');

        const { data: misImpulsores } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula_lider', cedula)
          .eq('rol', 'impulsor');

        const { data: miInfo } = await supabase
          .from('personas')
          .select('*')
          .eq('cedula', cedula)
          .single();

        if (misVotantes && miInfo) {
          setStats({
            totalLideres: 1,
            totalVotantes: misVotantes.length,
            totalImpulsores: misImpulsores ? misImpulsores.length : 0,
            votanEnAntioquia: misVotantes.filter((p) => p.lugar_votacion === 'Antioquia').length,
            lideres: {
              pendientes: miInfo.estado === 'PENDIENTE' ? 1 : 0,
              aprobados: miInfo.estado === 'APROBADO' ? 1 : 0,
              rechazados: miInfo.estado === 'RECHAZADO' ? 1 : 0,
            },
            Votantes: {
              pendientes: misVotantes.filter((p) => p.estado === 'PENDIENTE').length,
              aprobados: misVotantes.filter((p) => p.estado === 'APROBADO').length,
              rechazados: misVotantes.filter((p) => p.estado === 'RECHAZADO').length,
            },
            impulsores: {
              pendientes: (misImpulsores || []).filter((i) => i.estado === 'PENDIENTE').length,
              aprobados: (misImpulsores || []).filter((i) => i.estado === 'APROBADO').length,
              rechazados: (misImpulsores || []).filter((i) => i.estado === 'RECHAZADO').length,
            }
          });

          const mappedInfo: Persona = {
            ...(miInfo as any),
            municipio_puesto: (miInfo as any).municipio_puesto || null,
            puesto_votacion: (miInfo as any).puesto_votacion || null,
            mesa_votacion: (miInfo as any).mesa_votacion || null,
            notas: (miInfo as any).notas || null,
          };

          const mappedVotantes: Persona[] = (misVotantes || []).map((p: any) => ({
            ...p,
            municipio_puesto: p.municipio_puesto || null,
            puesto_votacion: p.puesto_votacion || null,
            mesa_votacion: p.mesa_votacion || null,
            notas: p.notas || null,
          }));

          const mappedImpulsores: Persona[] = (misImpulsores || []).map((p: any) => ({
            ...p,
            municipio_puesto: p.municipio_puesto || null,
            puesto_votacion: p.puesto_votacion || null,
            mesa_votacion: p.mesa_votacion || null,
            notas: p.notas || null,
          }));

          setRecentPersonas([mappedInfo, ...mappedVotantes, ...mappedImpulsores]);
          setAllPersonas([mappedInfo, ...mappedVotantes, ...mappedImpulsores]);
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
        'Rol': p.rol === 'lider' ? 'Líder' : p.rol === 'asociado' ? 'Amigo que apoya' : 'Impulsor Electoral',
        'Cédula Líder': p.cedula_lider || '-',
        'Nombre Líder': p.lider?.nombre_completo || '-',
        'Teléfono': p.telefono || '-',
        'Email': p.email || '-',
        'Municipio donde vive': p.municipio_votacion || '-',
        'Municipio de Votación': p.municipio_puesto || '-',
        'Puesto de Votación': p.puesto_votacion || '-',
        'Mesa': p.mesa_votacion || '-',
        'Votos': p.votos_prometidos || 0,
        'Estado': p.estado,
        'Fecha Registro': p.fecha_registro ? new Date(p.fecha_registro).toLocaleDateString() : '-',
        'Notas': p.notas || '-'
      }));

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Personas');

      const fileName = `Reporte_Impulsores_Electorales_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      toast.success('Reporte descargado correctamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al generar el reporte Excel');
    }
  };

  const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        toast.error('El archivo Excel está vacío');
        return;
      }

      toast.loading(`Cargando ${jsonData.length} registros...`, { id: 'import-loading' });

      try {
        const personasToInsert = jsonData.map((row: any) => ({
          cedula: String(row['Cédula'] || row['cedula'] || '').trim(),
          nombre_completo: String(row['Nombre Completo'] || row['nombre'] || '').trim(),
          telefono: String(row['Teléfono'] || row['telefono'] || '').trim(),
          email: String(row['Email'] || row['email'] || '').trim(),
          rol: (String(row['Rol'] || row['rol'] || '').toLowerCase().includes('lider') ? 'lider' : 'asociado'),
          cedula_lider: String(row['Cédula Líder'] || row['cedula_lider'] || '').trim() || null,
          municipio_votacion: String(row['Municipio donde vive'] || row['municipio_vive'] || '').trim(),
          municipio_puesto: String(row['Municipio de Votación'] || row['municipio_votacion'] || '').trim(),
          puesto_votacion: String(row['Puesto de Votación'] || row['puesto'] || '').trim(),
          mesa_votacion: String(row['Mesa'] || row['mesa'] || '').trim(),
          votos_prometidos: Number(row['Votos'] || row['votos'] || 0),
          estado: 'APROBADO', // Auto approve mass loads by default or keep as pending? Typically mass loads are trusted.
          notas: String(row['Notas'] || row['notas'] || '').trim(),
        })).filter(p => p.cedula && p.nombre_completo);

        const { error } = await supabase
          .from('personas')
          .upsert(personasToInsert, { onConflict: 'cedula' });

        if (error) throw error;

        toast.success(`${personasToInsert.length} registros cargados correctamente`, { id: 'import-loading' });
        fetchData();
      } catch (error: any) {
        console.error('Error importing:', error);
        toast.error(`Error al importar: ${error.message || 'Error desconocido'}`, { id: 'import-loading' });
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset input
    event.target.value = '';
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
                ? 'Vista general del sistema de impulsores electorales'
                : 'Gestiona tu equipo de impulsores electorales'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate('/registrar-lider')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 w-full"
              >
                <UserCog className="w-5 h-5" />
                Registrar Líder
              </button>
              <button
                onClick={() => navigate('/registrar-impulsor')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 w-full"
              >
                <Zap className="w-5 h-5" />
                Registrar Impulsor
              </button>
              <button
                onClick={() => navigate('/registrar-votante')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20 w-full"
              >
                <UserCheck className="w-5 h-5" />
                Registrar Amigo
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                  className="hidden"
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 cursor-pointer w-full"
                >
                  <Upload className="w-5 h-5" />
                  Cargar Excel
                </label>
              </div>
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-success text-white rounded-xl font-medium hover:bg-success/90 transition-all shadow-lg shadow-success/20 w-full"
              >
                <Download className="w-5 h-5" />
                Descargar Excel
              </button>
            </div>
          )}
          {!isAdmin && (
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => navigate('/registrar-impulsor')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 w-full"
              >
                <Zap className="w-5 h-5" />
                Registrar Impulsor
              </button>
              <button
                onClick={() => navigate('/registrar-votante')}
                className="flex items-center justify-center gap-2 px-6 py-2.5 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-all shadow-lg shadow-sky-500/20 w-full"
              >
                <UserCheck className="w-5 h-5" />
                Registrar Amigo
              </button>
            </div>
          )}
        </div>

        {/* Global Invitation Links (Admin only) */}
        {isAdmin && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Lider Invitation */}
            <div className="glass-panel p-6 border-primary/20 bg-primary/5">
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-xl font-display font-bold text-primary flex items-center gap-2">
                  <Share2 className="w-5 h-5" />
                  Invitar Nuevo Líder
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envía este enlace para que un nuevo líder se registre él mismo:
                </p>
                <div className="w-full flex gap-2 p-3 bg-background border border-border rounded-xl font-mono text-xs overflow-x-auto">
                  {`${window.location.origin}/registro`}
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const msg = `Hola haz sido escogido en un grupo selecto para ser parte de este equipo ganador, como líder podrás ingresar tus colaboradores para hacer crecer nuestro sueño. Regístrate aquí: ${baseUrl}/registro`;
                      navigator.clipboard.writeText(msg);
                      toast.success('¡Invitación Líder copiada!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-sm font-bold hover:bg-primary/20 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Mensaje
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola haz sido escogido en un grupo selecto para ser parte de este equipo ganador, como líder podrás ingresar tus colaboradores para hacer crecer nuestro sueño. Regístrate aquí: ${window.location.origin}/registro`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Amigo Invitation */}
            <div className="glass-panel p-6 border-accent/20 bg-accent/5">
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-xl font-display font-bold text-accent flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Invitar Amigo
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envía este enlace para que un nuevo amigo se registre en el sistema:
                </p>
                <div className="w-full flex gap-2 p-3 bg-background border border-border rounded-xl font-mono text-xs overflow-x-auto">
                  {`${window.location.origin}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}`}
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}`;
                      navigator.clipboard.writeText(msg);
                      toast.success('¡Invitación Amigo copiada!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl text-sm font-bold hover:bg-accent/20 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Mensaje
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Impulsor Invitation */}
            <div className="glass-panel p-6 border-purple-200 bg-purple-50 rounded-2xl">
              <div className="flex flex-col items-start gap-4">
                <h2 className="text-xl font-display font-bold text-purple-700 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Invitar Impulsor
                </h2>
                <p className="text-sm text-muted-foreground">
                  Envía este enlace para que un nuevo impulsor electoral se registre:
                </p>
                <div className="w-full flex gap-2 p-3 bg-white border border-purple-200 rounded-xl font-mono text-xs overflow-x-auto">
                  {`${window.location.origin}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}&rol=impulsor`}
                </div>
                <div className="flex flex-wrap gap-2 w-full">
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}&rol=impulsor`;
                      navigator.clipboard.writeText(msg);
                      toast.success('¡Invitación Impulsor copiada!');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-sm font-bold hover:bg-purple-200 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar Mensaje
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || 'Administrador')}&rol=impulsor`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] text-white rounded-xl text-sm font-bold hover:bg-[#128C7E] transition-all"
                  >
                    <MessageSquare className="w-4 h-4" />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || '')}`;
                      navigator.clipboard.writeText(msg);
                      toast.success('¡Mensaje Amigo copiado!');
                    }}
                    className="flex-1 btn-primary whitespace-nowrap"
                  >
                    Invitar Amigo
                  </button>
                  <button
                    onClick={() => {
                      const baseUrl = window.location.origin;
                      const msg = `Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, lo puedes hacer ingresando al link para inscribirte: ${baseUrl}/registro?lider=${encodeURIComponent(nombre || '')}&rol=impulsor`;
                      navigator.clipboard.writeText(msg);
                      toast.success('¡Mensaje Impulsor copiado!');
                    }}
                    className="flex-1 bg-purple-600 text-white rounded-xl px-6 py-2.5 font-medium hover:bg-purple-700 transition-all shadow-lg shadow-purple-200 whitespace-nowrap"
                  >
                    Invitar Impulsor
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#25D366]/90 transition-all shadow-lg shadow-green-500/20"
                  >
                    <MessageSquare className="w-5 h-5" />
                    WhatsApp Amigo
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Hola soy ${nombre}, te invito a ser parte de este grupo ganador como IMPULSOR ELECTORAL, lo puedes hacer ingresando al link para inscribirte: ${window.location.origin}/registro?lider=${encodeURIComponent(nombre || '')}&rol=impulsor`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-[#25D366] text-white rounded-xl font-medium hover:bg-[#25D366]/90 transition-all shadow-lg shadow-green-500/20"
                  >
                    <MessageSquare className="w-5 h-5" />
                    WhatsApp Impulsor
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
            title="Impulsores"
            value={stats.totalImpulsores}
            icon={Zap}
            variant="default"
            description={isAdmin ? 'Total de impulsores' : 'Tus impulsores'}
          />
          <StatCard
            title="Amigos"
            value={stats.totalVotantes}
            icon={UserCheck}
            variant="default"
            description={isAdmin ? 'Total de amigos' : 'Tus amigos'}
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
              <Zap className="w-5 h-5 text-purple-600" />
              Resumen Impulsores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stat-card border-l-4 border-l-warning">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-warning/10 rounded-xl">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impulsores Pendientes</p>
                    <p className="text-2xl font-bold font-display">{stats.impulsores.pendientes}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-success">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impulsores Aprobados</p>
                    <p className="text-2xl font-bold font-display">{stats.impulsores.aprobados}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-destructive">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <XCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Impulsores Rechazados</p>
                    <p className="text-2xl font-bold font-display">{stats.impulsores.rechazados}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-display font-semibold mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-primary" />
              {isAdmin ? 'Resumen Amigos' : 'Mi Estado y Amigos'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="stat-card border-l-4 border-l-warning">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-warning/10 rounded-xl">
                    <Clock className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amigos Pendientes</p>
                    <p className="text-2xl font-bold font-display">{stats.Votantes.pendientes}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-success">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-success/10 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amigos Aprobados</p>
                    <p className="text-2xl font-bold font-display">{stats.Votantes.aprobados}</p>
                  </div>
                </div>
              </div>
              <div className="stat-card border-l-4 border-l-destructive">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-destructive/10 rounded-xl">
                    <XCircle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amigos Rechazados</p>
                    <p className="text-2xl font-bold font-display">{stats.Votantes.rechazados}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Territory Map Section (For Admins) */}
        {isAdmin && (
          <div className="mb-12">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                  <Map className="w-7 h-7 text-primary" />
                  Territorio Electoral
                </h2>
                <p className="text-muted-foreground text-sm">
                  Distribución geográfica de la meta electoral en el mapa de Antioquia
                </p>
              </div>
              <div className="flex items-center gap-6 bg-card px-6 py-2.5 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Municipios Cubiertos: </span>
                  <span className="text-sm font-bold text-primary">{mapMunicipiosData.filter(m => m.name !== 'No definido').length}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Map Container */}
              <div className="xl:col-span-3 glass-panel p-2 bg-[#f3f4f6] relative border border-border/50">
                <div className="bg-[#f3f4f6] rounded-2xl overflow-hidden" style={{ height: '600px' }}>
                  <MapaAntioquia municipiosData={mapMunicipiosData} />
                </div>
                {/* Map Floating Legend */}
                <div className="absolute bottom-6 right-6 p-4 bg-white/90 backdrop-blur-sm rounded-2xl border border-border shadow-xl space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Densidad</p>
                  {[
                    { color: '#059669', label: '> 30' },
                    { color: '#10b981', label: '15 - 30' },
                    { color: '#34d399', label: '5 - 14' },
                    { color: '#a7f3d0', label: '1 - 4' },
                    { color: '#e5e7eb', label: '0' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="text-[10px] font-bold text-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Municipios Summary */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Zonas de Mayor Impacto
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {mapMunicipiosData.slice(0, 5).map((mun, idx) => (
                    <div
                      key={mun.name}
                      className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                          style={{ backgroundColor: getColorByCount(mun.count) }}
                        >
                          {mun.count}
                        </div>
                        <div>
                          <p className="text-sm font-bold">{mun.name}</p>
                          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                            {mun.percentage.toFixed(1)}% del apoyo
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10 mt-6">
                  <p className="text-xs text-primary font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                    <TrendingUp className="w-3 h-3" />
                    Análisis
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Los municipios en <span className="text-primary font-bold">Verde Esmeralda</span> representan el núcleo de tu fuerza electoral. Enfoca tus campañas de fidelización en estas zonas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}



        {/* Admin Dashboard: Municipality Chart / Leader Dashboard: Recent Activity */}
        {isAdmin ? (
          <div className="glass-panel p-8 border border-border/50">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Distribución por Municipio de Votación
                </h2>
                <p className="text-muted-foreground text-sm">
                  conteo de amigos según el municipio donde tienen inscrito su puesto.
                </p>
              </div>
              <button
                onClick={() => {
                  fetchData();
                  toast.success('Datos actualizados');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-primary/10 rounded-full border border-primary/10 transition-all active:scale-95"
              >
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Actualizar Datos</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="h-[400px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={municipalityData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={5}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {municipalityData.map((_entry: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer transition-all duration-300"
                          style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: '16px',
                        border: 'none',
                        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'white',
                        padding: '16px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-[0.2em] mb-1">Total</p>
                  <p className="text-5xl font-extrabold font-display text-primary drop-shadow-sm">{allPersonas.length}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Ránking de Municipios
                </h3>
                {municipalityData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 bg-muted/5 rounded-2xl border border-dashed border-border/50">Cargando datos...</p>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {municipalityData.map((item: any, index: number) => (
                      <div
                        key={item.name}
                        onClick={() => setSelectedMunForPuestos(item.name)}
                        className={`group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${selectedMunForPuestos === item.name
                          ? 'bg-primary/10 border-primary shadow-md'
                          : 'bg-muted/20 border-border/50 hover:bg-white hover:shadow-lg hover:border-primary/20'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-inner"
                            style={{
                              backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}15`,
                              color: CHART_COLORS[index % CHART_COLORS.length],
                              border: `1px solid ${CHART_COLORS[index % CHART_COLORS.length]}30`
                            }}
                          >
                            #{index + 1}
                          </div>
                          <div>
                            <span className="text-sm font-bold block">{item.name}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Mun. Votación</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-black text-foreground block">{item.value}</span>
                          <div className="flex items-center gap-1 justify-end">
                            <TrendingUp className="w-2.5 h-2.5 text-success" />
                            <span className="text-[10px] text-success font-black">
                              {Math.round((item.value / allPersonas.length) * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Comparativa: Vive vs Vota */}
            <div className="mt-16 pt-12 border-t border-border/50">
              <div className="mb-8">
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Comparativa de Residencia vs Votación
                </h2>
                <p className="text-muted-foreground text-sm">
                  Relación entre dónde viven los colaboradores y dónde ejercen su voto (Estados).
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Ranking Municipios donde VIVEN */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    Top Municipios donde Viven
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {viveMunicipalityData.map((item: any) => (
                      <div key={item.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/30">
                        <span className="text-sm font-medium">{item.name}</span>
                        <span className="text-sm font-bold text-success">{item.value} <span className="text-[10px] text-muted-foreground font-normal">pers.</span></span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gráfico de Barras Comparativo */}
                <div className="h-[300px] w-full bg-muted/5 rounded-3xl border border-border/30 p-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Votan en su Mun.', value: allPersonas.filter(p => p.estado === 'APROBADO').length },
                        { name: 'Votan en otro Mun.', value: allPersonas.filter(p => p.estado === 'RECHAZADO').length },
                        { name: 'Sin Info Votación', value: allPersonas.filter(p => p.estado === 'PENDIENTE').length }
                      ]}
                      margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                      <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => Math.floor(val).toString()} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#FF0000" />
                        <Cell fill="#94a3b8" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Detalle por Puesto de Votación (Buscador) */}
            <div className="mt-16 pt-12 border-t border-border/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="max-w-md">
                  <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
                    <MapPin className="w-7 h-7 text-primary" />
                    Buscador por Puestos
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Selecciona un municipio para ver el detalle de personas por puesto físico.
                  </p>
                </div>
                <div className="w-full md:w-72">
                  <SearchableSelect
                    options={MUNICIPIOS_ANTIOQUIA}
                    value={selectedMunForPuestos || ''}
                    onChange={(val) => setSelectedMunForPuestos(val)}
                    placeholder="Buscar municipio..."
                  />
                </div>
              </div>

              {selectedMunForPuestos ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {puestosData.length > 0 ? (
                    puestosData.map((p: any, idx: number) => (
                      <div
                        key={p.name}
                        onClick={() => {
                          const people = allPersonas.filter(per =>
                            (per.municipio_puesto === selectedMunForPuestos || (!per.municipio_puesto && selectedMunForPuestos === 'No definido')) &&
                            (per.puesto_votacion || 'Sin puesto') === p.name
                          );
                          setSelectedPuestoDetails({
                            municipio: selectedMunForPuestos || 'No definido',
                            puesto: p.name,
                            personas: people
                          });
                        }}
                        className="group relative overflow-hidden p-6 bg-card border border-border rounded-3xl hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                        style={{ borderLeftWidth: '6px', borderLeftColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="p-2 bg-muted/50 rounded-lg group-hover:bg-primary/10 transition-colors">
                            <MapPin className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted/30 px-2 py-1 rounded-md">
                            #{idx + 1}
                          </span>
                        </div>
                        <h4 className="font-bold text-foreground text-sm leading-tight mb-4 min-h-[2.5rem] line-clamp-2" title={p.name}>
                          {p.name}
                        </h4>
                        <div className="flex items-end justify-between pt-4 border-t border-border/30">
                          <div>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Amigos</p>
                            <p className="text-3xl font-black text-primary font-display">{p.value}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Peso</p>
                            <p className="text-sm font-bold text-foreground">
                              {Math.round((p.value / allPersonas.filter(per => per.municipio_puesto === selectedMunForPuestos).length) * 100)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[40px] border-2 border-dashed border-border/50">
                      <Search className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground font-medium">No se encontraron puestos para {selectedMunForPuestos}.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-muted/5 rounded-[40px] border border-border/30">
                  <Filter className="w-16 h-16 text-primary/20 mb-6" />
                  <p className="text-muted-foreground max-w-xs text-center leading-relaxed">
                    Usa el buscador superior para filtrar y visualizar la distribución electoral por puestos físicos.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Leader View: Recent Activity / Team */
          <div className="glass-panel overflow-hidden border border-border/50">
            <div className="p-6 border-b border-border/50 bg-muted/10">
              <h2 className="text-xl font-display font-semibold">Tu Equipo</h2>
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
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Municipio Vive</th>
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Mun. Puesto</th>
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Puesto de Votación</th>
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Mesa</th>
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Votos</th>
                    <th className="table-header py-4 px-6 text-xs uppercase tracking-wider">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPersonas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="py-12 text-center text-muted-foreground"
                      >
                        No hay registros en tu equipo
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
                              href={`https://wa.me/57${persona.telefono.replace(/[\s-]/g, '')}?text=${encodeURIComponent(
                                persona.rol === 'lider'
                                  ? 'Hola, soy el coordinador electoral, ¿cómo vas con la inscripción de tus colaboradores?'
                                  : 'Hola, soy el coordinador electoral, nos encanta tu apoyo a este proyecto, sigue invitando amigos a este equipo ganador. Mil gracias.'
                              )}`}
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
                        <td className="py-4 px-6 text-muted-foreground text-sm">{persona.email || '-'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm">{persona.municipio_votacion || '-'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm font-medium">{persona.municipio_puesto || '-'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm">{persona.puesto_votacion || '-'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm">{persona.mesa_votacion || '-'}</td>
                        <td className="py-4 px-6 text-muted-foreground text-sm text-center font-bold text-primary">
                          {persona.votos_prometidos || '-'}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground text-sm max-w-[200px] truncate" title={persona.notas || ''}>
                          {persona.notas || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Modal Detalle Puesto */}
        <Dialog open={!!selectedPuestoDetails} onOpenChange={(open) => !open && setSelectedPuestoDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-bold text-primary flex items-center gap-2">
                <MapPin className="w-6 h-6" />
                {selectedPuestoDetails?.puesto} - {selectedPuestoDetails?.municipio}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="table-container max-h-[60vh] overflow-y-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="table-header py-3 px-4">Nombre</th>
                      <th className="table-header py-3 px-4">Cédula</th>
                      <th className="table-header py-3 px-4">Teléfono</th>
                      <th className="table-header py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPuestoDetails?.personas.map((p) => (
                      <tr key={p.cedula} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-4 font-medium">{p.nombre_completo}</td>
                        <td className="py-3 px-4 text-muted-foreground">{p.cedula}</td>
                        <td className="py-3 px-4 text-muted-foreground">{p.telefono || '-'}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setEditingPersona(p)}
                            className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                            title="Editar Amigo"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Edición Persona */}
        {editingPersona && (
          <EditPersonaModal
            person={editingPersona}
            isOpen={!!editingPersona}
            onClose={() => setEditingPersona(null)}
            onSave={async (updated) => {
              // Update local state temporarily or just refresh
              const { error } = await supabase
                .from('personas')
                .update({
                  municipio_puesto: updated.municipio_puesto,
                  puesto_votacion: updated.puesto_votacion,
                  mesa_votacion: updated.mesa_votacion,
                  lugar_votacion: updated.lugar_votacion,
                  estado: updated.estado,
                  notas: updated.notas,
                  telefono: updated.telefono,
                  nombre_completo: updated.nombre_completo,
                  email: updated.email
                })
                .eq('cedula', updated.cedula);

              if (error) {
                toast.error('Error al actualizar: ' + error.message);
              } else {
                toast.success('Amigo actualizado correctamente');
                fetchData();
                // Update the list inside the details modal too
                if (selectedPuestoDetails) {
                  const updatedList = selectedPuestoDetails.personas.map(per =>
                    per.cedula === updated.cedula ? { ...per, ...updated } : per
                  );
                  setSelectedPuestoDetails({ ...selectedPuestoDetails, personas: updatedList });
                }
                setEditingPersona(null);
              }
            }}
          />
        )}
      </div>
    </Layout >
  );
}
