import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { adminService } from '../../services/adminService';
import { UPLOAD_BASE_URL } from '../../config/api';
import { showToast } from '../../utils/toast';
import {
    HiOutlineCube,
    HiOutlineCurrencyDollar,
    HiOutlineTruck,
    HiOutlinePhotograph,
    HiOutlineInformationCircle,
    HiOutlineSave,
    HiOutlineX,
    HiOutlineCheck,
    HiOutlineArrowRight,
    HiOutlineTrash,
    HiOutlineUpload,
    HiChevronDown,
    HiOutlineStar,
    HiOutlineSparkles,
    HiOutlinePlus,
    HiOutlineTag,
    HiOutlineRefresh,
} from 'react-icons/hi';

import { useNavigate, useParams } from 'react-router-dom';

// Creatable Select Component (Autocomplete)
const CreatableSelect = React.memo(({ label, name, value, onChange, options = [], placeholder, required = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || '');
    const wrapperRef = useRef(null);

    // Sync input with prop value changes
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        // Propagate change immediately so parent state reflects typing (allowing creation of new items)
        onChange({ target: { name, value: val } });
        setIsOpen(true);
    };

    const handleSelectOption = (optName) => {
        setInputValue(optName);
        onChange({ target: { name, value: optName } });
        setIsOpen(false);
    };

    // Filter options based on input
    const validInputValue = typeof inputValue === 'string' ? inputValue : '';
    const filteredOptions = options.filter(opt =>
        (opt.name || '').toLowerCase().includes(validInputValue.toLowerCase())
    );

    return (
        <div className="space-y-2 relative" ref={wrapperRef}>
            <label className="admin-label">{label}</label>
            <div className="relative">
                <input
                    type="text"
                    name={name}
                    value={validInputValue}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    required={required}
                    placeholder={placeholder}
                    className="admin-input italic pr-10"
                    autoComplete="off"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                    <HiChevronDown />
                </div>
            </div>

            {/* Dropdown Menu */}
            {isOpen && filteredOptions.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200">
                    {filteredOptions.map((opt, idx) => (
                        <button
                            key={opt.id || idx}
                            type="button"
                            onClick={() => handleSelectOption(opt.name)}
                            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group"
                        >
                            <span>{opt.name}</span>
                            {validInputValue.toLowerCase() === (opt.name || '').toLowerCase() && <HiOutlineCheck className="text-blue-500 w-4 h-4" />}
                        </button>
                    ))}
                    {validInputValue && !filteredOptions.some(o => (o.name || '').toLowerCase() === validInputValue.toLowerCase()) && (
                        <div className="px-4 py-3 text-xs text-gray-500 italic border-t border-white/10">
                            Buat baru "{validInputValue}"...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// Memoized Input Component to prevent parent re-renders from affecting the focused input
const FastInput = React.memo(({ label, name, type = 'text', value, onChange, placeholder, required = false, isMono = false, isDate = false, textarea = false }) => {
    // Local state for immediate feedback
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const handleLocalChange = (e) => {
        setLocalValue(e.target.value);
    };

    const handleBlur = (e) => {
        onChange(e);
    };

    const inputClasses = `w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all ${isMono ? 'font-mono' : 'italic normal-case'}`;

    return (
        <div className="space-y-2">
            <label className="admin-label">{label}</label>
            {textarea ? (
                <textarea
                    name={name}
                    value={localValue}
                    onChange={handleLocalChange}
                    onBlur={handleBlur}
                    required={required}
                    placeholder={placeholder}
                    rows="5"
                    className="admin-input h-auto min-h-[120px] py-4 italic resize-none"
                />
            ) : (
                <input
                    type={type}
                    name={name}
                    value={localValue}
                    onChange={handleLocalChange}
                    onBlur={handleBlur}
                    required={required}
                    placeholder={placeholder}
                    className="admin-input italic"
                />
            )}
        </div>
    );
});

// Select with Quick Add Component
const SelectWithAdd = ({ label, name, value, onChange, options = [], placeholder, onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuickAdd = async () => {
        if (!newItemName.trim() || !onAdd) return;
        setIsSubmitting(true);
        try {
            const newItem = await onAdd(newItemName.trim());
            if (newItem && newItem.id) {
                onChange({ target: { name, value: newItem.id.toString() } });
                setNewItemName('');
                setIsAdding(false);
            }
        } catch (error) {
            console.error("Quick add failed", error);
            showToast.error('Gagal menambahkan: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="admin-label">{label}</label>
                {!isAdding && onAdd && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="text-blue-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                        <HiOutlinePlus className="w-3 h-3" />
                        Tambah
                    </button>
                )}
            </div>

            {isAdding ? (
                <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                    <input
                        autoFocus
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
                            if (e.key === 'Escape') setIsAdding(false);
                        }}
                        placeholder={`Nama ${label} baru...`}
                        className="admin-input border-blue-500/30 italic"
                    />
                    <button
                        type="button"
                        disabled={isSubmitting || !newItemName.trim()}
                        onClick={handleQuickAdd}
                        className="h-[48px] w-[48px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center flex-shrink-0"
                    >
                        {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <HiOutlineCheck className="w-4 h-4" />}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="h-[48px] w-[48px] bg-white/5 text-gray-500 rounded-lg hover:bg-white/10 hover:text-white transition-colors flex items-center justify-center flex-shrink-0"
                    >
                        <HiOutlineX className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <select
                        name={name}
                        value={value}
                        onChange={onChange}
                        className="admin-input italic font-bold appearance-none cursor-pointer"
                    >
                        <option value="" className="bg-slate-900">{placeholder}</option>
                        {options.map(opt => (
                            <option key={opt.id} value={opt.id} className="bg-slate-900">{opt.name}</option>
                        ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <HiChevronDown />
                    </div>
                </div>
            )}
        </div>
    );
};

// MultiSelect Pill Component with Quick Add
const MultiSelectPills = ({ label, options, selectedIds = [], onChange, onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuickAdd = async () => {
        if (!newItemName.trim() || !onAdd) return;
        setIsSubmitting(true);
        try {
            const newItem = await onAdd(newItemName.trim());
            if (newItem && newItem.id) {
                onChange([...selectedIds, newItem.id]);
                setNewItemName('');
                setIsAdding(false);
            }
        } catch (error) {
            console.error("Quick add failed", error);
            showToast.error('Gagal menambahkan: ' + (error.response?.data?.error || error.message));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="admin-label block">{label}</label>
                {!isAdding && onAdd && (
                    <button
                        type="button"
                        onClick={() => setIsAdding(true)}
                        className="text-blue-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                        <HiOutlinePlus className="w-3 h-3" />
                        Tambah Cepat
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {options.map(opt => {
                    const isSelected = selectedIds.includes(opt.id);
                    return (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                                const newIds = isSelected
                                    ? selectedIds.filter(id => id !== opt.id)
                                    : [...selectedIds, opt.id];
                                onChange(newIds);
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${isSelected
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-white/5 border-white/5 text-gray-500 hover:text-white hover:border-white/20'
                                }`}
                        >
                            {opt.name}
                        </button>
                    );
                })}

                {/* Inline Add Input */}
                {isAdding && (
                    <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                        <input
                            autoFocus
                            type="text"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleQuickAdd(); }
                                if (e.key === 'Escape') setIsAdding(false);
                            }}
                            placeholder="Nama baru..."
                            className="bg-white/5 border border-blue-500/30 rounded-xl px-3 py-1.5 text-[10px] text-white focus:outline-none focus:border-blue-500 italic normal-case w-32"
                        />
                        <button
                            type="button"
                            disabled={isSubmitting || !newItemName.trim()}
                            onClick={handleQuickAdd}
                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isSubmitting ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <HiOutlineCheck className="w-3 h-3" />}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="p-1.5 bg-white/5 text-gray-500 rounded-lg hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <HiOutlineX className="w-3 h-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const TABS = [
    { id: 'basic', label: 'Identitas', icon: HiOutlineCube },
    { id: 'premium', label: 'Premium & Spek', icon: HiOutlineSparkles },
    { id: 'pricing', label: 'Komersial', icon: HiOutlineCurrencyDollar },
    { id: 'shipping', label: 'Logistik', icon: HiOutlineTruck },
    { id: 'upsell', label: 'Upsell / Cross-sell', icon: HiOutlineStar },
];

const ProductForm = ({ onCancel, onSuccess, productToEdit = null }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Upsell state
    const [upsellProducts, setUpsellProducts] = useState([]); // currently selected
    const [allProducts, setAllProducts] = useState([]);
    const [upsellSearch, setUpsellSearch] = useState('');
    const [upsellSaving, setUpsellSaving] = useState(false);

    const [taxonomyOptions, setTaxonomyOptions] = useState({
        categories: [],
        brands: [],
        series: [],
        characters: [],
        genres: [],
        scales: [],
        materials: [],
        editionTypes: []
    });

    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        brand: '',
        category: '',
        series_ids: [],
        character_ids: [],
        genre_ids: [],
        price: '',
        stock: '',
        description: '',
        weight: '',
        supplier_cost: '',
        allow_air: true,
        allow_sea: false,
        dimension_l: '',
        dimension_w: '',
        dimension_h: '',
        images: '',
        product_type: 'ready',
        po_config: {
            deposit_type: 'percent',
            deposit_value: '',
            eta: '',
            deposit_deadline_days: '3',
            balance_deadline_days: '7'
        },
        // Premium Fields
        scale_id: '',
        material_id: '',
        edition_type_id: '',
        edition_size: '',
        edition_number: '',
        license_info: '',
        artist: '',
        video_url: '',
        is_exclusive: false,
        is_limited: false,
        is_featured: false
    });

    // Handle initial data or fetch from API if ID in URL
    useEffect(() => {
        const prepareData = (data) => {
            const initialDimensions = data.dimensions ?
                (typeof data.dimensions === 'string' ? JSON.parse(data.dimensions) : data.dimensions)
                : { l: '', w: '', h: '' };

            setFormData({
                ...data,
                category: data.category?.name || data.category || '',
                brand: data.brand?.name || data.brand || '',
                series_ids: data.series ? data.series.map(s => s.id) : [],
                character_ids: data.characters ? data.characters.map(c => c.id) : [],
                genre_ids: data.genres ? data.genres.map(g => g.id) : [],
                allow_air: data.allow_air ?? true,
                allow_sea: data.allow_sea ?? false,
                supplier_cost: data.supplier_cost || '',
                dimension_l: data.depth || initialDimensions?.l || '',
                dimension_w: data.width || initialDimensions?.w || '',
                dimension_h: data.height || initialDimensions?.h || '',
                po_config: data.po_config ? (typeof data.po_config === 'string' ? JSON.parse(data.po_config) : data.po_config) : {
                    deposit_type: 'percent',
                    deposit_value: '',
                    eta: '',
                    deposit_deadline_days: '3',
                    balance_deadline_days: '7'
                },
                // Premium Mapping
                scale_id: data.scale_id || '',
                material_id: data.material_id || '',
                edition_type_id: data.edition_type_id || '',
                edition_size: data.edition_size || '',
                edition_number: data.edition_number || '',
                license_info: data.license_info || '',
                artist: data.artist || '',
                video_url: data.video_url || '',
                is_exclusive: data.is_exclusive || false,
                is_limited: data.is_limited || false,
                is_featured: data.is_featured || false
            });
        };

        if (productToEdit) {
            prepareData(productToEdit);
        } else if (id) {
            const fetchProduct = async () => {
                setFetching(true);
                try {
                    const res = await adminService.getProduct(id);
                    if (res) prepareData(res);
                } catch (error) {
                    console.error("Failed to fetch product", error);
                } finally {
                    setFetching(false);
                }
            };
            fetchProduct();
        }

        // Fetch Taxonomy Options
        const fetchTaxonomy = async () => {
            try {
                const results = await Promise.all([
                    adminService.getCategories(),
                    adminService.getBrands(),
                    adminService.getSeries(),
                    adminService.getCharacters(),
                    adminService.getGenres(),
                    adminService.getScales(),
                    adminService.getMaterials(),
                    adminService.getEditionTypes()
                ]);

                setTaxonomyOptions({
                    categories: results[0].data || results[0],
                    brands: results[1].data || results[1],
                    series: results[2],
                    characters: results[3],
                    genres: results[4],
                    scales: results[5],
                    materials: results[6],
                    editionTypes: results[7]
                });
            } catch (error) {
                console.error("Failed to fetch taxonomy options", error);
            }
        };

        fetchTaxonomy();

        // Fetch upsells if editing
        if (id || productToEdit?.id) {
            const targetId = productToEdit?.id || id;
            adminService.getProductUpsells(targetId).then(res => {
                setUpsellProducts(res?.data?.map(p => p.id) || []);
            }).catch(() => { });
        }

        // Fetch all products for upsell picker
        adminService.getProducts({ limit: 200, status: 'active' }).then(res => {
            setAllProducts(res?.data || []);
        }).catch(() => { });
    }, [id, productToEdit]);

    // Taxonomy Quick Add Handlers
    const handleAddTaxonomy = async (type, name) => {
        let newItem = null;
        try {
            switch (type) {
                case 'series': newItem = await adminService.createSeries({ name }); break;
                case 'character': newItem = await adminService.createCharacter({ name }); break;
                case 'genre': newItem = await adminService.createGenre({ name }); break;
                case 'scale': newItem = await adminService.createScale({ name }); break;
                case 'material': newItem = await adminService.createMaterial({ name }); break;
                case 'editionType': newItem = await adminService.createEditionType({ name }); break;
                default: break;
            }

            if (newItem) {
                // Refresh list avoiding duplicates
                const key = type === 'editionType' ? 'editionTypes' : type + (type.endsWith('s') ? '' : 's');
                setTaxonomyOptions(prev => {
                    const alreadyExists = prev[key]?.some(item => item.id === newItem.id);
                    if (alreadyExists) return prev;
                    return {
                        ...prev,
                        [key]: [...(prev[key] || []), newItem]
                    };
                });
                return newItem;
            }
        } catch (error) {
            throw error;
        }
    };

    const handleChange = useCallback((e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;

        setFormData(prev => {
            if (name.startsWith('po_')) {
                const field = name.replace('po_', '');
                return {
                    ...prev,
                    po_config: { ...prev.po_config, [field]: val }
                };
            }
            return { ...prev, [name]: val };
        });
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const dimensions = {
                l: formData.dimension_l,
                w: formData.dimension_w,
                h: formData.dimension_h,
                unit: 'cm'
            };

            const payload = {
                ...formData,
                category: typeof formData.category === 'object' ? formData.category?.name || '' : formData.category || '',
                brand: typeof formData.brand === 'object' ? formData.brand?.name || '' : formData.brand || '',
                price: parseFloat(formData.price),
                stock: parseInt(formData.stock),
                weight: parseFloat(formData.weight) || 0,
                supplier_cost: parseFloat(formData.supplier_cost) || 0,
                dimensions: dimensions,
                // Map dimensi ke field Biteship (height/width/depth dalam CM)
                height: parseFloat(formData.dimension_h) || null,
                width: parseFloat(formData.dimension_w) || null,
                depth: parseFloat(formData.dimension_l) || null,
                images: typeof formData.images === 'string' ? formData.images.split(',').map(s => s.trim()).filter(Boolean) : formData.images,
                po_config: {
                    ...formData.po_config,
                    deposit_value: parseFloat(formData.po_config.deposit_value) || 0
                },
                // Parse Numbers for Premium
                scale_id: formData.scale_id ? parseInt(formData.scale_id) : null,
                material_id: formData.material_id ? parseInt(formData.material_id) : null,
                edition_type_id: formData.edition_type_id ? parseInt(formData.edition_type_id) : null,
                edition_size: formData.edition_size ? parseInt(formData.edition_size) : null,
            };

            if (productToEdit || id) {
                const targetId = productToEdit?.id || id;
                await adminService.updateProduct(targetId, payload);
            } else {
                await adminService.createProduct(payload);
            }

            if (onSuccess) {
                onSuccess();
            } else {
                navigate('/admin/products');
            }
        } catch (error) {
            console.error("Operation failed", error);
            showToast.error('Gagal menyimpan: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            navigate('/admin/products');
        }
    };

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center p-20 glass-card rounded-[2.5rem]">
                <div className="w-12 h-12 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest animate-pulse">Menginisialisasi Aliran Data...</p>
            </div>
        );
    }

    const isEdit = !!(productToEdit || id);

    return (
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between mb-10">
                <div>
                    <h2 className="text-3xl font-black text-white italic normal-case tracking-tight">
                        {isEdit ? 'Sinkronisasi Modul' : 'Inisialisasi Modul'}
                    </h2>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-2">{isEdit ? `Memperbarui ID: ${productToEdit?.id || id}` : 'Buat rekam inventaris baru'}</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/admin/taxonomy')}
                        className="btn-secondary h-[40px] border-blue-500/20 text-blue-500"
                        title="Kelola Kategori, Merek, Seri, dll."
                    >
                        <HiOutlineTag className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Kelola Data Master</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="btn-secondary h-[40px] border-rose-500/20 text-rose-500"
                        title="Batal dan Kembali"
                    >
                        <HiOutlineX className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-widest hidden md:block">Batal</span>
                    </button>
                </div>
            </div>

            {/* Navigation Bar */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-3xl border border-white/5 mb-10 overflow-x-auto custom-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-element">
                <div className="min-h-[400px]">
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                <div className="md:col-span-3">
                                    <FastInput label="Penamaan Produk" name="name" value={formData.name} onChange={handleChange} placeholder="Gundam MGEX Strike Freedom..." required />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest block mb-2">Tipe Kelas</label>
                                    <select name="product_type" value={formData.product_type} onChange={handleChange} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none appearance-none cursor-pointer italic font-bold">
                                        <option value="ready" className="bg-slate-900">STOK TERSEDIA</option>
                                        <option value="po" className="bg-slate-900">MODUL PRE-ORDER</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <CreatableSelect
                                    label="Kategori Inventaris"
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    options={taxonomyOptions.categories}
                                    placeholder="Pilih atau Ketik Kategori..."
                                />
                                <CreatableSelect
                                    label="Merek Manufaktur"
                                    name="brand"
                                    value={formData.brand}
                                    onChange={handleChange}
                                    options={taxonomyOptions.brands}
                                    placeholder="Pilih atau Ketik Merek..."
                                />
                            </div>

                            {/* TAXONOMY MULTI-SELECTS */}
                            <div className="space-y-6 pt-6 border-t border-white/5">
                                <MultiSelectPills
                                    label="Seri / Waralaba"
                                    options={taxonomyOptions.series}
                                    selectedIds={formData.series_ids}
                                    onChange={(ids) => setFormData(prev => ({ ...prev, series_ids: ids }))}
                                    onAdd={(name) => handleAddTaxonomy('series', name)}
                                />
                                <MultiSelectPills
                                    label="Karakter"
                                    options={taxonomyOptions.characters}
                                    selectedIds={formData.character_ids}
                                    onChange={(ids) => setFormData(prev => ({ ...prev, character_ids: ids }))}
                                    onAdd={(name) => handleAddTaxonomy('character', name)}
                                />
                                <MultiSelectPills
                                    label="Genre"
                                    options={taxonomyOptions.genres}
                                    selectedIds={formData.genre_ids}
                                    onChange={(ids) => setFormData(prev => ({ ...prev, genre_ids: ids }))}
                                    onAdd={(name) => handleAddTaxonomy('genre', name)}
                                />
                            </div>

                            <FastInput label="Detail Naratif" name="description" value={formData.description} onChange={handleChange} textarea placeholder="Berikan deskripsi detail tentang modul produk..." />

                            <div className="space-y-4">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Aset Visual</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {/* Upload Button */}
                                    <label className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 hover:bg-white/10 transition-all group">
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length === 0) return;

                                            // Handle multiple uploads
                                            setLoading(true);
                                            try {
                                                const newUrls = await Promise.all(files.map(file => adminService.uploadFile(file)));
                                                setFormData(prev => {
                                                    const currentImages = Array.isArray(prev.images) ? prev.images : (typeof prev.images === 'string' && prev.images ? prev.images.split(',') : []);
                                                    return {
                                                        ...prev,
                                                        images: [...currentImages, ...newUrls.map(res => res.url)]
                                                    };
                                                });
                                            } catch (error) {
                                                showToast.error('Unggah gagal: ' + error.message);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }} />
                                        <HiOutlineUpload className="w-8 h-8 text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all mb-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 group-hover:text-gray-400">Unggah Aset</span>
                                    </label>

                                    {/* Image Previews */}
                                    {(Array.isArray(formData.images) ? formData.images : (typeof formData.images === 'string' && formData.images ? formData.images.split(',') : [])).map((img, i) => (
                                        <div key={i} className="aspect-square bg-white/5 rounded-2xl relative group overflow-hidden border border-white/5">
                                            <img src={img.startsWith('http') ? img : `${UPLOAD_BASE_URL}${img}`} alt="" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button type="button" onClick={() => {
                                                    setFormData(prev => {
                                                        const currentImages = Array.isArray(prev.images) ? prev.images : (typeof prev.images === 'string' && prev.images ? prev.images.split(',') : []);
                                                        return {
                                                            ...prev,
                                                            images: currentImages.filter((_, idx) => idx !== i)
                                                        };
                                                    });
                                                }} className="p-3 bg-rose-500/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                                                    <HiOutlineTrash className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Premium & Specs Tab */}
                    {activeTab === 'premium' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Feature Flags */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${formData.is_exclusive ? 'bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20' : 'bg-white/5 border-white/10'}`}>
                                        {formData.is_exclusive && <HiOutlineStar className="w-6 h-6" />}
                                    </div>
                                    <input type="checkbox" name="is_exclusive" checked={formData.is_exclusive} onChange={handleChange} className="hidden" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm uppercase">Eksklusif Toko</h4>
                                        <p className="text-[10px] text-gray-500">Tandai sebagai Hanya Warung Forza</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${formData.is_limited ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                                        {formData.is_limited && <HiOutlineSparkles className="w-6 h-6" />}
                                    </div>
                                    <input type="checkbox" name="is_limited" checked={formData.is_limited} onChange={handleChange} className="hidden" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm uppercase">Edisi Terbatas</h4>
                                        <p className="text-[10px] text-gray-500">Batas Kuantitas Ketat</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${formData.is_featured ? 'bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/10'}`}>
                                        {formData.is_featured && <HiOutlineCheck className="w-6 h-6" />}
                                    </div>
                                    <input type="checkbox" name="is_featured" checked={formData.is_featured} onChange={handleChange} className="hidden" />
                                    <div>
                                        <h4 className="text-white font-bold text-sm uppercase">Item Unggulan</h4>
                                        <p className="text-[10px] text-gray-500">Tampilkan di Beranda</p>
                                    </div>
                                </label>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <SelectWithAdd
                                    label="Skala / Ukuran"
                                    name="scale_id"
                                    value={formData.scale_id}
                                    onChange={handleChange}
                                    options={taxonomyOptions.scales}
                                    placeholder="Pilih Skala..."
                                    onAdd={(name) => handleAddTaxonomy('scale', name)}
                                />
                                <SelectWithAdd
                                    label="Material Utama"
                                    name="material_id"
                                    value={formData.material_id}
                                    onChange={handleChange}
                                    options={taxonomyOptions.materials}
                                    placeholder="Pilih Material..."
                                    onAdd={(name) => handleAddTaxonomy('material', name)}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <SelectWithAdd
                                    label="Tipe Edisi"
                                    name="edition_type_id"
                                    value={formData.edition_type_id}
                                    onChange={handleChange}
                                    options={taxonomyOptions.editionTypes}
                                    placeholder="Standar / Reguler"
                                    onAdd={(name) => handleAddTaxonomy('editionType', name)}
                                />
                                <FastInput label="Ukuran Edisi (Jumlah)" name="edition_size" type="number" value={formData.edition_size} onChange={handleChange} placeholder="misal: 500" isMono />
                                <FastInput label="Detail Nomor Edisi" name="edition_number" value={formData.edition_number} onChange={handleChange} placeholder="misal: AP 5/10" isMono />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FastInput label="Artis / Pemahat" name="artist" value={formData.artist} onChange={handleChange} placeholder="misal: Takayuki Takeya" />
                                <FastInput label="Info Lisensi Resmi" name="license_info" value={formData.license_info} onChange={handleChange} placeholder="misal: © Marvel 2024" />
                            </div>

                            <FastInput label="URL Video Produk (YouTube)" name="video_url" value={formData.video_url} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." isMono />
                        </div>
                    )}

                    {/* Commercials Tab */}
                    {activeTab === 'pricing' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FastInput label="SKU Registrasi" name="sku" value={formData.sku} onChange={handleChange} placeholder="GDM-MGEX-00..." required isMono />
                                {formData.product_type !== 'po' && (
                                    <FastInput
                                        label="Ketersediaan Stok Fisik"
                                        name="stock"
                                        type="number"
                                        value={formData.stock}
                                        onChange={handleChange}
                                        placeholder="0"
                                        isMono
                                    />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <FastInput label="Valuasi Ritel (IDR)" name="price" type="number" value={formData.price} onChange={handleChange} placeholder="0" required isMono />
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold italic tracking-wider">*(Ini adalah Harga Jual normal yang akan dilihat oleh pelanggan di website)*</p>
                                </div>
                                <div>
                                    <FastInput label="Biaya Pasokan (IDR)" name="supplier_cost" type="number" value={formData.supplier_cost} onChange={handleChange} placeholder="0" isMono />
                                    <p className="text-[10px] text-gray-500 mt-2 font-bold italic tracking-wider">*(Ini adalah Harga Modal/Beli dari Supplier. Tidak terlihat oleh pelanggan, hanya untuk Kalkulasi Profit di Laporan)*</p>
                                </div>
                            </div>

                            {formData.product_type === 'po' && (
                                <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] space-y-6 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10"><HiOutlineInformationCircle className="w-12 h-12" /></div>
                                    <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest">⚙️ Pengaturan Pre-Order</h3>
                                    <p className="text-gray-500 text-xs -mt-2">Konfigurasi kuota slot inventaris, deposit wajib, dan estimasi kedatangan untuk produk PO ini.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                        <FastInput
                                            label="Batas Kuota / Slot Maksimal"
                                            name="stock"
                                            type="number"
                                            value={formData.stock}
                                            onChange={handleChange}
                                            placeholder="misal: 100"
                                            required
                                            isMono
                                        />
                                        <div className="space-y-2">
                                            <label className="admin-label">Tipe Deposit</label>
                                            <select name="po_deposit_type" value={formData.po_config.deposit_type} onChange={handleChange} className="admin-input appearance-none">
                                                <option value="percent" className="bg-slate-900">Persentase (%)</option>
                                                <option value="fixed" className="bg-slate-900">Jumlah Tetap (IDR)</option>
                                            </select>
                                        </div>
                                        <FastInput
                                            label={formData.po_config.deposit_type === 'percent' ? "Besar Deposit (%)" : "Jumlah Deposit (IDR)"}
                                            name="po_deposit_value"
                                            type="number"
                                            value={formData.po_config.deposit_value}
                                            onChange={handleChange}
                                            placeholder={formData.po_config.deposit_type === 'percent' ? "misal: 30" : "misal: 5000000"}
                                            isMono
                                        />
                                        <FastInput label="Estimasi Tiba (ETA)" name="po_eta" type="date" value={formData.po_config.eta} onChange={handleChange} isDate />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-blue-500/10">
                                        <FastInput
                                            label="Batas Bayar Deposit (hari)"
                                            name="po_deposit_deadline_days"
                                            type="number"
                                            value={formData.po_config.deposit_deadline_days}
                                            onChange={handleChange}
                                            placeholder="3"
                                            isMono
                                        />
                                        <FastInput
                                            label="Batas Pelunasan Setelah Barang Tiba (hari)"
                                            name="po_balance_deadline_days"
                                            type="number"
                                            value={formData.po_config.balance_deadline_days}
                                            onChange={handleChange}
                                            placeholder="7"
                                            isMono
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Logistics Tab */}
                    {activeTab === 'shipping' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Biteship Shipping Notice */}
                            <div className="p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                                <HiOutlineInformationCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest">Persyaratan Biteship</p>
                                    <p className="text-gray-400 text-xs mt-1">Berat produk <strong className="text-white">WAJIB</strong> diisi sebelum produk bisa diaktifkan. Data ini digunakan untuk kalkulasi ongkir otomatis via Biteship.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FastInput label="Berat Produk (KG)" name="weight" type="number" value={formData.weight} onChange={handleChange} placeholder="misal: 5.5" isMono required />
                                <div className="space-y-2">
                                    <label className="admin-label">Dimensi Kemasan (P x L x T dalam CM)</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <input name="dimension_l" placeholder="P" value={formData.dimension_l} onChange={handleChange} className="admin-input text-center font-mono" />
                                        <input name="dimension_w" placeholder="L" value={formData.dimension_w} onChange={handleChange} className="admin-input text-center font-mono" />
                                        <input name="dimension_h" placeholder="T" value={formData.dimension_h} onChange={handleChange} className="admin-input text-center font-mono" />
                                    </div>
                                    <p className="text-gray-600 text-[10px]">Opsional. Digunakan untuk kalkulasi berat volumetrik.</p>
                                </div>
                            </div>

                            <div className="p-8 bg-white/5 rounded-xl border border-white/5">
                                <label className="admin-label block mb-6">Kemampuan Pemenuhan</label>
                                <div className="flex flex-col md:flex-row gap-8">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${formData.allow_air ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                            {formData.allow_air && <HiOutlineCheck className="text-white w-5 h-5" />}
                                        </div>
                                        <input type="checkbox" name="allow_air" checked={formData.allow_air} onChange={handleChange} className="hidden" />
                                        <span className="text-white font-bold text-sm">Kirim via Kargo Udara ✈️</span>
                                    </label>
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${formData.allow_sea ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}>
                                            {formData.allow_sea && <HiOutlineCheck className="text-white w-5 h-5" />}
                                        </div>
                                        <input type="checkbox" name="allow_sea" checked={formData.allow_sea} onChange={handleChange} className="hidden" />
                                        <span className="text-white font-bold text-sm">Kirim via Kargo Laut 🚢</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Upsell / Cross-sell Tab */}
                    {activeTab === 'upsell' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-5 bg-purple-600/5 border border-purple-500/20 rounded-2xl flex items-start gap-3">
                                <HiOutlineStar className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Upsell / Cross-Sell</p>
                                    <p className="text-gray-400 text-xs mt-1">Pilih produk yang akan ditampilkan sebagai rekomendasi di halaman produk ini. Pelanggan akan melihat "Customers Also Bought" di bawah produk ini.</p>
                                </div>
                            </div>

                            {/* Search */}
                            <input
                                type="text"
                                value={upsellSearch}
                                onChange={e => setUpsellSearch(e.target.value)}
                                placeholder="Cari produk untuk ditambahkan..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
                            />

                            {/* Product Picker Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                                {allProducts
                                    .filter(p => {
                                        const currentId = productToEdit?.id || id;
                                        if (currentId && p.id === parseInt(currentId)) return false; // exclude self
                                        if (!upsellSearch) return true;
                                        return p.name.toLowerCase().includes(upsellSearch.toLowerCase()) || p.sku?.toLowerCase().includes(upsellSearch.toLowerCase());
                                    })
                                    .map(p => {
                                        const isSelected = upsellProducts.includes(p.id);
                                        return (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    setUpsellProducts(prev =>
                                                        isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                                    );
                                                }}
                                                className={`relative text-left p-3 rounded-xl border transition-all text-xs ${isSelected
                                                        ? 'border-purple-500 bg-purple-600/10 text-white'
                                                        : 'border-white/5 bg-white/[0.02] text-gray-400 hover:border-white/20 hover:text-white'
                                                    }`}
                                            >
                                                {isSelected && (
                                                    <span className="absolute top-2 right-2 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                                                        <HiOutlineCheck className="w-2.5 h-2.5 text-white" />
                                                    </span>
                                                )}
                                                <p className="font-semibold line-clamp-2 pr-5">{p.name}</p>
                                                <p className="text-[9px] text-gray-600 mt-1 font-mono">{p.sku}</p>
                                            </button>
                                        );
                                    })
                                }
                            </div>

                            {/* Selected Summary */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <p className="text-gray-500 text-xs">
                                    <span className="text-white font-bold">{upsellProducts.length}</span> produk dipilih sebagai upsell
                                </p>
                                <button
                                    type="button"
                                    disabled={upsellSaving}
                                    onClick={async () => {
                                        const targetId = productToEdit?.id || id;
                                        if (!targetId) { showToast.error('Simpan produk terlebih dahulu sebelum mengatur upsell.'); return; }
                                        setUpsellSaving(true);
                                        try {
                                            await adminService.setProductUpsells(targetId, { upsell_ids: upsellProducts, type: 'upsell' });
                                            showToast.success('Upsell berhasil disimpan!');
                                        } catch {
                                            showToast.error('Gagal menyimpan upsell.');
                                        } finally {
                                            setUpsellSaving(false);
                                        }
                                    }}
                                    className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {upsellSaving ? 'Menyimpan...' : 'Simpan Upsell'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-10 border-t border-white/5">
                    <button type="button" onClick={handleCancel} className="text-gray-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors">Batal & Kembali</button>
                    <div className="flex gap-4">
                        {activeTab !== 'shipping' && activeTab !== 'upsell' ? (
                            <button type="button" onClick={() => {
                                const nextTab = activeTab === 'basic' ? 'premium' : (activeTab === 'premium' ? 'pricing' : 'shipping');
                                setActiveTab(nextTab);
                            }} className="btn-secondary">
                                Tahap Selanjutnya <HiOutlineArrowRight />
                            </button>
                        ) : null}
                        <button type="submit" disabled={loading} className="btn-primary min-w-[200px]">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <HiOutlineSave className="w-5 h-5" />
                                    {isEdit ? 'Simpan Modul' : 'Rekam Produk'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductForm;
