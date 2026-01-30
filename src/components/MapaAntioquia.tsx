import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapaAntioquiaProps {
    municipiosData: { name: string; count: number }[];
}

export default function MapaAntioquia({ municipiosData }: MapaAntioquiaProps) {
    const mapRef = useRef<L.Map | null>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    // Colores extraídos de la foto de referencia
    const getColorByCount = (count: number): string => {
        if (count > 30) return '#059669'; // Esmeralda oscuro
        if (count >= 15) return '#10b981'; // Esmeralda medio
        if (count >= 5) return '#34d399'; // Esmeralda claro
        if (count >= 1) return '#a7f3d0'; // Aqua muy claro
        return '#f3f4f6'; // Gris fondo (sin impulsores)
    };

    const normalizeName = (name: string): string => {
        return name
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ñ/g, 'n');
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }

        // Inicializar mapa con fondo gris sólido (sin tiles de calles para que se vea como la foto)
        const map = L.map(mapContainerRef.current, {
            center: [7.0, -75.5],
            zoom: 8,
            zoomControl: true,
            scrollWheelZoom: true,
            attributionControl: false,
        });

        mapRef.current = map;

        const municipiosMap = new Map(
            municipiosData.map((m) => [normalizeName(m.name), m.count])
        );

        fetch('/antioquia-municipios.geojson')
            .then(res => res.json())
            .then(geojsonData => {
                L.geoJSON(geojsonData, {
                    style: (feature) => {
                        const name = feature?.properties?.name || feature?.properties?.MPIO_CNMBR || '';
                        const count = municipiosMap.get(normalizeName(name)) || 0;
                        return {
                            fillColor: getColorByCount(count),
                            weight: 1,
                            opacity: 1,
                            color: '#000000', // Bordes negros
                            fillOpacity: 1
                        };
                    },
                    onEachFeature: (feature, layer) => {
                        const name = feature?.properties?.name || feature?.properties?.MPIO_CNMBR || 'Desconocido';
                        const count = municipiosMap.get(normalizeName(name)) || 0;

                        // Popup rediseñado EXACTAMENTE como el de la foto
                        const popupContent = `
              <div style="min-width: 140px; font-family: sans-serif; padding: 5px;">
                <div style="font-weight: 800; font-size: 14px; text-transform: uppercase; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px;">
                  ${name}
                </div>
                <div style="color: #6b7280; font-size: 11px; margin-bottom: 2px;">
                  Impulsores Registrados
                </div>
                <div style="font-size: 24px; font-weight: 800; color: #059669;">
                  ${count}
                </div>
              </div>
            `;

                        layer.bindPopup(popupContent, {
                            closeButton: false,
                            className: 'custom-map-popup'
                        });

                        layer.on({
                            mouseover: (e) => {
                                const l = e.target as L.Path;
                                l.setStyle({
                                    weight: 2,
                                    color: '#059669',
                                    fillOpacity: 0.9
                                });
                                // Open popup on hover
                                l.openPopup();
                            },
                            mouseout: (e) => {
                                const l = e.target as L.Path;
                                l.setStyle({
                                    weight: 1,
                                    color: '#000000',
                                    fillOpacity: 1
                                });
                                // Close popup when leaving
                                l.closePopup();
                            },
                        });
                    }
                }).addTo(map);

                // Ajustar vista para que quepa todo Antioquia inicialmente
                const bounds = L.geoJSON(geojsonData).getBounds();
                map.fitBounds(bounds);
            });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [municipiosData]);

    return (
        <>
            <style>{`
        .leaflet-container {
          background: #f3f4f6 !important;
        }
        .custom-map-popup .leaflet-popup-content-wrapper {
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          padding: 0;
        }
        .custom-map-popup .leaflet-popup-content {
          margin: 12px;
        }
        .custom-map-popup .leaflet-popup-tip {
          background: white;
        }
      `}</style>
            <div ref={mapContainerRef} className="w-full h-full cursor-default" />
        </>
    );
}
