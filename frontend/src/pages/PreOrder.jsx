import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { publicService } from '../services/publicService';
import ProductCard from '../components/ProductCard';
import SEO from '../components/SEO';
import { useLanguage } from '../context/LanguageContext';

const PreOrderPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [totalItems, setTotalItems] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState('latest');
    const { t } = useLanguage();

    // Filters
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedBrand, setSelectedBrand] = useState('');
    const [selectedSeries, setSelectedSeries] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [localSearch, setLocalSearch] = useState('');

    const [currentPage, setCurrentPage] = useState(1);

    // Lists
    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [seriesList, setSeriesList] = useState([]);

    const productsPerPage = 12;

    // Fetch filters dynamically
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const [cats, brs, srs] = await Promise.all([
                    publicService.getCategories(),
                    publicService.getBrands(),
                    publicService.getSeries()
                ]);
                setCategories(cats || []);
                setBrands(brs || []);
                setSeriesList(srs || []);
            } catch (error) {
                console.error("Failed to load filters", error);
            }
        };
        fetchFilters();
    }, []);

    // Sync state with URL params on initial load or URL change
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setSelectedCategory(params.get('category') || '');
        setSelectedBrand(params.get('brand') || '');
        setSelectedSeries(params.get('series') || '');
        const search = params.get('search') || '';
        setSearchTerm(search);
        setLocalSearch(search);
    }, [location.search]);

    // Handle Debounced Search
    useEffect(() => {
        const handler = setTimeout(() => {
            if (localSearch !== searchTerm) {
                const params = new URLSearchParams(location.search);
                if (localSearch) params.set('search', localSearch);
                else params.delete('search');
                navigate(`${location.pathname}?${params.toString()}`);
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [localSearch, navigate, location.pathname, location.search, searchTerm]);

    const updateFilter = (key, value) => {
        const params = new URLSearchParams(location.search);
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        navigate(`${location.pathname}?${params.toString()}`);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const data = await publicService.getProducts({
                    product_type: 'po',
                    status: 'active',
                    sort: sortBy,
                    category: selectedCategory,
                    brand: selectedBrand,
                    series: selectedSeries,
                    search: searchTerm,
                    limit: 200
                });
                setProducts(data.data || []);
                setTotalItems(data.total || (data.data ? data.data.length : 0));
                setCurrentPage(1);
            } catch (error) {
                console.error("Failed to load products", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [sortBy, selectedCategory, selectedBrand, selectedSeries]);

    const indexOfLastProduct = currentPage * productsPerPage;
    const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
    const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
    const totalPages = Math.ceil(products.length / productsPerPage);


    return (
        <div className="bg-[#030303] pt-16 pb-20 min-h-screen">
            <SEO
                title="Pre-Order | Warung Forza Shop"
                description="Secure the latest premium collections with a pre-order system. Pay a deposit first, pay off when the item arrives."
            />
            {/* Header */}
            <div className="relative h-48 flex items-center justify-center overflow-hidden mb-8 border-b border-white/5">
                <div className="absolute inset-0 bg-[url('/images/horror-hero.jpg')] bg-cover bg-center opacity-10 grayscale brightness-30"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#030303]"></div>
                <div className="container relative z-10 text-center">
                    <h1 className="text-white mb-2 uppercase italic">
                        {t('preorder.title').split(' ')[0]} <span className="text-rose-600">{t('preorder.title').split(' ')[1] || 'ORDER'}</span>
                    </h1>
                    <div className="flex items-center justify-center gap-3 mt-4">
                        <span className="w-12 h-[1px] bg-white/10"></span>
                        <p className="text-gray-500 font-black uppercase tracking-[0.4em] text-[10px]">{t('preorder.subtitle')}</p>
                        <span className="w-12 h-[1px] bg-white/10"></span>
                    </div>
                </div>
            </div>

            <div className="container">

                {/* PO Info Banner */}
                <div className="mb-8 p-6 bg-blue-600/5 border border-blue-500/15 rounded-xl">
                    <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-3">📋 {t('preorder.howTo')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { step: '1', title: t('preorder.step1Title'), desc: t('preorder.step1Desc') },
                            { step: '2', title: t('preorder.step2Title'), desc: t('preorder.step2Desc') },
                            { step: '3', title: t('preorder.step3Title'), desc: t('preorder.step3Desc') },
                            { step: '4', title: t('preorder.step4Title'), desc: t('preorder.step4Desc') },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{item.step}</span>
                                <div>
                                    <p className="text-white font-bold text-sm">{item.title}</p>
                                    <p className="text-gray-500 text-xs">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* MODERN FILTER BAR */}
                <div className="mb-8 flex flex-col items-center gap-4 z-20 relative">

                    {/* Left: Count & Search */}
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full">
                        <div className="relative group w-full">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <svg className="w-4 h-4 text-white/30 group-focus-within:text-rose-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                placeholder={t('preorder.searchPlaceholder')}
                                className="input-standard pl-12"
                                onChange={(e) => setLocalSearch(e.target.value)}
                                value={localSearch}
                            />
                        </div>
                        <p className="hidden md:block text-white/30 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                            <span className="text-white">{totalItems}</span> {t('preorder.productsCount')}
                        </p>
                    </div>

                    {/* Right: Filters */}
                    <div className="grid grid-cols-2 md:flex flex-wrap items-center gap-3 w-full">

                        {/* Filter Item Component */}
                        {[
                            { value: selectedCategory, onChange: (v) => updateFilter('category', v), options: categories, label: 'Category', defaultLabel: t('preorder.allCategories') },
                            { value: selectedBrand, onChange: (v) => updateFilter('brand', v), options: brands, label: 'Brand', defaultLabel: t('preorder.allBrands') },
                            { value: selectedSeries, onChange: (v) => updateFilter('series', v), options: seriesList, label: 'Series', defaultLabel: t('preorder.allSeries') },
                        ].map((filter, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                    <svg className="w-3 h-3 text-white/40 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                                <select
                                    value={filter.value}
                                    onChange={(e) => filter.onChange(e.target.value)}
                                    className={`appearance-none bg-white/5 border border-white/10 text-white pl-4 pr-10 h-[48px] rounded-[8px] text-[11px] font-bold uppercase tracking-wider outline-none focus:border-rose-600 transition-all cursor-pointer hover:bg-white/10 min-w-[150px] ${filter.value ? 'border-rose-600/50 text-rose-600' : ''}`}
                                >
                                    <option value="">{filter.defaultLabel}</option>
                                    {filter.options.map((opt) => (
                                        <option key={opt.slug} value={opt.slug}>{opt.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}

                        <div className="w-px h-8 bg-white/10 mx-2 hidden md:block"></div>

                        {/* Sort Select */}
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                <svg className="w-3 h-3 text-rose-600/60 group-hover:text-rose-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                                </svg>
                            </div>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 text-white pl-4 pr-10 h-[48px] rounded-[8px] text-[11px] font-bold uppercase tracking-wider outline-none focus:border-rose-600 transition-all cursor-pointer hover:bg-white/10 min-w-[150px]"
                            >
                                <option value="latest">{t('preorder.sortLatest')}</option>
                                <option value="price_asc">{t('preorder.sortPriceAsc')}</option>
                                <option value="price_desc">{t('preorder.sortPriceDesc')}</option>
                                <option value="oldest">{t('preorder.sortOldest')}</option>
                            </select>
                        </div>

                    </div>
                </div>

                {/* PRODUCT GRID */}
                <main>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-40 gap-4">
                            <div className="w-12 h-12 border-2 border-rose-600/20 border-t-rose-600 rounded-full animate-spin"></div>
                            <p className="text-rose-600 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{t('common.loading')}</p>
                        </div>
                    ) : (
                        <>
                            {currentProducts.length === 0 ? (
                                <div className="py-20 text-center border border-white/5 bg-[#050505] rounded-lg">
                                    <p className="text-white/40 text-xs font-black uppercase tracking-widest">{t('preorder.noProducts')}</p>
                                    <button
                                        onClick={() => navigate(location.pathname)}
                                        className="mt-6 text-rose-600 text-[10px] font-black uppercase tracking-widest border border-rose-600/20 px-6 py-2 hover:bg-rose-600 hover:text-white transition-all"
                                    >
                                        {t('preorder.resetFilters')}
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                                    {currentProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="mt-20 flex justify-center items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="px-6 py-3 bg-[#111] text-white/50 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-white hover:text-black disabled:opacity-20 transition-all shadow-xl"
                                    >
                                        {t('common.previous')}
                                    </button>

                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            className={`w-12 h-12 rounded-sm text-[10px] font-bold transition-all ${currentPage === i + 1
                                                ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/20'
                                                : 'bg-[#111] text-white/40 hover:bg-white/10 text-white'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="px-6 py-3 bg-[#111] text-white/50 text-[10px] font-black uppercase tracking-widest rounded-sm hover:bg-white hover:text-black disabled:opacity-20 transition-all shadow-xl"
                                    >
                                        {t('common.next')}
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

export default PreOrderPage;
