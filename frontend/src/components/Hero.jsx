import React from 'react';
import Image from './Image';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Hero = () => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    return (
        <section
            className="relative min-h-[72vh] flex items-center justify-center overflow-hidden scanline"
            style={{ backgroundColor: theme.theme_bg_color || '#030303' }}
        >
            {/* Cinematic Horror Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src={theme.theme_hero_image?.startsWith('http') ? theme.theme_hero_image : `http://localhost:5000${theme.theme_hero_image}`}
                    fallbackSrc="/images/horror-hero.jpg"
                    className="w-full h-full object-cover scale-100 opacity-60 brightness-[0.6] transition-transform duration-[30s] ease-linear hover:scale-110"
                    alt="Hero Background"
                />
                {/* Lightning Effect Overlay */}
                <div className="absolute inset-0 bg-blue-100/30 lightning-flash z-10 pointer-events-none"></div>

                <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-[#030303]"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#030303] via-transparent to-[#030303] opacity-60"></div>
                <div className="absolute inset-0 horror-vignette opacity-40"></div>
            </div>

            <div className="container relative z-10 w-full pt-10">
                <div className="max-w-4xl floating">
                    <h1 className="mb-6 cinematic-text italic" style={{ color: theme.theme_text_primary || '#fff', fontFamily: theme.theme_font_heading }}>
                        <span className="block text-xl md:text-4xl font-black drop-shadow-2xl">
                            {theme.theme_hero_title}
                        </span>
                    </h1>

                    <p className="text-xs md:text-sm font-medium mb-8 max-w-xl leading-relaxed opacity-60" style={{ color: theme.theme_text_secondary || '#9ca3af', fontFamily: theme.theme_font_primary }}>
                        {theme.theme_hero_subtitle}
                    </p>

                    <div className="flex flex-wrap gap-4 mb-10">
                        <button
                            className="relative group px-7 py-3 overflow-hidden transition-all shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                            style={{ borderRadius: theme.theme_btn_radius || '4px' }}
                        >
                            <div className="absolute inset-0 transition-all"
                                style={{ backgroundImage: `linear-gradient(to right, ${theme.theme_btn_primary_bg || '#e11d48'}, #7f1d1d)` }}
                            />
                            <span className="relative font-black text-xs uppercase tracking-[0.2em]" style={{ color: theme.theme_btn_primary_text || '#fff' }}>
                                {t('hero.shopCollection')}
                            </span>
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-10 opacity-40 hover:opacity-100 transition-opacity duration-700">
                        <div className="flex items-center gap-4">
                            <span className="w-12 h-px" style={{ backgroundColor: theme.theme_accent_color || '#e11d48', opacity: 0.5 }}></span>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-[9px] uppercase tracking-[0.3em]">{t('hero.intercontinental')}</span>
                                <span className="text-gray-500 text-[8px] uppercase font-black">{t('hero.secureTransmission')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="w-12 h-px" style={{ backgroundColor: theme.theme_accent_color || '#e11d48', opacity: 0.5 }}></span>
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-[9px] uppercase tracking-[0.3em]">{t('hero.masterpieceGrade')}</span>
                                <span className="text-gray-500 text-[8px] uppercase font-black">{t('hero.certifiedAuthenticity')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Elegant Side Scroll Indicator */}
            <div className="absolute right-10 bottom-10 flex flex-col items-center gap-4 opacity-30">
                <span className="text-[10px] text-white font-black uppercase tracking-[0.5em] rotate-90 mb-10">{t('hero.scroll')}</span>
                <div className="w-px h-24 bg-gradient-to-b from-white to-transparent"></div>
            </div>
        </section>
    );

};

export default Hero;
