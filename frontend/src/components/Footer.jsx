import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

const Footer = () => {
    const { theme } = useTheme();
    const { t } = useLanguage();

    const fBg = theme.theme_footer_bg || '#030303';
    const fBorder = theme.theme_footer_border || 'rgba(255,255,255,0.05)';
    const fHeading = theme.theme_footer_heading || '#ffffff';
    const fText = theme.theme_footer_text || '#6b7280';
    const fLink = theme.theme_footer_link || '#6b7280';
    const accent = theme.theme_accent_color || '#e11d48';
    const logo = theme.theme_logo || '/forza.png';

    return (
        <footer
            className="pt-16 md:pt-24 pb-8 md:pb-12 relative overflow-hidden"
            style={{ backgroundColor: fBg, borderTop: `1px solid ${fBorder}` }}
        >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 w-full h-px" style={{ backgroundImage: `linear-gradient(to right, transparent, ${accent}33, transparent)` }} />

            <div className="container relative z-10 max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 md:gap-16 mb-12 md:mb-16">

                    {/* Brand Info */}
                    <div className="lg:col-span-1">
                        <div className="mb-6 group cursor-pointer inline-block" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img
                                src={logo.startsWith('http') ? logo : `http://localhost:5000${logo}`}
                                alt="FORZA SHOP"
                                className="h-8 w-auto object-contain brightness-95 group-hover:brightness-110 transition-all duration-300"
                                onError={e => { e.target.src = '/forza.png'; }}
                            />
                        </div>
                        <p className="mb-6 leading-relaxed text-sm" style={{ color: fText, fontFamily: theme.theme_font_primary }}>
                            {t('footer.description')}
                        </p>
                    </div>

                    {/* Navigation Links */}
                    <div>
                        <h4 className="font-bold text-sm mb-6 uppercase tracking-wider" style={{ color: fHeading, fontFamily: theme.theme_font_heading }}>{t('footer.categories')}</h4>
                        <ul className="space-y-4">
                            {[
                                { label: t('nav.preorder'), path: '/preorder' },
                                { label: t('nav.readystock'), path: '/readystock' },
                            ].map(link => (
                                <li key={link.label}>
                                    <Link
                                        to={link.path}
                                        className="text-sm transition-colors duration-300"
                                        style={{ color: fLink }}
                                        onMouseEnter={e => e.target.style.color = theme.theme_footer_link_hover || '#fff'}
                                        onMouseLeave={e => e.target.style.color = fLink}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Information Links */}
                    <div>
                        <h4 className="font-bold text-sm mb-6 uppercase tracking-wider" style={{ color: fHeading, fontFamily: theme.theme_font_heading }}>{t('footer.information')}</h4>
                        <ul className="space-y-4">
                            {[
                                { label: t('footer.howToBuy'), path: '/how-to-buy' },
                                { label: t('footer.shipping'), path: '/shipping' },
                                { label: t('footer.faq'), path: '/faq' }
                            ].map(link => (
                                <li key={link.label}>
                                    <Link
                                        to={link.path}
                                        className="text-sm transition-colors duration-300"
                                        style={{ color: fLink }}
                                        onMouseEnter={e => e.target.style.color = theme.theme_footer_link_hover || '#fff'}
                                        onMouseLeave={e => e.target.style.color = fLink}
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                </div>

                <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-6" style={{ borderTop: `1px solid ${fBorder}` }}>
                    <div className="flex flex-col gap-1 text-center md:text-left">
                        <p className="text-xs" style={{ color: fText }}>© 2026 WARUNG FORZA SHOP</p>
                        <p className="text-[10px]" style={{ color: fText, opacity: 0.6 }}>{t('footer.allRightsReserved')}</p>
                    </div>

                    <div className="flex gap-6">
                        {[{ label: t('footer.privacyPolicy'), path: '/privacy' }, { label: t('footer.termsConditions'), path: '/terms' }].map(l => (
                            <Link
                                key={l.label}
                                to={l.path}
                                className="text-xs transition-colors"
                                style={{ color: fLink }}
                                onMouseEnter={e => e.target.style.color = theme.theme_footer_link_hover || '#fff'}
                                onMouseLeave={e => e.target.style.color = fLink}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
