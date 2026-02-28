import React, { useState, useEffect, useMemo } from 'react';
import { showToast } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
import { UPLOAD_BASE_URL } from '../../config/api';
import { adminService } from '../../services/adminService';
import {
    HiOutlineShoppingBag,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlinePhotograph,
    HiOutlineCube,
    HiOutlineCheckCircle,
    HiOutlineTag,
    HiOutlineXCircle,
    HiOutlineFilter,
    HiOutlineRefresh,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineX
} from 'react-icons/hi';
import { QRCodeSVG } from 'qrcode.react';
import { usePermission } from '../../hooks/usePermission';

const ProductList = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [localSearch, setLocalSearch] = useState('');
    const [filters, setFilters] = useState({
        category: '',
        product_type: '',
        status: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [qrModal, setQrModal] = useState({ isOpen: false, qrCode: '', productName: '', sku: '' });
    const [statsData, setStatsData] = useState({ total: 0, active: 0, preorder: 0, ready_stock: 0, out_of_stock: 0 });
    const [advancedFilters, setAdvancedFilters] = useState(false);
    const [taxonomy, setTaxonomy] = useState({
        categories: [],
        brands: [],
        series: [],
        scales: []
    });

    useEffect(() => {
        loadProducts();
    }, [filters]);

    useEffect(() => {
        const loadTaxonomy = async () => {
            try {
                const [catRes, brandRes, seriesRes, scaleRes] = await Promise.all([
                    adminService.getCategories(),
                    adminService.getBrands(),
                    adminService.getSeries(),
                    adminService.getScales()
                ]);
                setTaxonomy({
                    categories: catRes.data || [],
                    brands: brandRes.data || [],
                    series: seriesRes.data || [],
                    scales: scaleRes.data || []
                });
            } catch (error) {
                console.error('Failed to load taxonomy', error);
            }
        };
        loadTaxonomy();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const [productsRes, statsRes] = await Promise.all([
                adminService.getProducts(filters),
                adminService.getProductStats()
            ]);

            setProducts(productsRes.data || []);
            setPagination({
                total: productsRes.total || 0,
                pages: Math.ceil((productsRes.total || 0) / filters.limit)
            });
            setStatsData(statsRes);
        } catch (error) {
            console.error('Failed to load products', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (product) => {
        const newStatus = product.status === 'active' ? 'draft' : 'active';
        try {
            // Prepare payload to match backend UpdateProduct input struct
            const payload = {
                ...product,
                category: product.category?.name || '',
                brand: product.brand?.name || '',
                series_ids: product.series?.map(s => s.id) || [],
                character_ids: product.characters?.map(c => c.id) || [],
                genre_ids: product.genres?.map(g => g.id) || [],
                status: newStatus
            };

            await adminService.updateProduct(product.id, payload);

            setProducts(prev => prev.map(p =>
                p.id === product.id ? { ...p, status: newStatus } : p
            ));
        } catch (error) {
            showToast.error('Gagal update status: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Yakin hapus produk ini?')) return;
        try {
            await adminService.deleteProduct(id);
            loadProducts();
        } catch (error) {
            showToast.error('Gagal menghapus: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleMarkArrived = async (id) => {
        if (!confirm('Tandai PO sebagai Tiba? Ini akan menghasilkan faktur sisa pembayaran dan mengirim email ke semua pelanggan.')) return;

        const costInput = window.prompt("Berapa Harga Modal Aktual / Ongkir Cargo Terbaru untuk item ini? (Kosongkan atau ketik 0 jika tidak ada / tetap seperti budget awal):", "0");
        if (costInput === null) return; // User pressed Cancel

        const actualSupplierCost = parseFloat(costInput) || 0;

        try {
            const res = await adminService.markProductArrived(id, { actual_supplier_cost: actualSupplierCost });
            showToast.success(res.message);
            loadProducts();
        } catch (error) {
            showToast.error('Gagal memicu kedatangan: ' + (error.response?.data?.error || error.message));
        }
    };

    // Use backend filtering directly
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: searchQuery }));
    }, [searchQuery]);

    // Data is already filtered by backend
    const filteredProducts = products;

    const stats = useMemo(() => ({
        total: statsData.total || 0,
        active: statsData.active || 0,
        preorder: statsData.preorder || 0,
        readyStock: statsData.ready_stock || 0,
        outOfStock: statsData.out_of_stock || 0
    }), [statsData]);

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
    };

    const handleSearchBlur = () => {
        setSearchQuery(localSearch);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setSearchQuery(localSearch);
        }
    };

    return (
        <>
            <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                            Katalog Produk
                            <span className="text-xs bg-white/10 text-gray-400 px-2 py-1 rounded-md font-mono font-normal">
                                {pagination.total} TOTAL
                            </span>
                        </h2>
                        <p className="admin-label mt-1 normal-case opacity-60">Kelola inventaris toko dan ketersediaan barang secara real-time</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={loadProducts}
                            className="p-3 glass-card rounded-lg text-gray-400 hover:text-white transition-all shadow-sm"
                        >
                            <HiOutlineRefresh className="w-5 h-5" />
                        </button>
                        {hasPermission('product.create') && (
                            <button
                                onClick={() => navigate('/admin/products/new')}
                                className="btn-primary"
                            >
                                <HiOutlinePlus className="w-5 h-5" />
                                Tambah Item Baru
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    {[
                        { id: 'all', label: 'Total Barang', value: stats.total, icon: HiOutlineCube, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { id: 'active', label: 'Aktif Sekarang', value: stats.active, icon: HiOutlineCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { id: 'ready', label: 'Ready Stock', value: stats.readyStock, icon: HiOutlineShoppingBag, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                        { id: 'po', label: 'Pre-Order', value: stats.preorder, icon: HiOutlineTag, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                        { id: 'outofstock', label: 'Stok Habis', value: stats.outOfStock, icon: HiOutlineXCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    ].map((stat, i) => (
                        <button
                            key={i}
                            onClick={() => {
                                if (stat.id === 'all') {
                                    setFilters(prev => ({ ...prev, product_type: '', status: '', min_stock: '', stock_status: '', page: 1 }));
                                } else if (stat.id === 'active') {
                                    setFilters(prev => ({ ...prev, status: 'active', product_type: '', min_stock: '', stock_status: '', page: 1 }));
                                } else if (stat.id === 'ready') {
                                    setFilters(prev => ({ ...prev, product_type: 'ready', min_stock: '', stock_status: '', page: 1 }));
                                } else if (stat.id === 'po') {
                                    setFilters(prev => ({ ...prev, product_type: 'po', min_stock: '', stock_status: '', page: 1 }));
                                } else if (stat.id === 'outofstock') {
                                    setFilters(prev => ({ ...prev, min_stock: '', product_type: '', status: '', stock_status: 'outofstock', page: 1 }));
                                }
                            }}
                            className="glass-card p-5 rounded-xl flex items-center gap-4 group hover:border-white/20 transition-all text-left w-full hover:-translate-y-1 hover:shadow-xl cursor-pointer"
                        >
                            <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="admin-label !mb-0">{stat.label}</p>
                                <p className="text-xl font-bold text-white tabular-nums mt-0.5 group-hover:text-blue-400 transition-colors">{stat.value}</p>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Filter Bar */}
                <div className="glass-card p-4 rounded-xl space-y-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-grow w-full">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Cari produk (Nama, SKU, Identitas)..."
                                value={localSearch}
                                onChange={handleSearchChange}
                                onBlur={handleSearchBlur}
                                onKeyDown={handleSearchKeyDown}
                                className="admin-input pl-12 italic"
                            />
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button
                                onClick={() => setAdvancedFilters(!advancedFilters)}
                                className={`btn-secondary h-[48px] px-4 ${advancedFilters ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : ''}`}
                            >
                                <HiOutlineFilter className="w-5 h-5" />
                                <span className="hidden md:block">Filter</span>
                            </button>
                            <div className="flex items-center gap-3 admin-input md:w-32 bg-white/5 border-white/5">
                                <span className="admin-table-head opacity-60">Tampilkan</span>
                                <select
                                    value={filters.limit}
                                    onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                                    className="bg-transparent text-sm text-white focus:outline-none font-bold tabular-nums ml-auto"
                                >
                                    {[20, 50, 100, 500].map(val => (
                                        <option key={val} value={val} className="bg-slate-900">{val}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {advancedFilters && (
                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                            <select
                                value={filters.product_type}
                                onChange={(e) => setFilters({ ...filters, product_type: e.target.value, page: 1 })}
                                className="admin-input text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">SEMUA TIPE</option>
                                <option value="ready" className="bg-slate-900">READY STOCK</option>
                                <option value="po" className="bg-slate-900">PRE-ORDER</option>
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                                className="admin-input text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">SEMUA STATUS</option>
                                <option value="active" className="bg-slate-900">AKTIF</option>
                                <option value="draft" className="bg-slate-900">DRAF</option>
                            </select>

                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
                                className="admin-input text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">SEMUA KATEGORI</option>
                                {taxonomy.categories.map(cat => (
                                    <option key={cat.id} value={cat.name} className="bg-slate-900">{cat.name.toUpperCase()}</option>
                                ))}
                            </select>

                            <select
                                value={filters.brand}
                                onChange={(e) => setFilters({ ...filters, brand: e.target.value, page: 1 })}
                                className="admin-input text-xs font-bold uppercase tracking-widest cursor-pointer"
                            >
                                <option value="" className="bg-slate-900">SEMUA MEREK</option>
                                {taxonomy.brands.map(brand => (
                                    <option key={brand.id} value={brand.name} className="bg-slate-900">{brand.name.toUpperCase()}</option>
                                ))}
                            </select>

                            <div className="col-span-2 lg:col-span-1">
                                <button
                                    onClick={() => {
                                        setFilters({
                                            category: '',
                                            product_type: '',
                                            status: '',
                                            brand: '',
                                            series: '',
                                            scale: '',
                                            page: 1,
                                            limit: 20
                                        });
                                        setLocalSearch('');
                                        setSearchQuery('');
                                    }}
                                    className="btn-secondary w-full border-rose-500/20 text-rose-500 hover:bg-rose-500/10"
                                >
                                    <HiOutlineTrash /> Reset
                                </button>
                            </div>

                        </div>
                    )}
                </div>

                {/* Inventory Table */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-96 gap-4">
                        <div className="w-12 h-12 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest animate-pulse">Menyinkronkan Katalog...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/5 bg-white/5">
                                        <th className="p-4 admin-table-head w-20">Gambar</th>
                                        <th className="p-4 admin-table-head">Info Produk</th>
                                        <th className="p-4 admin-table-head">Kategori & Tipe</th>
                                        <th className="p-4 admin-table-head text-right">Harga Satuan</th>
                                        <th className="p-4 admin-table-head text-center">Stok</th>
                                        <th className="p-4 admin-table-head text-center">Status</th>
                                        <th className="p-4 admin-table-head text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredProducts.map((product) => (
                                        <tr key={product.id} className="group hover:bg-white/5 transition-colors">
                                            <td className="p-4">
                                                <div className="w-16 h-16 rounded-xl bg-white/5 overflow-hidden border border-white/10 relative">
                                                    {product.images?.[0] ? (
                                                        <img
                                                            src={product.images[0].startsWith('http') ? product.images[0] : `${UPLOAD_BASE_URL}${product.images[0]}`}
                                                            alt={product.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <HiOutlinePhotograph className="w-6 h-6 text-gray-700" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-start gap-3">
                                                    {/* QR Code Image */}
                                                    {product.qr_code ? (
                                                        <div
                                                            onClick={(e) => { e.stopPropagation(); setQrModal({ isOpen: true, qrCode: product.qr_code, productName: product.name, sku: product.sku }); }}
                                                            className="flex-shrink-0 bg-white p-1 rounded-lg cursor-pointer hover:scale-110 transition-transform hover:shadow-lg hover:shadow-violet-500/20 group/qr relative"
                                                            title="Klik untuk perbesar QR Code"
                                                        >
                                                            <QRCodeSVG value={product.qr_code} size={36} level="M" />
                                                            <div className="absolute inset-0 bg-violet-500/0 group-hover/qr:bg-violet-500/10 rounded-lg transition-colors flex items-center justify-center">
                                                                <HiOutlineSearch className="w-3 h-3 text-violet-600 opacity-0 group-hover/qr:opacity-100 transition-opacity" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-shrink-0 w-[44px] h-[44px] bg-white/5 border border-dashed border-white/10 rounded-lg flex items-center justify-center">
                                                            <span className="text-gray-600 text-[7px] font-bold">NO QR</span>
                                                        </div>
                                                    )}
                                                    <div className="max-w-xs min-w-0">
                                                        <p className="text-blue-400 text-[10px] font-black tracking-widest uppercase mb-1">{product.sku || 'N/A'}</p>
                                                        <h3 className="text-white font-bold text-sm line-clamp-2 leading-tight">{product.name}</h3>
                                                        {product.qr_code && (
                                                            <p className="text-violet-400/60 text-[8px] font-mono mt-1 truncate">{product.qr_code}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    {/* Category Path */}
                                                    <div className="flex items-center gap-1.5 bg-white/5 py-1 px-2 rounded-lg border border-white/5">
                                                        <HiOutlineTag className="w-3 h-3 text-gray-500" />
                                                        <span className="text-gray-300 text-[11px] font-bold">
                                                            {product.category?.parent?.name && (
                                                                <span className="text-gray-500 font-normal">{product.category.parent.name} &rsaquo; </span>
                                                            )}
                                                            {product.category?.name || 'Tanpa Kategori'}
                                                        </span>
                                                    </div>

                                                    {/* Brand */}
                                                    <div className="flex items-center gap-1.5 bg-blue-500/5 py-1 px-2 rounded-lg border border-blue-500/10">
                                                        <HiOutlineCube className="w-3 h-3 text-blue-400/70" />
                                                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-wider">
                                                            {product.brand?.name || 'Tanpa Merek'}
                                                        </span>
                                                    </div>

                                                    {/* Type Badge */}
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest uppercase border ${product.product_type === 'po'
                                                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                        }`}>
                                                        {product.product_type === 'po' ? 'Pre-Order' : 'Ready Stock'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-white font-bold text-sm tracking-tight">
                                                    Rp {product.price?.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col gap-1 items-center font-mono">
                                                    <span className={`text-xs font-black px-2 py-0.5 rounded ${product.available_stock <= 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                        Sisa: {Math.max(0, product.available_stock || 0)}
                                                    </span>
                                                    <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Fisik: {product.stock || 0}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                {hasPermission('product.edit') ? (
                                                    <button
                                                        onClick={() => handleToggleStatus(product)}
                                                        className={`w-3 h-3 rounded-full mx-auto transition-all duration-300 hover:scale-150 ${product.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-600'}`}
                                                        title={product.status === 'active' ? 'Klik untuk Nonaktifkan' : 'Klik untuk Aktifkan'}
                                                    ></button>
                                                ) : (
                                                    <div className={`w-3 h-3 rounded-full mx-auto ${product.status === 'active' ? 'bg-emerald-500/50' : 'bg-rose-600/50'}`}></div>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {product.product_type === 'po' && hasPermission('product.edit') && (
                                                        <button
                                                            onClick={() => handleMarkArrived(product.id)}
                                                            className="p-2 bg-purple-500/10 text-purple-400 rounded-lg hover:bg-purple-600 hover:text-white transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] group/btn relative"
                                                            title="Tandai Barang Tiba & Tagih Pelunasan"
                                                        >
                                                            <HiOutlineCheckCircle className="w-4 h-4" />
                                                            <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-all pointer-events-none whitespace-nowrap hidden md:block">
                                                                Tiba & Tagih Pelunasan
                                                            </span>
                                                        </button>
                                                    )}
                                                    {hasPermission('product.edit') && (
                                                        <button
                                                            onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                                                            className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                                            title="Ubah"
                                                        >
                                                            <HiOutlinePencil className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {hasPermission('product.delete') && (
                                                        <button
                                                            onClick={() => handleDelete(product.id)}
                                                            className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-600 hover:text-white transition-all"
                                                            title="Hapus"
                                                        >
                                                            <HiOutlineTrash className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!hasPermission('product.edit') && !hasPermission('product.delete') && (
                                                        <span className="text-[10px] text-gray-600 font-bold uppercase">Hanya Lihat</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Registry */}
                        {pagination.total > 0 && (
                            <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="admin-label !mb-0 opacity-60">Halaman</span>
                                    <span className="px-3 py-1 bg-white/5 rounded-lg text-white font-bold text-sm tracking-tight">{filters.page} / {pagination.pages}</span>
                                    <span className="admin-label !mb-0 opacity-60 ml-4">Total Data</span>
                                    <span className="px-3 py-1 bg-white/5 rounded-lg text-white font-bold text-sm tracking-tight">{pagination.total}</span>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        disabled={filters.page <= 1 || loading}
                                        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                        className="btn-secondary h-[40px] text-xs"
                                    >
                                        <HiOutlineChevronLeft className="w-4 h-4" />
                                        SEBELUMNYA
                                    </button>
                                    <button
                                        disabled={filters.page >= pagination.pages || loading}
                                        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                        className="btn-primary h-[40px] text-xs"
                                    >
                                        BERIKUTNYA
                                        <HiOutlineChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="glass-card rounded-3xl p-20 text-center flex flex-col items-center border border-white/5">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <HiOutlineShoppingBag className="w-10 h-10 text-gray-500" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Tidak ada produk ditemukan</h3>
                        <p className="text-gray-500 italic text-sm max-w-md mb-8">Coba sesuaikan filter pencarian atau tambahkan produk baru ke dalam katalog Anda.</p>
                        <button
                            onClick={() => navigate('/admin/products/new')}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                        >
                            <HiOutlinePlus className="w-4 h-4" />
                            Tambah Item Baru
                        </button>
                    </div>
                )
                }
            </div >

            {/* QR Code Modal */}
            {
                qrModal.isOpen && (
                    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setQrModal({ ...qrModal, isOpen: false })}>
                        <div className="bg-[#0B0F1A] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
                            {/* Header */}
                            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-blue-600/10">
                                <div>
                                    <h3 className="text-white font-bold text-base">QR Code Produk</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{qrModal.sku}</p>
                                </div>
                                <button
                                    onClick={() => setQrModal({ ...qrModal, isOpen: false })}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                                >
                                    <HiOutlineX className="w-5 h-5" />
                                </button>
                            </div>

                            {/* QR Code */}
                            <div className="p-8 flex flex-col items-center">
                                <div className="bg-white p-5 rounded-2xl shadow-xl shadow-violet-500/10 mb-5">
                                    <QRCodeSVG
                                        value={qrModal.qrCode}
                                        size={200}
                                        level="H"
                                        includeMargin={false}
                                        bgColor="#ffffff"
                                        fgColor="#1a1a2e"
                                    />
                                </div>
                                <h4 className="text-white font-bold text-center text-sm leading-tight mb-2 px-4">{qrModal.productName}</h4>
                                <div className="bg-violet-500/10 border border-violet-500/20 px-4 py-2 rounded-xl">
                                    <p className="text-violet-300 text-[11px] font-mono font-bold text-center">{qrModal.qrCode}</p>
                                </div>
                                <p className="text-gray-600 text-[9px] uppercase tracking-widest font-bold mt-4 text-center">
                                    Scan QR ini di POS untuk menambahkan produk ke keranjang
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
};

export default ProductList;
