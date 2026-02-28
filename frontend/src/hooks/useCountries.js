import { useState, useEffect } from 'react';

export const useCountries = () => {
    const [countries, setCountries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCountries = async () => {
            const cached = localStorage.getItem('world_countries_v3');
            if (cached) {
                setCountries(JSON.parse(cached));
                setLoading(false);
                return;
            }

            try {
                // Fetch basic name, cca2 (ISO code), idd (phone code), flag, and latlng for map coordinates
                const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag,latlng');
                const data = await res.json();

                const formatted = data.map(c => {
                    let dialCode = '';
                    if (c.idd && c.idd.root) {
                        dialCode = c.idd.root;
                        if (c.idd.suffixes && c.idd.suffixes.length === 1) {
                            dialCode += c.idd.suffixes[0];
                        }
                    }
                    return {
                        code: c.cca2,
                        name: c.name.common,
                        dialCode: dialCode,
                        flag: c.flag || '',
                        latlng: c.latlng || null
                    };
                }).filter(c => c.name && c.code).sort((a, b) => a.name.localeCompare(b.name));

                localStorage.setItem('world_countries_v3', JSON.stringify(formatted));
                setCountries(formatted);
            } catch (err) {
                console.error("Failed to fetch countries", err);
                // Fallback to basic list if API fails
                setCountries([
                    { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', latlng: [-0.7893, 113.9213] },
                    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', latlng: [37.0902, -95.7129] },
                    { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', latlng: [1.3521, 103.8198] },
                    { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', latlng: [4.2105, 101.9758] }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchCountries();
    }, []);

    return { countries, loading };
};
