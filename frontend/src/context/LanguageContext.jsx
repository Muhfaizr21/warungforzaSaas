import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en.json';
import id from '../locales/id.json';

const translations = { en, id };

const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    const [lang, setLang] = useState(() => {
        return localStorage.getItem('lang') || 'id';
    });

    const switchLang = useCallback((newLang) => {
        setLang(newLang);
        localStorage.setItem('lang', newLang);
    }, []);

    // t('nav.home') → reads translations[lang].nav.home
    const t = useCallback((key) => {
        const parts = key.split('.');
        let result = translations[lang];
        for (const part of parts) {
            if (result === undefined) return key;
            result = result[part];
        }
        return result ?? key;
    }, [lang]);

    return (
        <LanguageContext.Provider value={{ lang, switchLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
    return ctx;
};
