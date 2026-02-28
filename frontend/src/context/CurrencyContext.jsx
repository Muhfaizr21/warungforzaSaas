import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const CurrencyContext = createContext();

export const useCurrency = () => useContext(CurrencyContext);

const DEFAULT_RATES = {
    IDR: 1,
    USD: 1 / 15600,
    EUR: 1 / 16800,
    AUD: 1 / 10200,
};

const CURRENCY_CONFIG = {
    IDR: { symbol: 'Rp', locale: 'id-ID', name: 'Rupiah' },
    USD: { symbol: '$', locale: 'en-US', name: 'US Dollar' },
    EUR: { symbol: '€', locale: 'de-DE', name: 'Euro' },
    AUD: { symbol: 'A$', locale: 'en-AU', name: 'AU Dollar' },
};

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(() => {
        return localStorage.getItem('user_override_currency') || localStorage.getItem('app_currency') || 'USD';
    });
    const [rates, setRates] = useState(DEFAULT_RATES);

    useEffect(() => {
        // We only store app_currency for active use, but we track overrides separately below
        localStorage.setItem('app_currency', currency);
    }, [currency]);

    // Expose a specific setter that remembers the user explicitly chose a currency
    const setCurrencyWithOverride = (val) => {
        localStorage.setItem('user_override_currency', val);
        setCurrency(val);
    };

    const [availableCurrencies, setAvailableCurrencies] = useState(Object.keys(CURRENCY_CONFIG));
    const [currencyConfigState, setCurrencyConfigState] = useState(CURRENCY_CONFIG);

    const fetchRealTimeRates = async () => {
        try {
            const [curRes, setRes] = await Promise.all([
                fetch(`${API_BASE_URL}/currencies`).catch(() => null),
                fetch(`${API_BASE_URL}/settings/public`).catch(() => null)
            ]);

            if (setRes) {
                const settingsData = await setRes.json();
                if (Array.isArray(settingsData)) {
                    const dbCurrency = settingsData.find(s => s.key === 'currency');
                    // If user never explicitly overrode the currency, update state to whatever the DB says
                    if (dbCurrency && dbCurrency.value && !localStorage.getItem('user_override_currency')) {
                        setCurrency(dbCurrency.value);
                    }
                }
            }

            if (curRes) {
                const data = await curRes.json();

                if (Array.isArray(data)) {
                    const newRates = {};
                    const newConfig = { ...CURRENCY_CONFIG }; // Start with defaults
                    const codes = [];

                    data.forEach(curr => {
                        newRates[curr.code] = 1 / (curr.exchange_rate || 1);
                        codes.push(curr.code);

                        newConfig[curr.code] = {
                            symbol: curr.symbol,
                            locale: curr.code === 'IDR' ? 'id-ID' : 'en-US',
                            name: curr.name
                        };
                    });

                    setRates(newRates);
                    setAvailableCurrencies(codes);
                    setCurrencyConfigState(newConfig);
                }
            }
        } catch (error) {
            console.error("Failed to sync backend rates or settings, using fallback:", error);
        }
    };

    useEffect(() => {
        fetchRealTimeRates();
        const interval = setInterval(fetchRealTimeRates, 3600000);
        return () => clearInterval(interval);
    }, []);

    const convertPrice = (priceInIDR) => {
        const rate = rates[currency] || 1;
        return priceInIDR * rate;
    };

    const formatPrice = (priceInIDR) => {
        const converted = convertPrice(priceInIDR);
        const config = currencyConfigState[currency] || { symbol: currency, locale: 'en-US' };

        // List of currencies that typically do not use decimals
        const zeroDecimalCurrencies = ['IDR', 'JPY', 'KRW', 'VND', 'TWD', 'HUF', 'CLP', 'PYG'];
        const isZeroDecimal = zeroDecimalCurrencies.includes(currency);

        return new Intl.NumberFormat(config.locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: isZeroDecimal ? 0 : 2,
            maximumFractionDigits: isZeroDecimal ? 0 : 2,
        }).format(converted);
    };

    return (
        <CurrencyContext.Provider value={{ currency, setCurrency: setCurrencyWithOverride, formatPrice, convertPrice, currencies: availableCurrencies, refreshCurrencies: fetchRealTimeRates }}>
            {children}
        </CurrencyContext.Provider>
    );
};
