import React, { useEffect, useRef, useMemo } from 'react';
import jsVectorMap from 'jsvectormap';
import 'jsvectormap/dist/jsvectormap.css';
import 'jsvectormap/dist/maps/world-merc.js';

const MapChart = ({ demographics, countries = [] }) => {
    const mapRef = useRef(null);
    const mapInstance = useRef(null);

    // Helper for common country coordinates
    const getCoords = (code) => {
        // Dynamically fetch from restcountries data
        const countryData = countries.find(c => c.code === code);
        if (countryData && countryData.latlng && countryData.latlng.length >= 2) {
            return countryData.latlng;
        }

        // Fallback for some hardcoded ones if not loaded yet
        const coordsMap = {
            'ID': [-0.7893, 113.9213],
            'US': [37.0902, -95.7129],
            'GB': [55.3781, -3.4360],
            'FR': [46.2276, 2.2137],
            'DE': [51.1657, 10.4515],
            'JP': [36.2048, 138.2529],
            'CN': [35.8617, 104.1954],
            'BR': [-14.2350, -51.9253],
            'AU': [-25.2744, 133.7751],
            'IN': [20.5937, 78.9629],
            'RU': [61.5240, 105.3188],
            'EG': [26.8206, 30.8025],
            'MY': [4.2105, 101.9758],
            'SG': [1.3521, 103.8198],
            'AE': [23.4241, 53.8478],
            'TR': [38.9637, 35.2433],
            'NL': [52.1326, 5.2913],
            'IT': [41.8719, 12.5674],
            'ES': [40.4637, -3.7492],
            'KR': [35.9078, 127.7669],
            'SA': [23.8859, 45.0792],
            'CA': [56.1304, -106.3468],
        };
        return coordsMap[code];
    };

    const markers = useMemo(() => {
        return demographics?.data?.map(item => {
            const countryData = countries.find(c => c.code === item.code);
            const name = countryData?.name || item.country;
            return {
                name: name,
                coords: getCoords(item.code),
                style: { fill: '#10B981' }
            };
        }).filter(m => m.coords) || [];
    }, [demographics, countries]);

    useEffect(() => {
        if (!mapRef.current || !demographics) return;

        const cleanup = () => {
            if (mapInstance.current) {
                try {
                    mapInstance.current.destroy();
                } catch (e) {
                    console.warn('Map cleanup error:', e);
                }
                mapInstance.current = null;
            }
            if (mapRef.current) {
                mapRef.current.innerHTML = '';
            }
        };

        cleanup();

        setTimeout(() => {
            try {
                if (!mapRef.current) return;
                mapInstance.current = new jsVectorMap({
                    selector: mapRef.current,
                    map: 'world_merc',
                    draggable: true,
                    zoomButtons: true,
                    zoomOnScroll: true,
                    bindTouchEvents: true,
                    normalizeFunction: 'polynomial',
                    hoverOpacity: 0.8,
                    hoverColor: false,
                    markers: markers,
                    markerStyle: {
                        initial: {
                            fill: '#10B981',
                            stroke: '#FFF',
                            strokeWidth: 2,
                            r: 5
                        },
                        hover: {
                            fill: '#10B981',
                            strokeWidth: 3,
                            cursor: 'pointer'
                        }
                    },
                    regionStyle: {
                        initial: {
                            fill: '#242A33',
                            fillOpacity: 1,
                            stroke: '#313D4A',
                            strokeWidth: 0.5,
                        },
                        hover: {
                            fillOpacity: 0.8,
                            cursor: 'pointer',
                            fill: '#313D4A'
                        }
                    },
                    backgroundColor: 'transparent',
                    focusOn: {
                        region: 'ID',
                        scale: 1,
                        animate: true
                    },
                    onMarkerTipShow: function (e, tip, index) {
                        tip.html(
                            '<div style="background-color: #10B981; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 11px;">' +
                            markers[index].name +
                            '</div>'
                        );
                    }
                });
            } catch (error) {
                console.error('Failed to initialize map:', error);
            }
        }, 100);

        return cleanup;
    }, [demographics, markers]);

    return (
        <div className="w-full h-full jsvectormap-container overflow-hidden relative border border-white/5 rounded-xl bg-[#1A2231]/30" ref={mapRef}></div>
    );
};

export default MapChart;
