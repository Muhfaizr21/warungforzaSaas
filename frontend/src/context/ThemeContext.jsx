import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config/api';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const DEFAULT_THEME = {
    // ── Hero / Landing ──────────────────────────────────
    theme_hero_title: `Discover the Best Collectibles at Warung Forza`,
    theme_hero_subtitle: "Curating the most detailed and rare specimens from the world's leading artisans. Your gateway to the ultimate collection.",
    theme_hero_image: '/images/horror-hero.jpg',
    theme_logo: '/forza.png',

    // ── Core Brand ──────────────────────────────────────
    theme_accent_color: '#e11d48',
    theme_accent_hover: '#be123c',
    theme_accent_muted: 'rgba(225,29,72,0.15)',

    // ── Page Layout ─────────────────────────────────────
    theme_bg_color: '#030303',
    theme_surface_color: '#0d0d0d',
    theme_surface_2: '#111118',
    theme_border_color: 'rgba(255,255,255,0.08)',
    theme_border_strong: 'rgba(255,255,255,0.15)',

    // ── Text ────────────────────────────────────────────
    theme_text_primary: '#ffffff',
    theme_text_secondary: '#9ca3af',
    theme_text_muted: '#6b7280',
    theme_text_accent: '#e11d48',

    // ── Navbar ──────────────────────────────────────────
    theme_navbar_bg: 'rgba(3,3,3,0.80)',
    theme_navbar_text: 'rgba(255,255,255,0.5)',
    theme_navbar_text_hover: '#ffffff',
    theme_navbar_border: 'rgba(255,255,255,0.05)',

    // ── Buttons ─────────────────────────────────────────
    theme_btn_primary_bg: '#e11d48',
    theme_btn_primary_text: '#ffffff',
    theme_btn_primary_hover: '#be123c',
    theme_btn_secondary_bg: 'rgba(255,255,255,0.1)',
    theme_btn_secondary_text: '#ffffff',
    theme_btn_secondary_hover: 'rgba(255,255,255,0.2)',
    theme_btn_radius: '4px',

    // ── Product Cards ────────────────────────────────────
    theme_card_bg: 'rgba(255,255,255,0.03)',
    theme_card_border: 'rgba(255,255,255,0.08)',
    theme_card_radius: '12px',
    theme_card_hover_border: 'rgba(225,29,72,0.3)',
    theme_card_price_color: '#e11d48',
    theme_card_title_color: '#ffffff',
    theme_card_brand_color: '#6b7280',

    // ── Blog / News Cards ────────────────────────────────
    theme_blog_card_bg: '#0a0a0b',
    theme_blog_card_border: 'rgba(255,255,255,0.05)',
    theme_blog_card_radius: '8px',
    theme_blog_card_hover_border: 'rgba(225,29,72,0.3)',
    theme_blog_tag_color: '#d4af37',
    theme_blog_tag_bg: 'rgba(212,175,55,0.1)',
    theme_blog_title_color: '#ffffff',
    theme_blog_title_hover: '#e11d48',
    theme_blog_text_color: '#9ca3af',
    theme_blog_date_color: 'rgba(255,255,255,0.4)',
    theme_blog_section_bg: '#030303',

    // ── Shop / Listing Page ──────────────────────────────
    theme_shop_filter_bg: 'rgba(255,255,255,0.03)',
    theme_shop_filter_border: 'rgba(255,255,255,0.06)',
    theme_shop_filter_text: '#9ca3af',
    theme_shop_filter_active_bg: '#e11d48',
    theme_shop_filter_active_text: '#ffffff',
    theme_shop_section_bg: '#030303',
    theme_shop_section_heading: '#ffffff',
    theme_shop_label_color: '#e11d48',

    // ── Product Detail Page ──────────────────────────────
    theme_detail_bg: '#030303',
    theme_detail_panel_bg: 'rgba(255,255,255,0.02)',
    theme_detail_panel_border: 'rgba(255,255,255,0.06)',
    theme_detail_price_color: '#e11d48',
    theme_detail_title_color: '#ffffff',
    theme_detail_text_color: '#9ca3af',
    theme_detail_tab_active: '#e11d48',
    theme_detail_tab_bg: 'rgba(255,255,255,0.04)',

    // ── Forms & Inputs ───────────────────────────────────
    theme_input_bg: 'rgba(255,255,255,0.04)',
    theme_input_border: 'rgba(255,255,255,0.1)',
    theme_input_text: '#ffffff',
    theme_input_placeholder: '#6b7280',
    theme_input_focus_border: '#e11d48',
    theme_input_radius: '8px',
    theme_label_color: '#9ca3af',

    // ── Section Headers ──────────────────────────────────
    theme_section_label_color: '#e11d48',
    theme_section_heading_color: '#ffffff',
    theme_section_subtext_color: '#6b7280',
    theme_section_divider: 'rgba(255,255,255,0.05)',
    theme_section_bg_alt: 'rgba(255,255,255,0.01)',

    // ── Footer ───────────────────────────────────────────
    theme_footer_bg: '#030303',
    theme_footer_text: '#6b7280',
    theme_footer_heading: '#ffffff',
    theme_footer_link: '#6b7280',
    theme_footer_link_hover: '#ffffff',
    theme_footer_border: 'rgba(255,255,255,0.05)',

    // ── Jurassic Series Banner ────────────────────────────
    theme_jurassic_label: 'The Lost World Collection',
    theme_jurassic_title: 'Explore Our<br/>Jurassic Series<br/>Prime Figures!',
    theme_jurassic_desc: 'Unleash the prehistoric adventure with our premium Jurassic series collections. Masterfully crafted statues for the true enthusiast.',
    theme_jurassic_btn: 'Get Yours Now',
    theme_jurassic_bg: '/images/jurassic-bg.jpg',
    theme_jurassic_img1: '',
    theme_jurassic_img2: '',

    // ── Typography ───────────────────────────────────────
    theme_font_primary: 'Inter, sans-serif',
    theme_font_heading: 'Inter, sans-serif',

    // ── Badge / Status Colors ────────────────────────────
    theme_badge_success: '#10b981',
    theme_badge_warning: '#f59e0b',
    theme_badge_error: '#ef4444',
    theme_badge_info: '#3b82f6',

    // ── Custom CSS ───────────────────────────────────────
    theme_custom_css: '',
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(DEFAULT_THEME);
    const [publicSettings, setPublicSettings] = useState({});

    const loadTheme = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/settings/public`);
            const data = await res.json();
            if (Array.isArray(data)) {
                const newTheme = { ...DEFAULT_THEME };
                const newSettings = {};
                data.forEach(set => {
                    if (set.key.startsWith('theme_') && set.value) {
                        newTheme[set.key] = set.value;
                    } else {
                        newSettings[set.key] = set.value;
                    }
                });
                setTheme(newTheme);
                setPublicSettings(newSettings);
                // Inject CSS vars into :root
                injectCSSVars(newTheme);
            }
        } catch (error) {
            console.error("Failed to fetch public theme settings");
            injectCSSVars(DEFAULT_THEME);
        }
    };

    const injectCSSVars = (t) => {
        const root = document.documentElement;
        const vars = {
            // Core Brand
            '--accent': t.theme_accent_color,
            '--accent-hover': t.theme_accent_hover,
            '--accent-muted': t.theme_accent_muted,
            // Page
            '--bg': t.theme_bg_color,
            '--surface': t.theme_surface_color,
            '--surface-2': t.theme_surface_2,
            '--border': t.theme_border_color,
            '--border-strong': t.theme_border_strong,
            // Text
            '--text-primary': t.theme_text_primary,
            '--text-secondary': t.theme_text_secondary,
            '--text-muted': t.theme_text_muted,
            '--text-accent': t.theme_text_accent,
            // Navbar
            '--navbar-bg': t.theme_navbar_bg,
            '--navbar-text': t.theme_navbar_text,
            '--navbar-text-hover': t.theme_navbar_text_hover,
            '--navbar-border': t.theme_navbar_border,
            // Buttons
            '--btn-primary-bg': t.theme_btn_primary_bg,
            '--btn-primary-text': t.theme_btn_primary_text,
            '--btn-primary-hover': t.theme_btn_primary_hover,
            '--btn-secondary-bg': t.theme_btn_secondary_bg,
            '--btn-secondary-text': t.theme_btn_secondary_text,
            '--btn-secondary-hover': t.theme_btn_secondary_hover,
            '--btn-radius': t.theme_btn_radius,
            // Product Cards
            '--card-bg': t.theme_card_bg,
            '--card-border': t.theme_card_border,
            '--card-radius': t.theme_card_radius,
            '--card-hover-border': t.theme_card_hover_border,
            '--card-price-color': t.theme_card_price_color,
            '--card-title-color': t.theme_card_title_color,
            '--card-brand-color': t.theme_card_brand_color,
            // Blog Cards
            '--blog-card-bg': t.theme_blog_card_bg,
            '--blog-card-border': t.theme_blog_card_border,
            '--blog-card-radius': t.theme_blog_card_radius,
            '--blog-card-hover-border': t.theme_blog_card_hover_border,
            '--blog-tag-color': t.theme_blog_tag_color,
            '--blog-tag-bg': t.theme_blog_tag_bg,
            '--blog-title-color': t.theme_blog_title_color,
            '--blog-title-hover': t.theme_blog_title_hover,
            '--blog-text-color': t.theme_blog_text_color,
            '--blog-date-color': t.theme_blog_date_color,
            '--blog-section-bg': t.theme_blog_section_bg,
            // Shop
            '--shop-filter-bg': t.theme_shop_filter_bg,
            '--shop-filter-border': t.theme_shop_filter_border,
            '--shop-filter-text': t.theme_shop_filter_text,
            '--shop-filter-active-bg': t.theme_shop_filter_active_bg,
            '--shop-filter-active-text': t.theme_shop_filter_active_text,
            '--shop-section-bg': t.theme_shop_section_bg,
            '--shop-section-heading': t.theme_shop_section_heading,
            '--shop-label-color': t.theme_shop_label_color,
            // Product Detail
            '--detail-bg': t.theme_detail_bg,
            '--detail-panel-bg': t.theme_detail_panel_bg,
            '--detail-panel-border': t.theme_detail_panel_border,
            '--detail-price-color': t.theme_detail_price_color,
            '--detail-title-color': t.theme_detail_title_color,
            '--detail-text-color': t.theme_detail_text_color,
            '--detail-tab-active': t.theme_detail_tab_active,
            '--detail-tab-bg': t.theme_detail_tab_bg,
            // Forms
            '--input-bg': t.theme_input_bg,
            '--input-border': t.theme_input_border,
            '--input-text': t.theme_input_text,
            '--input-placeholder': t.theme_input_placeholder,
            '--input-focus-border': t.theme_input_focus_border,
            '--input-radius': t.theme_input_radius,
            '--label-color': t.theme_label_color,
            // Sections
            '--section-label-color': t.theme_section_label_color,
            '--section-heading-color': t.theme_section_heading_color,
            '--section-subtext-color': t.theme_section_subtext_color,
            '--section-divider': t.theme_section_divider,
            '--section-bg-alt': t.theme_section_bg_alt,
            // Footer
            '--footer-bg': t.theme_footer_bg,
            '--footer-text': t.theme_footer_text,
            '--footer-heading': t.theme_footer_heading,
            '--footer-link': t.theme_footer_link,
            '--footer-link-hover': t.theme_footer_link_hover,
            '--footer-border': t.theme_footer_border,
            // Typography
            '--font-primary': t.theme_font_primary,
            '--font-heading': t.theme_font_heading,
            // Badges
            '--badge-success': t.theme_badge_success,
            '--badge-warning': t.theme_badge_warning,
            '--badge-error': t.theme_badge_error,
            '--badge-info': t.theme_badge_info,
        };
        Object.entries(vars).forEach(([key, val]) => {
            if (val) root.style.setProperty(key, val);
        });
        // Inject custom CSS if present
        let el = document.getElementById('theme-custom-css');
        if (t.theme_custom_css) {
            if (!el) { el = document.createElement('style'); el.id = 'theme-custom-css'; document.head.appendChild(el); }
            el.textContent = t.theme_custom_css;
        } else if (el) { el.textContent = ''; }
    };

    useEffect(() => {
        loadTheme();

        // Expose a bulk update method for the Theme Studio to avoid firing N separate 
        // state updates and triggering N separate postMessages/DOM injections when setting presets.
        window.ThemeContext_BulkUpdate = (newTheme) => {
            setTheme(prev => {
                const updated = { ...prev, ...newTheme };
                injectCSSVars(updated);
                try {
                    Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
                        iframe.contentWindow?.postMessage({ type: 'THEME_PREVIEW', theme: updated }, window.location.origin);
                    });
                } catch (e) { }
                return updated;
            });
        };

        return () => {
            delete window.ThemeContext_BulkUpdate;
        };
    }, []);

    // ── PostMessage Listener (for iframe preview from Theme Studio) ──
    useEffect(() => {
        const handleMessage = (event) => {
            // Accept messages from same origin only
            if (event.origin !== window.location.origin) return;
            if (event.data?.type === 'THEME_PREVIEW') {
                const newTheme = event.data.theme;
                setTheme(prev => ({ ...prev, ...newTheme }));
                injectCSSVars({ ...DEFAULT_THEME, ...newTheme });
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const updateThemeContext = (key, val) => {
        setTheme(prev => {
            const updated = { ...prev, [key]: val };
            injectCSSVars(updated);
            // Also broadcast to all iframes on the page (for Theme Studio live preview)
            try {
                Array.from(document.querySelectorAll('iframe')).forEach(iframe => {
                    iframe.contentWindow?.postMessage(
                        { type: 'THEME_PREVIEW', theme: updated },
                        window.location.origin
                    );
                });
            } catch (e) { /* cross-origin iframe guard */ }
            return updated;
        });
    };

    return (
        <ThemeContext.Provider value={{ theme, publicSettings, refreshTheme: loadTheme, updateThemeContext, injectCSSVars }}>
            {children}
        </ThemeContext.Provider>
    );
};
