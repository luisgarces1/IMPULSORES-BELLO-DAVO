import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import MapaAntioquia from '@/components/MapaAntioquia';

interface MunicipioData {
    name: string;
    count: number;
    percentage: number;
}

export default function TerritorioElectoral() {
    const [municipiosData, setMunicipiosData] = useState<MunicipioData[]>([]);
    const [totalPersonas, setTotalPersonas] = useState(0);
    const [loading, setLoading] = useState(true);
    const [selectedMunicipio, setSelectedMunicipio] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: personas } = await supabase
                .from('personas')
                .select('*');

            if (personas) {
                const total = personas.length;
                setTotalPersonas(total);

                // Agrupar por municipio
                const municipiosMap = personas.reduce((acc: any, curr) => {
                    const mun = curr.municipio_votacion || 'No definido';
                    if (!acc[mun]) {
                        acc[mun] = 0;
                    }
                    acc[mun] += 1;
                    return acc;
                }, {});

                // Convertir a array y ordenar
                const municipiosArray: MunicipioData[] = Object.entries(municipiosMap)
                    .map(([name, count]) => ({
                        name,
                        count: count as number,
                        percentage: total > 0 ? ((count as number) / total) * 100 : 0,
                    }))
                    .sort((a, b) => b.count - a.count);

                setMunicipiosData(municipiosArray);
            }
        } catch (error) {
            console.error('Error fetching territorio data:', error);
            toast.error('Error al cargar los datos del territorio');
        } finally {
            setLoading(false);
        }
    };

    const getColorByCount = (count: number): string => {
        if (count > 10) return '#0d5e3a'; // Verde muy oscuro
        if (count >= 5) return '#16a34a'; // Verde oscuro
        if (count >= 3) return '#22c55e'; // Verde medio
        if (count >= 2) return '#4ade80'; // Verde claro
        if (count >= 1) return '#86efac'; // Verde muy claro
        return '#e5e7eb'; // Gris (sin impulsores)
    };

    if (loading) {
        return (
            <Layout>
                <div className="p-8 flex items-center justify-center h-[80vh]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-muted-foreground">Cargando mapa territorial...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-4 md:p-8 bg-muted/30 min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                        Territorio Electoral
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Distribución geográfica de la meta electoral por municipio
                    </p>
                </div>

                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="stat-card border-l-4 border-l-primary">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Impulsores</p>
                                <p className="text-3xl font-bold font-display text-primary">{totalPersonas}</p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card border-l-4 border-l-success">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-success/10 rounded-xl">
                                <MapPin className="w-6 h-6 text-success" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Municipios Cubiertos</p>
                                <p className="text-3xl font-bold font-display text-success">
                                    {municipiosData.filter(m => m.name !== 'No definido').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="stat-card border-l-4 border-l-warning">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-warning/10 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-warning" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Municipio Líder</p>
                                <p className="text-xl font-bold font-display text-warning truncate">
                                    {municipiosData[0]?.name || 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    {/* Map Area */}
                    <div className="xl:col-span-3 glass-panel p-4 bg-[#f3f4f6]">
                        <div className="mb-4 flex justify-between items-center px-2">
                            <div>
                                <h2 className="text-2xl font-display font-bold text-foreground">
                                    Mapa de Antioquia
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Distribución territorial de impulsores
                                </p>
                            </div>
                        </div>

                        {/* Map Container */}
                        <div className="bg-[#f3f4f6] rounded-2xl shadow-inner border border-border overflow-hidden" style={{ height: '800px' }}>
                            <MapaAntioquia municipiosData={municipiosData} />
                        </div>
                    </div>

                    {/* Legend and Analysis */}
                    <div className="space-y-6">
                        {/* Legend */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-display font-bold text-primary mb-4">
                                Leyenda de Impulsores
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#0d5e3a' }} />
                                    <span className="text-sm font-medium">&gt; 10</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#16a34a' }} />
                                    <span className="text-sm font-medium">5 - 10</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#22c55e' }} />
                                    <span className="text-sm font-medium">3 - 4</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#4ade80' }} />
                                    <span className="text-sm font-medium">2</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: '#86efac' }} />
                                    <span className="text-sm font-medium">1</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-muted" />
                                    <span className="text-sm font-medium text-muted-foreground">Sin Impulsores</span>
                                </div>
                            </div>
                        </div>

                        {/* Territorial Analysis */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-display font-bold text-primary mb-4">
                                Análisis Territorial
                            </h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                El mapa muestra la distribución de impulsores electorales por cada municipio de Antioquia.
                                Los municipios en verde oscuro representan las zonas con mayor número de impulsores registrados.
                            </p>
                        </div>

                        {/* Top Municipalities */}
                        <div className="glass-panel p-6">
                            <h3 className="text-lg font-display font-bold text-primary mb-4">
                                Top 5 Municipios
                            </h3>
                            <div className="space-y-3">
                                {municipiosData.slice(0, 5).map((mun, idx) => (
                                    <div
                                        key={mun.name}
                                        className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/30 hover:bg-muted/40 transition-colors cursor-pointer"
                                        onClick={() => setSelectedMunicipio(mun.name)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                                                style={{ backgroundColor: getColorByCount(mun.count) }}
                                            >
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">{mun.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {mun.percentage.toFixed(1)}% del total
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-primary">{mun.count}</p>
                                            <p className="text-xs text-muted-foreground">impulsores</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Full Municipality List */}
                <div className="mt-8 glass-panel p-8">
                    <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                        Todos los Municipios
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {municipiosData.map((mun) => (
                            <div
                                key={mun.name}
                                className="p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-lg transition-all cursor-pointer"
                                style={{
                                    borderLeftWidth: '4px',
                                    borderLeftColor: getColorByCount(mun.count),
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-sm">{mun.name}</h4>
                                    <MapPin className="w-4 h-4 text-primary" />
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-2xl font-black text-primary">{mun.count}</p>
                                        <p className="text-xs text-muted-foreground">impulsores</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-success">{mun.percentage.toFixed(1)}%</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
