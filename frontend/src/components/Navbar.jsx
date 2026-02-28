import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { HiShoppingBag, HiLogout, HiUser, HiHeart, HiChevronDown, HiCreditCard } from 'react-icons/hi';
import { useCurrency } from '../context/CurrencyContext';
import { publicService } from '../services/publicService';
import { customerService } from '../services/customerService';
import NotificationBell from './NotificationBell';
import { useTheme } from '../context/ThemeContext';
import { UPLOAD_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [series, setSeries] = useState([]);
    const navigate = useNavigate();
    const { cartCount } = useCart();
    const { currency, setCurrency, currencies } = useCurrency();
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const [balance, setBalance] = useState(0);
    const { formatPrice } = useCurrency();
    const { theme } = useTheme();
    const { lang, switchLang, t } = useLanguage();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        if (token) {
            setIsAuthenticated(true);
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch { /* ignore corrupt data */ }
            }
            customerService.getWalletBalance()
                .then(res => setBalance(res.balance))
                .catch(() => { });
        }

        // Fetch dynamic navigation data (only runs ONCE on mount)
        const fetchNavData = async () => {
            try {
                const [cats, brs, srs] = await Promise.all([
                    publicService.getCategories(),
                    publicService.getBrands(),
                    publicService.getSeries()
                ]);
                setCategories(cats);
                setBrands(brs);
                setSeries(srs);
            } catch (error) {
                console.error("Failed to load navigation data", error);
            }
        };
        fetchNavData();
        // ✅ FIX: Empty dependency array — nav data fetched once on mount.
        // Removing 'navigate' from deps prevents refetch on every navigation.
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleNav = (path) => {
        navigate(path);
        setIsMenuOpen(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // ✅ FIX: Update React state instead of full page reload
        // window.location.reload() breaks SPA pattern and is unnecessary
        setIsAuthenticated(false);
        setUser(null);
        setBalance(0);
        navigate('/');
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 backdrop-blur-xl h-[58px] flex items-center" style={{ backgroundColor: theme.theme_navbar_bg || 'rgba(3,3,3,0.80)', borderBottom: `1px solid ${theme.theme_navbar_border || 'rgba(255,255,255,0.05)'}` }}>
            <div className="container flex items-center justify-between">

                {/* Left: Logo */}
                <div className="flex-shrink-0 flex items-center justify-start min-w-[150px]">
                    <div className="flex-shrink-0 cursor-pointer group" onClick={() => handleNav('/')}>
                        <img
                            src={theme.theme_logo?.startsWith('http') ? theme.theme_logo : `${UPLOAD_BASE_URL}${theme.theme_logo || '/forza.png'}`}
                            alt="FORZA SHOP"
                            className="h-8 xl:h-9 w-auto object-contain brightness-110 group-hover:brightness-150 transition-all duration-500"
                        />
                    </div>
                </div>

                {/* Center: Main Nav Items */}
                <div className="hidden lg:flex flex-1 items-center justify-center gap-4 xl:gap-8 px-4">
                    <button onClick={() => handleNav('/')} className="nav-item whitespace-nowrap">{t('nav.home')}</button>
                    <button onClick={() => handleNav('/preorder')} className="nav-item whitespace-nowrap">{t('nav.preorder')}</button>
                    <button onClick={() => handleNav('/readystock')} className="nav-item whitespace-nowrap">{t('nav.readystock')}</button>
                    <button onClick={() => handleNav('/blog')} className="nav-item whitespace-nowrap">{t('nav.news')}</button>

                    {/* All Category Dropdown */}
                    <div className="relative group">
                        <button className="nav-item flex items-center gap-1.5 focus:outline-none whitespace-nowrap">
                            {t('nav.categories')} <HiChevronDown className="w-3 h-3 text-neon-red group-hover:rotate-180 transition-transform duration-300" />
                        </button>
                        <div className="absolute top-[calc(100%+16px)] left-1/2 -translate-x-1/2 w-[750px] bg-black/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-2xl p-8 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100]">
                            <div className="grid grid-cols-3 gap-10 text-left">
                                {/* Categories Column */}
                                <div className="space-y-4">
                                    <h4 className="text-white text-[9px] font-black uppercase tracking-[0.2em] opacity-30">{t('nav.shopByCategory')}</h4>
                                    <ul className="space-y-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest max-h-[250px] overflow-y-auto custom-scrollbar pr-4">
                                        {categories.map((cat) => (
                                            <li key={cat.id} onClick={() => handleNav(`/readystock?category=${cat.slug}`)} className="hover:text-neon-red cursor-pointer transition-all duration-300 flex items-center gap-2 group/item">
                                                <span className="w-0 group-hover/item:w-2 h-[1px] bg-neon-red transition-all duration-300"></span>
                                                {cat.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Series Column */}
                                <div className="space-y-4">
                                    <h4 className="text-white text-[9px] font-black uppercase tracking-[0.2em] opacity-30">{t('nav.popularSeries')}</h4>
                                    <ul className="space-y-3 text-[10px] text-gray-500 font-bold uppercase tracking-widest max-h-[250px] overflow-y-auto custom-scrollbar pr-4">
                                        {series.map((s) => (
                                            <li key={s.id} onClick={() => handleNav(`/readystock?series=${s.slug}`)} className="hover:text-neon-red cursor-pointer transition-all duration-300 flex items-center gap-2 group/item">
                                                <span className="w-0 group-hover/item:w-2 h-[1px] bg-neon-red transition-all duration-300"></span>
                                                {s.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {/* Brands Column */}
                                <div className="space-y-4">
                                    <h4 className="text-white text-[9px] font-black uppercase tracking-[0.2em] opacity-30">{t('nav.featuredBrands')}</h4>
                                    <ul className="space-y-2.5">
                                        {brands.slice(0, 7).map((b) => (
                                            <li key={b.id} onClick={() => handleNav(`/readystock?brand=${b.slug}`)} className="text-[10px] text-gray-400 hover:text-white cursor-pointer transition-all duration-300 uppercase tracking-widest font-black flex items-center justify-between group/brand">
                                                {b.name}
                                                <span className="opacity-0 group-hover/brand:opacity-100 transition-opacity text-neon-red">→</span>
                                            </li>
                                        ))}
                                        <li onClick={() => handleNav('/readystock')} className="text-rose-600 hover:text-white cursor-pointer text-[9px] font-black uppercase tracking-widest mt-4 pt-4 border-t border-white/5 transition-colors">{t('nav.viewAllBrands')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button onClick={() => handleNav('/contact')} className="nav-item whitespace-nowrap">{t('nav.contact')}</button>
                </div>

                {/* Right: Utils & User */}
                <div className="flex-shrink-0 flex items-center justify-end gap-1 xl:gap-2 min-w-[150px]">

                    {/* Currency Pill */}
                    <div className="relative lg:mr-1">
                        <button
                            onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                            className="hidden lg:flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 transition-all duration-300"
                        >
                            <span className="text-white text-[9px] font-black uppercase tracking-[0.1em]">{currency}</span>
                            <HiChevronDown className={`w-3 h-3 text-white transition-transform duration-300 ${isCurrencyOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isCurrencyOpen && (
                            <div className="absolute top-[calc(100%+12px)] right-0 w-28 bg-black border border-white/10 shadow-2xl z-[60] py-1.5 rounded-xl backdrop-blur-xl">
                                {currencies.map((curr) => (
                                    <button
                                        key={curr}
                                        onClick={() => {
                                            setCurrency(curr);
                                            setIsCurrencyOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-colors ${currency === curr ? 'text-rose-600' : 'text-gray-400'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Language Switcher Pill */}
                    <div className="hidden lg:flex items-center gap-0.5 bg-white/5 border border-white/10 p-0.5 rounded-full">
                        <button
                            onClick={() => switchLang('id')}
                            title="Bahasa Indonesia"
                            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1 ${lang === 'id'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            🇮🇩 ID
                        </button>
                        <button
                            onClick={() => switchLang('en')}
                            title="English"
                            className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-1 ${lang === 'en'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            🇬🇧 EN
                        </button>
                    </div>

                    {/* Authenticated Actions */}
                    {isAuthenticated ? (
                        <div className="flex items-center gap-0.5 xl:gap-1">
                            {/* Wallet Pill */}
                            <div
                                onClick={() => handleNav('/wallet')}
                                className="hidden lg:flex items-center gap-2 bg-white/5 border border-white/10 pl-3 pr-1 py-1 rounded-full cursor-pointer hover:bg-white/10 transition-all duration-300 mr-1 group"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[7px] text-gray-500 font-black uppercase tracking-tighter leading-none mb-0.5">Wallet</span>
                                    <span className="text-[10px] font-black text-white leading-none tracking-tight group-hover:text-rose-600 transition-colors">{formatPrice(balance)}</span>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300">
                                    <HiCreditCard className="w-3.5 h-3.5" />
                                </div>
                            </div>

                            <div className="h-6 w-[1px] bg-white/10 mx-1 hidden xl:block"></div>

                            {/* Utility Icons */}
                            <div className="flex items-center">
                                <NotificationBell />
                                <button
                                    onClick={() => handleNav('/wishlist')}
                                    className="p-2 text-white hover:text-neon-red transition-all hover:bg-white/5 rounded-full"
                                    title="Wishlist"
                                >
                                    <HiHeart className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => handleNav('/cart')}
                                    className="relative p-2 text-white hover:text-rose-600 transition-all hover:bg-white/5 rounded-full group"
                                >
                                    <HiShoppingBag className="w-5 h-5" />
                                    {cartCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[8px] font-black h-3.5 w-3.5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(225,29,72,0.5)]">
                                            {cartCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="h-6 w-[1px] bg-white/10 mx-1 hidden xl:block"></div>

                            {/* User Profile */}
                            <div className="flex items-center gap-1.5 ml-1">
                                <button
                                    onClick={() => handleNav(user?.role !== 'user' ? '/admin' : '/dashboard')}
                                    className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 pl-3 pr-1 py-1 rounded-full transition-all duration-300 group"
                                >
                                    <span className="text-[9px] font-black uppercase tracking-widest text-white leading-none group-hover:text-rose-600 transition-colors hidden xl:block">
                                        {user?.role !== 'user' ? 'Admin Panel' : (user?.full_name?.split(' ')[0] || user?.username || 'User')}
                                    </span>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-[9px] font-black text-white border border-white/20">
                                        {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
                                    </div>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded-full"
                                    title="Logout"
                                >
                                    <HiLogout className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => handleNav('/login')}
                            className="font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full transition-all duration-300 text-[10px]"
                            style={{ backgroundColor: theme.theme_btn_primary_bg || '#e11d48', color: theme.theme_btn_primary_text || '#fff', borderRadius: theme.theme_btn_radius || '9999px' }}
                        >
                            {t('nav.signIn')}
                        </button>
                    )}

                    {/* Mobile toggle */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="lg:hidden p-2 text-white hover:bg-white/5 rounded-full transition-colors ml-1"
                    >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="lg:hidden absolute top-full left-0 w-full bg-black/98 backdrop-blur-3xl border-b border-white/10 p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
                    <div className="grid grid-cols-1 gap-5">
                        <button onClick={() => handleNav('/')} className="mobile-nav-item">{t('nav.home')}</button>
                        <button onClick={() => handleNav('/preorder')} className="mobile-nav-item">{t('nav.preorder')}</button>
                        <button onClick={() => handleNav('/readystock')} className="mobile-nav-item">{t('nav.readystock')}</button>
                        <button onClick={() => handleNav('/blog')} className="mobile-nav-item">{t('nav.news')}</button>

                        {/* Mobile Language Switcher */}
                        <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-1">{t('nav.language')}</p>
                            <div className="flex gap-2">
                                {[{ code: 'id', label: '🇮🇩 Indonesia' }, { code: 'en', label: '🇬🇧 English' }].map((l) => (
                                    <button
                                        key={l.code}
                                        onClick={() => switchLang(l.code)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${lang === l.code ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                                    >
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Mobile Currency Selector */}
                        <div className="pt-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 ml-1">{t('nav.currency')}</p>
                            <div className="flex gap-2">
                                {currencies.map((curr) => (
                                    <button
                                        key={curr}
                                        onClick={() => setCurrency(curr)}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${currency === curr ? 'bg-rose-600 text-white' : 'bg-white/5 text-gray-400 border border-white/10'}`}
                                    >
                                        {curr}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isAuthenticated && (
                            <div className="space-y-4 pt-2 border-t border-white/5">
                                <button onClick={() => handleNav('/wallet')} className="mobile-nav-item flex items-center justify-between group">
                                    <span className="flex items-center gap-3 italic"><HiCreditCard className="text-rose-600" /> Wallet</span>
                                    <span className="text-rose-600 font-black tracking-tight">{formatPrice(balance)}</span>
                                </button>
                                <button onClick={() => handleNav('/wishlist')} className="mobile-nav-item flex items-center gap-3"><HiHeart /> Wishlist</button>
                                <button onClick={() => handleNav('/cart')} className="mobile-nav-item flex items-center justify-between">
                                    <span className="flex items-center gap-3"><HiShoppingBag /> Cart</span>
                                    {cartCount > 0 && <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full">{cartCount}</span>}
                                </button>
                            </div>
                        )}
                        <button onClick={() => handleNav('/contact')} className="mobile-nav-item">Contact Us</button>
                    </div>

                    <div className="h-px bg-white/5 my-4"></div>

                    {!isAuthenticated ? (
                        <button onClick={() => handleNav('/login')} className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-xl">Sign in</button>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <button
                                onClick={() => handleNav(user?.role !== 'user' ? '/admin' : '/dashboard')}
                                className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase text-xs tracking-widest rounded-xl"
                            >
                                {user?.role !== 'user' ? 'Admin Panel' : 'Account Dashboard'}
                            </button>
                            <button onClick={handleLogout} className="w-full py-4 text-red-500 font-black uppercase text-xs tracking-widest text-center">Logout</button>
                        </div>
                    )}
                </div>
            )}

            {/* Injected Styles for the nice underline effect */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .nav-item {
                    position: relative;
                    padding: 8px 4px;
                    color: ${theme.theme_navbar_text || 'rgba(255,255,255,0.5)'};
                    font-weight: 800;
                    font-size: 11px;
                    letter-spacing: 0.15em;
                    text-transform: uppercase;
                    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                .nav-item::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 1px;
                    background: ${theme.theme_accent_color || '#e11d48'};
                    transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
                }
                .nav-item:hover {
                    color: ${theme.theme_navbar_text_hover || '#fff'};
                    transform: translateY(-1px);
                }
                .nav-item:hover::after {
                    width: 100%;
                }
                .mobile-nav-item {
                    font-size: 14px;
                    font-weight: 900;
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    color: ${theme.theme_navbar_text || 'rgba(255,255,255,0.6)'};
                    text-align: left;
                    transition: all 0.3s ease;
                }
                .mobile-nav-item:hover {
                    color: ${theme.theme_navbar_text_hover || '#fff'};
                    padding-left: 8px;
                }
            `}} />
        </nav>
    );
};

export default Navbar;
