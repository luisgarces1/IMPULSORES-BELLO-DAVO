
import { useEffect, useState } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Helper to fit bounds to GeoJSON removed for stability


interface AntioquiaMapProps {
    municipioCounts: Record<string, number>;
}

export function AntioquiaMap({ municipioCounts }: AntioquiaMapProps) {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [loading, setLoading] = useState(true);


    useEffect(() => {
        fetch('/antioquia-municipios.geojson')
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data && data.features) {
                    setGeoJsonData(data);
                } else {
                    console.error('Invalid GeoJSON format');
                    setGeoJsonData(null);
                }
                setLoading(false);
            })
            .catch((err) => {
                console.error('Map fetch error:', err);
                setLoading(false);
                // We keep geoJsonData null to trigger error view
            });
    }, []);

    const normalizeName = (name: string) => {
        if (!name) return 'UNKNOWN';
        return name
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .trim();
    };

    // Green palette based on the reference image
    const getColor = (count: number) => {
        return count > 50 ? '#064e3b' : // Deepest green
            count > 20 ? '#059669' : // Dark green
                count > 10 ? '#10b981' : // Medium green
                    count > 5 ? '#34d399' : // Light green
                        count > 0 ? '#a7f3d0' : // Very light green
                            '#f1f5f9';  // Gray/White for no data
    };

    const style = (feature: any) => {
        try {
            const name = normalizeName(feature?.properties?.name || feature?.properties?.NAME || '');
            const count = municipioCounts[name] || 0;
            const hasData = count > 0;

            return {
                fillColor: getColor(count),
                weight: 1,
                opacity: 1,
                color: '#ffffff', // White borders
                dashArray: '',
                fillOpacity: hasData ? 0.9 : 0.4
            };
        } catch (e) {
            return {};
        }
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        try {
            const name = normalizeName(feature?.properties?.name || feature?.properties?.NAME || '');
            const count = municipioCounts[name] || 0;

            layer.bindTooltip(`
                <div class="text-center font-sans">
                    <strong class="uppercase text-xs block">${name}</strong>
                    <span class="text-sm font-bold text-emerald-700">
                        ${count} colaboradores
                    </span>
                </div>
            `, {
                permanent: false,
                direction: 'top',
                className: 'bg-white border-0 shadow-lg px-2 py-1 rounded'
            });

            if (layer instanceof L.Path) {
                layer.on({
                    mouseover: (e: any) => {
                        const l = e.target;
                        l.setStyle({
                            weight: 2,
                            color: '#64748b',
                            fillOpacity: 1,
                        });
                        l.bringToFront();
                    },
                    mouseout: (e: any) => {
                        const l = e.target;
                        const c = municipioCounts[name] || 0;
                        const hasData = c > 0;
                        l.setStyle({
                            fillColor: getColor(c),
                            weight: 1,
                            color: '#ffffff',
                            fillOpacity: hasData ? 0.9 : 0.4
                        });
                    }
                });
            }
        } catch (e) { }
    };

    if (loading) {
        return <div className="h-[500px] w-full flex items-center justify-center bg-gray-50 rounded-xl rounded-tr-none rounded-br-none text-muted-foreground">Cargando mapa...</div>;
    }

    if (!geoJsonData) {
        return <div className="h-[500px] w-full flex items-center justify-center bg-gray-50 rounded-xl rounded-tr-none rounded-br-none text-muted-foreground">Mapa no disponible</div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-none border-none">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900">Territorio</h2>
                <p className="text-slate-500">Distribución geográfica de colaboradores por municipio</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Map Area */}
                <div className="flex-grow h-[500px] bg-slate-100 rounded-xl overflow-hidden relative border border-slate-200">
                    <MapContainer
                        zoom={7}
                        center={[7.0, -75.5]}
                        scrollWheelZoom={false}
                        doubleClickZoom={false}
                        attributionControl={false}
                        zoomControl={true}
                        dragging={true}
                        style={{ height: '100%', width: '100%', background: '#f1f5f9' }}
                    >
                        <GeoJSON
                            key={JSON.stringify(municipioCounts)}
                            data={geoJsonData}
                            style={style}
                            onEachFeature={onEachFeature}
                        />

                    </MapContainer>
                </div>

                {/* Sidebar / Legend */}
                <div className="w-full lg:w-80 flex flex-col gap-6">
                    {/* Legend Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-blue-700 mb-4 text-sm uppercase tracking-wide">Leyenda de Colaboradores</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#064e3b]"></span>
                                <span className="text-sm text-slate-600 font-medium">{'>'} 50</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#059669]"></span>
                                <span className="text-sm text-slate-600 font-medium">21 - 50</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#10b981]"></span>
                                <span className="text-sm text-slate-600 font-medium">11 - 20</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#34d399]"></span>
                                <span className="text-sm text-slate-600 font-medium">6 - 10</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#a7f3d0]"></span>
                                <span className="text-sm text-slate-600 font-medium">1 - 5</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-5 h-5 rounded flex-shrink-0 bg-[#f1f5f9] border border-slate-200"></span>
                                <span className="text-sm text-slate-400">Sin Colaboradores</span>
                            </div>
                        </div>
                    </div>

                    {/* Analysis Card */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-grow">
                        <h3 className="font-bold text-blue-700 mb-2 text-sm uppercase tracking-wide">Análisis Territorial</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">
                            El mapa muestra la densidad de colaboradores registrados en cada municipio de Antioquia.
                            <br /><br />
                            Los municipios en <strong className="text-emerald-700">verde oscuro</strong> representan los centros con mayor fuerza electoral en tu equipo.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
