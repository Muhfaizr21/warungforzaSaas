import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import {
    HiOutlineCog,
    HiOutlineGlobe,
    HiOutlineCurrencyDollar,
    HiOutlineTruck,
    HiOutlineMail,
    HiOutlinePhotograph,
    HiOutlineSave,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineExclamation
} from 'react-icons/hi';

import { usePermission } from '../../hooks/usePermission';
import { useCurrency } from '../../context/CurrencyContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import AlertModal from '../../components/AlertModal';

const Settings = () => {
    const { hasPermission } = usePermission();
    const { refreshCurrencies } = useCurrency();
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({});
    const [user, setUser] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, title: '', message: '', onConfirm: null });
    const [alertConfig, setAlertConfig] = useState({ show: false, title: '', message: '', type: 'info' });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const isSuperAdmin = user?.role === 'super_admin';
    const [shippingRates, setShippingRates] = useState([]);
    const [carriers, setCarriers] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showModal, setShowModal] = useState(null);
    const [formData, setFormData] = useState({});
    const [intlZones, setIntlZones] = useState([]);
    const [activeShippingSubTab, setActiveShippingSubTab] = useState('domestic'); // 'domestic' | 'international'
    const [showIntlModal, setShowIntlModal] = useState(null); // 'zone' | 'method'
    const [intlFormData, setIntlFormData] = useState({});
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [fetchedCountries, setFetchedCountries] = useState([]);

    useEffect(() => {
        loadData();
        fetchCountries();
    }, []);

    const fetchCountries = async () => {
        try {
            const res = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
            const data = await res.json();
            const formatted = data.map(c => ({
                code: c.cca2,
                name: c.name.common
            })).sort((a, b) => a.name.localeCompare(b.name));
            setFetchedCountries(formatted);
        } catch (err) {
            console.error("Failed to fetch countries", err);
        }
    };


    const loadData = async () => {
        setLoading(true);
        try {
            const responses = await Promise.all([
                adminService.getSettings(),
                adminService.getShippingRates(),
                adminService.getCarriers(),
                adminService.getCurrencies(),
                adminService.getShippingZones()
            ]);

            const settingsRes = responses[0];
            const shippingRes = responses[1];
            const carriersRes = responses[2];
            const currenciesRes = responses[3];
            const intlRes = responses[4];

            const settingsArray = Array.isArray(settingsRes) ? settingsRes : (settingsRes?.data || []);
            const settingsObj = {};
            settingsArray.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            setSettings(settingsObj);

            setShippingRates(Array.isArray(shippingRes) ? shippingRes : (shippingRes?.data || []));
            setCarriers(Array.isArray(carriersRes) ? carriersRes : (carriersRes?.data || []));
            setCurrencies(Array.isArray(currenciesRes) ? currenciesRes : (currenciesRes?.data || []));
            setIntlZones(Array.isArray(intlRes) ? intlRes : (intlRes?.data || []));

        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSetting = async (key, value) => {
        setSaving(true);
        try {
            await adminService.updateSetting({ key, value });
            setSettings(prev => ({ ...prev, [key]: value }));
        } catch (error) {
            showToast.error('Gagal menyimpan: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    const handleAddShipping = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) {
                await adminService.updateShippingRate(formData.id, formData);
            } else {
                await adminService.createShippingRate(formData);
            }
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal menyimpan tarif: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleSaveIntlZone = async (e) => {
        e.preventDefault();
        try {
            // Normalize countries data
            let countriesData = intlFormData.countries || '[]';
            if (typeof countriesData === 'string') {
                // Remove whitespaces and check if it's already a JSON array
                const trimmed = countriesData.trim();
                if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                    // It looks like JSON, let's try to parse and re-stringify to ensure valid format
                    try {
                        countriesData = JSON.stringify(JSON.parse(trimmed));
                    } catch (e) {
                        // Fallback: treat as comma-separated if JSON parse fails
                        countriesData = JSON.stringify(trimmed.split(',').map(c => c.trim()).filter(c => c));
                    }
                } else {
                    // Treat as comma-separated
                    countriesData = JSON.stringify(trimmed.split(',').map(c => c.trim()).filter(c => c));
                }
            } else if (Array.isArray(countriesData)) {
                countriesData = JSON.stringify(countriesData);
            }

            const payload = { ...intlFormData, countries: countriesData };

            if (intlFormData.id) {
                await adminService.updateShippingZone(intlFormData.id, payload);
            } else {
                await adminService.createShippingZone(payload);
            }
            setShowIntlModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal menyimpan zona: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleSaveIntlMethod = async (e) => {
        e.preventDefault();
        try {
            if (intlFormData.id) {
                await adminService.updateShippingMethod(intlFormData.id, intlFormData);
            } else {
                await adminService.createShippingMethod(intlFormData);
            }
            setShowIntlModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal menyimpan metode: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDeleteIntlZone = async (id) => {
        if (!confirm('Hapus zona pengiriman ini beserta semua metodenya?')) return;
        try {
            await adminService.deleteShippingZone(id);
            loadData();
        } catch (error) {
            showToast.error('Gagal menghapus zona');
        }
    };

    const handleDeleteIntlMethod = async (id) => {
        if (!confirm('Hapus metode pengiriman ini?')) return;
        try {
            await adminService.deleteShippingMethod(id);
            loadData();
        } catch (error) {
            showToast.error('Gagal menghapus metode');
        }
    };

    const KNOWN_CURRENCIES = [
        // Major Currencies
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },

        // Asian Currencies
        { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
        { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
        { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
        { code: 'THB', name: 'Thai Baht', symbol: '฿' },
        { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$' },
        { code: 'VND', name: 'Vietnamese Dong', symbol: '₫' },
        { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹' },

        // Middle East
        { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
        { code: 'AED', name: 'UAE Dirham', symbol: 'DH' },
        { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },

        // Others
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
        { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
        { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    ];

    const handleCurrencySelect = async (e) => {
        const code = e.target.value;
        if (!code) return;

        const selected = KNOWN_CURRENCIES.find(c => c.code === code);
        if (selected) {
            setFormData(prev => ({
                ...prev,
                code: selected.code,
                name: selected.name,
                symbol: selected.symbol,
                exchange_rate: '' // Reset while fetching
            }));

            // Fetch live rate
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/IDR');
                const data = await res.json();
                const rateInIDR = data.rates[code]; // e.g. 0.0003 for MYR (1 IDR = 0.0003 MYR)

                if (rateInIDR && rateInIDR > 0) {
                    // IDR per Unit = 1 / Rate
                    const idrPerUnit = 1 / rateInIDR;
                    setFormData(prev => ({
                        ...prev,
                        exchange_rate: parseFloat(idrPerUnit.toFixed(2))
                    }));
                } else {
                    showToast.info("Kurs tidak ditemukan untuk mata uang ini.");
                }
            } catch (error) {
                console.error("Failed to fetch rate", error);
                showToast.error("Gagal mengambil kurs otomatis. Silakan isi manual.");
            }
        }
    };

    const handleAddCarrier = async (e) => {
        e.preventDefault();
        try {
            await adminService.createCarrier(formData);
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal menambah: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAddCurrency = async (e) => {
        e.preventDefault();
        try {
            await adminService.createCurrency(formData);
            setShowModal(null);
            loadData();
            refreshCurrencies(); // Sync global state
        } catch (error) {
            showToast.error('Gagal menambah mata uang: ' + (error.response?.data?.error || error.message));
        }
    };

    const tabs = [
        { id: 'general', label: 'Umum', icon: HiOutlineGlobe },
        { id: 'payment', label: 'Pembayaran', icon: HiOutlineCurrencyDollar },
        { id: 'email', label: 'Email', icon: HiOutlineMail },
        { id: 'system', label: 'Sistem', icon: HiOutlineCog },
    ];

    const FastSettingInput = React.memo(({ label, settingKey, type = 'text', placeholder, description, value, onSave }) => {
        const [localValue, setLocalValue] = useState(value || '');

        useEffect(() => {
            setLocalValue(value || '');
        }, [value]);

        return (
            <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow">
                        <label className="text-white font-bold text-sm h-5 block mb-1">{label}</label>
                        {description && <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{description}</p>}
                    </div>
                    <input
                        type={type}
                        value={localValue}
                        onChange={(e) => setLocalValue(e.target.value)}
                        onBlur={(e) => onSave(settingKey, e.target.value)}
                        placeholder={placeholder}
                        className="w-full md:w-80 bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-blue-500/50 italic normal-case font-medium"
                    />
                </div>
            </div>
        );
    });

    const SettingToggle = ({ label, settingKey, description }) => (
        <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
            <div className="flex items-center justify-between gap-6">
                <div>
                    <label className="text-white font-bold text-sm h-5 block mb-1">{label}</label>
                    {description && <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{description}</p>}
                </div>
                <button
                    onClick={() => handleSaveSetting(settingKey, settings[settingKey] === 'true' ? 'false' : 'true')}
                    className={`w-14 h-7 rounded-full transition-all relative border border-white/10 ${settings[settingKey] === 'true' ? 'bg-blue-600' : 'bg-white/5'
                        }`}
                >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-lg transition-all ${settings[settingKey] === 'true' ? 'left-8' : 'left-1'
                        }`}></div>
                </button>
            </div>
        </div>
    );

    const FastSettingImage = React.memo(({ label, settingKey, description, value, onSave }) => {
        const [uploading, setUploading] = useState(false);
        const [preview, setPreview] = useState(value);

        useEffect(() => {
            setPreview(value);
        }, [value]);

        const handleUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setUploading(true);
            try {
                const res = await adminService.uploadFile(file);
                if (res && res.url) {
                    setPreview(res.url);
                    onSave(settingKey, res.url);
                }
            } catch (err) {
                showToast.error('Gagal mengupload gambar');
            } finally {
                setUploading(false);
            }
        };

        return (
            <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow">
                        <label className="text-white font-bold text-sm h-5 block mb-1">{label}</label>
                        {description && <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{description}</p>}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-80">
                        {preview && (
                            <img src={preview.startsWith('http') ? preview : `http://localhost:5000${preview}`} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5 border border-white/10" />
                        )}
                        <label className="flex-grow flex items-center justify-center p-3.5 bg-white/5 border border-white/5 border-dashed rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors text-xs font-bold text-gray-400 hover:text-white">
                            {uploading ? 'MENGUNGGAH...' : 'PILIH GAMBAR BARU'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>
            </div>
        );
    });

    const DraftSettingInput = React.memo(({ label, settingKey, type = 'text', placeholder, description, value, onChange }) => {
        return (
            <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow">
                        <label className="text-white font-bold text-sm h-5 block mb-1">{label}</label>
                        {description && <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{description}</p>}
                    </div>
                    {type === 'color' ? (
                        <div className="flex items-center gap-3 w-full md:w-80">
                            <div className="relative w-12 h-12 rounded-xl border border-white/20 overflow-hidden shadow-inner flex-shrink-0 cursor-pointer">
                                <input
                                    type="color"
                                    value={value || '#000000'}
                                    onChange={(e) => onChange(settingKey, e.target.value)}
                                    className="absolute inset-[-10px] w-20 h-20 opacity-0 cursor-pointer"
                                />
                                <div className="absolute inset-0 pointer-events-none" style={{ backgroundColor: value || '#000000' }}></div>
                            </div>
                            <input
                                type="text"
                                value={value || ''}
                                onChange={(e) => onChange(settingKey, e.target.value)}
                                placeholder="#HEX"
                                className="flex-grow bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 uppercase font-medium tracking-widest"
                            />
                        </div>
                    ) : (
                        <input
                            type={type}
                            value={value || ''}
                            onChange={(e) => onChange(settingKey, e.target.value)}
                            placeholder={placeholder}
                            className="w-full md:w-80 bg-white/5 border border-white/5 rounded-xl p-3.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 italic normal-case font-medium"
                        />
                    )}
                </div>
            </div>
        );
    });

    const DraftSettingImage = React.memo(({ label, settingKey, description, value, onChange }) => {
        const [uploading, setUploading] = useState(false);

        const handleUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setUploading(true);
            try {
                const res = await adminService.uploadFile(file);
                if (res && res.url) {
                    onChange(settingKey, res.url);
                }
            } catch (err) {
                showToast.error('Gagal mengupload gambar');
            } finally {
                setUploading(false);
            }
        };

        return (
            <div className="bg-white/[0.02] rounded-2xl p-6 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-grow">
                        <label className="text-white font-bold text-sm h-5 block mb-1">{label}</label>
                        {description && <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{description}</p>}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-80">
                        {value && (
                            <img src={value.startsWith('http') ? value : `http://localhost:5000${value}`} alt="" className="w-12 h-12 rounded-lg object-cover bg-white/5 border border-white/10" />
                        )}
                        <label className="flex-grow flex items-center justify-center p-3.5 bg-white/5 border border-white/5 border-dashed rounded-xl cursor-pointer hover:border-emerald-500/50 transition-colors text-xs font-bold text-gray-400 hover:text-white">
                            {uploading ? 'MENGUNGGAH...' : 'PILIH GAMBAR BARU'}
                            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>
            </div>
        );
    });

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Menyinkronkan Konfigurasi...</p>
        </div>
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Kontrol Sistem</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Atur parameter operasional platform Anda</p>
                </div>
                <button onClick={loadData} className="p-3 glass-card rounded-xl text-gray-400 hover:text-white transition-all shadow-sm">
                    <HiOutlineRefresh className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Tabs Sidebar */}
                <div className="lg:w-72 flex-shrink-0 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all border ${activeTab === tab.id
                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'glass-card border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                                }`}
                        >
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-500'}`} />
                            <span className="font-bold text-xs uppercase tracking-widest">{tab.label}</span>
                        </button>
                    ))}
                    {saving && (
                        <div className="pt-4 flex items-center justify-center gap-2 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                            <HiOutlineSave className="animate-bounce" /> MENYIMPAN OTOMATIS...
                        </div>
                    )}
                </div>

                {/* Content Hub */}
                <div className="flex-grow space-y-6">
                    <div className="glass-card rounded-3xl overflow-hidden border border-white/5">
                        <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                            <h3 className="text-white font-bold italic normal-case flex items-center gap-3">
                                {tabs.find(t => t.id === activeTab)?.icon({ className: "w-6 h-6 text-blue-400" })}
                                Parameter {tabs.find(t => t.id === activeTab)?.label}
                            </h3>
                        </div>

                        <div className="p-8 space-y-6">
                            {activeTab === 'general' && (
                                <>
                                    <FastSettingInput label="Identitas Sistem" settingKey="store_name" value={settings.store_name} onSave={handleSaveSetting} placeholder="Warung Forza" description="NAMA TOKO YANG DITAMPILKAN KE PUBLIK" />
                                    <FastSettingInput label="Node Jaringan (URL)" settingKey="store_url" value={settings.store_url} onSave={handleSaveSetting} placeholder="https://warungforza.com" description="DOMAIN AKSES UTAMA" />
                                    <FastSettingInput label="Saluran Dukungan" settingKey="store_email" value={settings.store_email} onSave={handleSaveSetting} type="email" placeholder="hello@warungforza.com" description="EMAIL KONTAK ADMINISTRATIF" />
                                    <SettingToggle label="Mode Pemeliharaan" settingKey="maintenance_mode" description="NONAKTIFKAN AKSES TOKO PUBLIK" />
                                </>
                            )}


                            {activeTab === 'payment' && (
                                <>
                                    <FastSettingInput label="Mata Uang Utama" settingKey="currency" value={settings.currency} onSave={handleSaveSetting} placeholder="IDR" description="DENOMINASI TRANSAKSI UTAMA" />
                                    <FastSettingInput label="Komitmen PO (%)" settingKey="po_deposit_percentage" value={settings.po_deposit_percentage} onSave={handleSaveSetting} type="number" placeholder="50" description="DEPOSIT STANDAR UNTUK PRE-ORDER (BISA DIATUR PER PRODUK)" />
                                    <SettingToggle label="Buku Besar Bank" settingKey="enable_bank_transfer" description="VERIFIKASI PENYELESAIAN BANK MANUAL" />
                                    <FastSettingInput label="Rekening Utama" settingKey="bank_account" value={settings.bank_account} onSave={handleSaveSetting} placeholder="BCA - 123..." description="TUJUAN PENYELESAIAN STANDAR" />

                                    {/* BANK & COMPANY DETAILS (for Invoices/PDF) */}
                                    <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest">📄 Detail Invoice & PDF</p>
                                        <FastSettingInput label="Nama Bank" settingKey="bank_name" value={settings.bank_name} onSave={handleSaveSetting} placeholder="Bank Central Asia (BCA)" description="NAMA BANK YANG TAMPIL DI INVOICE" />
                                        <FastSettingInput label="Nomor Rekening" settingKey="bank_account_number" value={settings.bank_account_number} onSave={handleSaveSetting} placeholder="123-456-7890" description="NOMOR REKENING TUJUAN TRANSFER" />
                                        <FastSettingInput label="Nama Pemilik Rekening" settingKey="bank_account_name" value={settings.bank_account_name} onSave={handleSaveSetting} placeholder="PT Warung Forza Indonesia" description="ATAS NAMA REKENING DI INVOICE" />
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">🏢 Identitas Perusahaan (Invoice)</p>
                                        <FastSettingInput label="Nama Perusahaan" settingKey="company_name" value={settings.company_name} onSave={handleSaveSetting} placeholder="WARUNG FORZA SHOP" description="HEADER PADA INVOICE PDF" />
                                        <FastSettingInput label="Tagline" settingKey="company_tagline" value={settings.company_tagline} onSave={handleSaveSetting} placeholder="Premium Collectibles Indonesia" description="SUB-HEADER INVOICE" />
                                        <FastSettingInput label="Alamat Perusahaan" settingKey="company_address" value={settings.company_address} onSave={handleSaveSetting} placeholder="Jakarta, Indonesia" description="ALAMAT YANG DITAMPILKAN DI INVOICE" />
                                        <FastSettingInput label="Kode Pos Perusahaan" settingKey="store_postal_code" value={settings.store_postal_code} onSave={handleSaveSetting} placeholder="12345" description="DIGUNAKAN UNTUK LOKASI ASAL ONGKIR BITESHIP" />
                                        <FastSettingInput label="Email Perusahaan" settingKey="company_email" value={settings.company_email} onSave={handleSaveSetting} placeholder="info@warungforza.com" description="EMAIL KONTAK DI INVOICE" />
                                        <FastSettingInput label="Telepon Perusahaan" settingKey="company_phone" value={settings.company_phone} onSave={handleSaveSetting} placeholder="+62 812-XXXX-XXXX" description="TELEPON DI INVOICE" />
                                    </div>

                                    {/* LIVE CURRENCY SECTION */}
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5 mt-8">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h4 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                                                    <HiOutlineCurrencyDollar className="w-4 h-4 text-emerald-400" /> Nilai Tukar Langsung
                                                </h4>
                                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                                                    DATA PASAR REAL-TIME (SINKRONISASI OTOMATIS)
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setShowModal('currency'); setFormData({}); }} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/10">
                                                    <HiOutlinePlus className="w-5 h-5" />
                                                </button>
                                                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center">
                                                    LANGSUNG
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {currencies.map(c => (
                                                c.code !== 'IDR' && (
                                                    <div key={c.code} className="p-4 glass-card rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-black text-white border border-white/10">
                                                                {c.symbol}
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{c.code}</p>
                                                                <p className="text-[10px] text-gray-500 font-bold uppercase">{c.name}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-emerald-400 font-mono font-bold text-sm">
                                                                Rp {new Intl.NumberFormat('id-ID').format(c.exchange_rate)}
                                                            </p>
                                                            <p className="text-[9px] text-gray-600 font-mono">
                                                                1 {c.code}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (confirm(`Hapus mata uang ${c.code}?`)) {
                                                                    try {
                                                                        await adminService.deleteCurrency(c.code);
                                                                        loadData();
                                                                        refreshCurrencies(); // Sync global state
                                                                    } catch (error) {
                                                                        showToast.error('Gagal menghapus: ' + error.message);
                                                                    }
                                                                }
                                                            }}
                                                            className="ml-4 p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                                                        >
                                                            <HiOutlineTrash className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}



                            {activeTab === 'email' && (
                                <>
                                    <FastSettingInput label="Server Email (SMTP)" settingKey="smtp_host" value={settings.smtp_host} onSave={handleSaveSetting} placeholder="smtp.gmail.com" description="NODE KOMUNIKASI KELUAR" />
                                    <FastSettingInput label="Port Server" settingKey="smtp_port" value={settings.smtp_port} onSave={handleSaveSetting} type="number" placeholder="587" description="PORT KOMUNIKASI AMAN" />
                                    <FastSettingInput label="Otentikasi Sistem" settingKey="smtp_username" value={settings.smtp_username} onSave={handleSaveSetting} placeholder="bot@domain.com" description="IDENTITAS PENGIRIM EMAIL" />
                                    <FastSettingInput label="Kata Sandi (App Password)" settingKey="smtp_password" type="password" value={settings.smtp_password} onSave={handleSaveSetting} placeholder="••••••••" description="KATA SANDI ATAU APP PASSWORD EMAIL" />
                                    <FastSettingInput label="Email Pengirim (From)" settingKey="smtp_from" value={settings.smtp_from} onSave={handleSaveSetting} placeholder="no-reply@warungforza.com" description="EMAIL PENGIRIM YANG DITAMPILKAN KE PELANGGAN" />
                                    <SettingToggle label="Alur Konfirmasi" settingKey="send_order_confirmation" description="PERINGATAN PENYELESAIAN PESANAN OTOMATIS" />
                                    <SettingToggle label="Alur Pengiriman" settingKey="send_shipping_notification" description="PEMBARUAN PELACAKAN LOGISTIK" />
                                </>
                            )}

                            {activeTab === 'system' && (
                                <div className="space-y-8">
                                    <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                        <div className="flex flex-col gap-6">
                                            <div>
                                                <h4 className="text-white font-bold text-sm tracking-tight flex items-center gap-2">
                                                    <HiOutlineCog className="w-5 h-5 text-blue-400" /> Integrasi API
                                                </h4>
                                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">
                                                    Penyiapan Kredensial Gateway & Pihak Ketiga
                                                </p>
                                            </div>
                                            <FastSettingInput
                                                label="Kunci API Biteship"
                                                settingKey="biteship_api_key"
                                                type="password"
                                                value={settings.biteship_api_key}
                                                onSave={handleSaveSetting}
                                                placeholder="biteship_..."
                                                description="MENIMPA KONFIGURASI ENV UNTUK CEK ONGKIR & NOMOR RESI"
                                            />
                                            <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">💳 Payment Gateway (Prismalink)</p>
                                                <FastSettingInput label="Merchant ID" settingKey="prismalink_merchant_id" value={settings.prismalink_merchant_id} onSave={handleSaveSetting} placeholder="001759..." description="ID MERCHANT PRISMALINK" />
                                                <FastSettingInput label="Key ID" settingKey="prismalink_key_id" value={settings.prismalink_key_id} onSave={handleSaveSetting} placeholder="ffdc..." description="KUNCI ID PRISMALINK" />
                                                <FastSettingInput label="Secret Key" settingKey="prismalink_secret_key" type="password" value={settings.prismalink_secret_key} onSave={handleSaveSetting} placeholder="f8d2..." description="RAHASIA PRISMALINK (JANGAN DIBAGIKAN)" />
                                                <FastSettingInput label="Base URL Gateway" settingKey="prismalink_url" value={settings.prismalink_url} onSave={handleSaveSetting} placeholder="https://api-staging.plink.co.id/gateway/v2" description="ENDPOINT API PAYMENT GATEWAY" />
                                            </div>
                                        </div>
                                    </div>


                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card rounded-3xl w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-bold text-xl tracking-tight italic normal-case">
                                {showModal === 'carrier' ? 'Konfigurasi Logistik' : showModal === 'currency' ? 'Tambah Mata Uang' : (formData.id ? 'Ubah Tarif' : 'Tambah Tarif')}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={showModal === 'carrier' ? handleAddCarrier : showModal === 'currency' ? handleAddCurrency : handleAddShipping} className="p-8 space-y-4">
                            {showModal === 'currency' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Pilih Mata Uang (Otomatis)</label>
                                        <select onChange={(e) => handleCurrencySelect(e)} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-colors">
                                            <option value="">-- Pilih Mata Uang --</option>
                                            {KNOWN_CURRENCIES.filter(c => !currencies.find(curr => curr.code === c.code)).map(c => (
                                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-gray-500 text-[9px] font-black uppercase tracking-widest">ATAU INPUT MANUAL</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Kode Mata Uang</label>
                                        <input type="text" value={formData.code || ''} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-emerald-500/50" placeholder="e.g. SAR, MYR, JPY" required maxLength={3} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Mata Uang</label>
                                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" placeholder="e.g. Saudi Riyal" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Simbol</label>
                                        <input type="text" value={formData.symbol || ''} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" placeholder="e.g. SR, ¥" required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Rate (1 Unit = ? IDR)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.exchange_rate || ''}
                                                onChange={(e) => setFormData({ ...formData, exchange_rate: parseFloat(e.target.value) })}
                                                className={`w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none ${!formData.exchange_rate ? 'animate-pulse' : ''}`}
                                                placeholder="e.g. 4200"
                                                required
                                            />
                                            {!formData.exchange_rate && formData.code && (
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] text-emerald-400 font-bold animate-pulse">
                                                    MENGAMBIL KURS LIVE...
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-500 italic mt-1">
                                            *Otomatis diupdate dari pasar global saat memilih mata uang di atas.
                                        </p>
                                    </div>
                                </>
                            ) : showModal === 'carrier' ? (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Vendor Logistik</label>
                                        <input type="text" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Contoh: FedEx, DHL, JNE..." required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Template URL Lacak</label>
                                        <input type="text" value={formData.tracking_url_template || ''} onChange={(e) => setFormData({ ...formData, tracking_url_template: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none placeholder:text-gray-700" placeholder="https://jne.co.id/track/{tracking}" required />
                                        <p className="text-[9px] text-gray-600 italic">Gunakan {"{tracking}"} atau {"{awb}"} sebagai placeholder untuk nomor resi.</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Zona</label>
                                            <select value={formData.zone || ''} onChange={(e) => setFormData({ ...formData, zone: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none">
                                                <option value="DOMESTIC">DOMESTIC</option>
                                                <option value="INTERNATIONAL">INTERNATIONAL</option>
                                                <option value="ASIA">ASIA</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Metode</label>
                                            <select value={formData.method || ''} onChange={(e) => setFormData({ ...formData, method: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none">
                                                <option value="AIR">AIR</option>
                                                <option value="SEA">SEA</option>
                                                <optgroup label="Carriers">
                                                    {carriers.map(c => (
                                                        <option key={c.id} value={c.name}>{c.name}</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Biaya Dasar (IDR)</label>
                                            <input type="number" value={formData.base_cost || 0} onChange={(e) => setFormData({ ...formData, base_cost: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Biaya per KG (IDR)</label>
                                            <input type="number" value={formData.cost_per_kg || 0} onChange={(e) => setFormData({ ...formData, cost_per_kg: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Berat (KG)</label>
                                            <input type="number" value={formData.min_charge_weight || 1} onChange={(e) => setFormData({ ...formData, min_charge_weight: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Hari</label>
                                            <input type="number" value={formData.est_days_min || 1} onChange={(e) => setFormData({ ...formData, est_days_min: parseInt(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Maks Hari</label>
                                            <input type="number" value={formData.est_days_max || 7} onChange={(e) => setFormData({ ...formData, est_days_max: parseInt(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                        </div>
                                    </div>
                                </>
                            )}
                            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 mt-4">
                                {showModal === 'carrier' ? 'SIMPAN LOGISTIK' : showModal === 'currency' ? 'SIMPAN MATA UANG' : 'SIMPAN KONFIGURASI'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* International Zone Modal */}
            {showIntlModal === 'zone' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex justify-center items-center z-[110] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-lg border border-white/10 flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between flex-shrink-0">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase">
                                {intlFormData.id ? 'Ubah Zona' : 'Tambah Zona Internasional'}
                            </h3>
                            <button onClick={() => setShowIntlModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-8">
                            <form onSubmit={handleSaveIntlZone} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Zona (Wilayah)</label>
                                    <select
                                        value={intlFormData.name || ''}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const presets = {
                                                'Asia Tenggara (ASEAN)': ['MY', 'SG', 'TH', 'VN', 'PH', 'BN', 'KH', 'LA', 'MM', 'ID', 'TL'],
                                                'Asia Timur': ['JP', 'KR', 'CN', 'HK', 'TW', 'MO', 'MN', 'KP'],
                                                'Asia Selatan': ['IN', 'PK', 'BD', 'LK', 'NP', 'MV', 'BT', 'AF'],
                                                'Timur Tengah': ['SA', 'AE', 'TR', 'QA', 'KW', 'BH', 'OM', 'IQ', 'IR', 'JO', 'LB', 'SY', 'YE', 'IL', 'PS'],
                                                'Eropa (European Union)': ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'],
                                                'Eropa Non-EU': ['GB', 'CH', 'NO', 'IS', 'LI', 'AD', 'MC', 'SM', 'VA', 'RU', 'UA', 'BY', 'MD', 'RS', 'ME', 'BA', 'MK', 'AL'],
                                                'Amerika Serikat & Kanada': ['US', 'CA'],
                                                'Amerika Latin': ['MX', 'BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC', 'GT', 'CU', 'HT', 'BO', 'DO', 'HN', 'PY', 'NI', 'SV', 'CR', 'PA', 'UY', 'JM', 'PR'],
                                                'Australia & Oseania': ['AU', 'NZ', 'PG', 'FJ', 'SB', 'VU', 'WS', 'KI', 'TO', 'FM', 'PW', 'MH', 'TV', 'NR'],
                                                'Afrika': ['ZA', 'EG', 'NG', 'KE', 'MA', 'ET', 'GH', 'TZ', 'DZ', 'SD', 'UG', 'MZ', 'AO', 'CI', 'CM', 'MG', 'ZW', 'SN', 'ML', 'BF', 'RW', 'TN', 'SO', 'TD', 'BI', 'SS', 'BJ', 'GN', 'NE', 'TG', 'SL', 'CF', 'CG', 'LR', 'MR', 'ER', 'GM', 'GW', 'GQ', 'MU', 'DJ', 'KM', 'ST', 'SC', 'CV'],
                                                'Seluruh Dunia': fetchedCountries.map(c => c.code)
                                            };

                                            if (presets[val]) {
                                                setIntlFormData({ ...intlFormData, name: val, countries: presets[val] });
                                            } else {
                                                setIntlFormData({ ...intlFormData, name: val });
                                            }
                                        }}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                        required
                                    >
                                        <option value="" disabled>Pilih nama zona...</option>
                                        <option value="Asia Tenggara (ASEAN)">Asia Tenggara (ASEAN)</option>
                                        <option value="Asia Timur">Asia Timur</option>
                                        <option value="Asia Selatan">Asia Selatan</option>
                                        <option value="Timur Tengah">Timur Tengah</option>
                                        <option value="Eropa (European Union)">Eropa (European Union)</option>
                                        <option value="Eropa Non-EU">Eropa Non-EU</option>
                                        <option value="Amerika Serikat & Kanada">Amerika Serikat & Kanada</option>
                                        <option value="Amerika Latin">Amerika Latin</option>
                                        <option value="Australia & Oseania">Australia & Oseania</option>
                                        <option value="Afrika">Afrika</option>
                                        <option value="Seluruh Dunia">Seluruh Dunia</option>
                                        {intlFormData.name && !['Asia Tenggara (ASEAN)', 'Asia Timur', 'Asia Selatan', 'Timur Tengah', 'Eropa (European Union)', 'Eropa Non-EU', 'Amerika Serikat & Kanada', 'Amerika Latin', 'Australia & Oseania', 'Afrika', 'Seluruh Dunia'].includes(intlFormData.name) && (
                                            <option value={intlFormData.name}>{intlFormData.name}</option>
                                        )}
                                    </select>
                                </div>


                                <div className="space-y-4 relative">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Negara Terpilih</label>
                                    <div
                                        className="p-4 bg-white/5 border border-white/5 rounded-2xl min-h-[60px] flex flex-wrap gap-2 cursor-pointer hover:bg-white/10 transition-colors"
                                        onClick={() => setShowCountryPicker(!showCountryPicker)}
                                    >
                                        {(Array.isArray(intlFormData.countries) ? intlFormData.countries : JSON.parse(intlFormData.countries || '[]')).length === 0 && (
                                            <span className="text-gray-600 text-sm italic">Klik untuk memilih negara...</span>
                                        )}
                                        {(Array.isArray(intlFormData.countries) ? intlFormData.countries : JSON.parse(intlFormData.countries || '[]')).map(code => (
                                            <span key={code} className="flex items-center gap-2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black border border-blue-600/30 animate-in zoom-in-90">
                                                {code}
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const current = Array.isArray(intlFormData.countries) ? intlFormData.countries : JSON.parse(intlFormData.countries || '[]');
                                                        setIntlFormData({ ...intlFormData, countries: current.filter(c => c !== code) });
                                                    }}
                                                    className="hover:text-white"
                                                >
                                                    <HiOutlineX className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>

                                    {/* PENCARIAN NEGARA MENGGUNAKAN FLOW NORMAL, BUKAN ABSOLUTE */}
                                    {showCountryPicker && (
                                        <div className="mt-2 bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="p-4 border-b border-white/5 bg-white/5">
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    placeholder="Cari negara (e.g. Japan, Malaysia)..."
                                                    className="w-full bg-transparent text-sm text-white focus:outline-none"
                                                    value={countrySearch}
                                                    onChange={(e) => setCountrySearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="max-h-[250px] overflow-y-auto p-2 scrollbar-hide">
                                                {fetchedCountries.length === 0 ? (
                                                    <div className="p-4 text-center text-gray-500 text-sm italic animate-pulse">Memuat data negara dari API...</div>
                                                ) : fetchedCountries
                                                    .filter(c =>
                                                        c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                                                        c.code.toLowerCase().includes(countrySearch.toLowerCase())
                                                    )
                                                    .map(country => {
                                                        const current = Array.isArray(intlFormData.countries) ? intlFormData.countries : JSON.parse(intlFormData.countries || '[]');
                                                        const isSelected = current.includes(country.code);
                                                        return (
                                                            <button
                                                                key={country.code}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setIntlFormData({ ...intlFormData, countries: current.filter(c => c !== country.code) });
                                                                    } else {
                                                                        setIntlFormData({ ...intlFormData, countries: [...current, country.code] });
                                                                    }
                                                                }}
                                                                className={`w-full flex items-center justify-between p-3 rounded-xl text-sm transition-all ${isSelected ? 'bg-blue-600/20 text-blue-400 font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-[10px] font-black bg-white/5 px-2 py-1 rounded-md w-8 text-center">{country.code}</span>
                                                                    <span className="text-left">{country.name}</span>
                                                                </div>
                                                                {isSelected && <HiOutlineRefresh className="w-4 h-4 animate-spin-slow rotate-45 flex-shrink-0" />}
                                                            </button>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Kode Pos (Opsional)</label>
                                    <input type="text" value={intlFormData.postal_codes || ''} onChange={(e) => setIntlFormData({ ...intlFormData, postal_codes: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" placeholder="e.g. 10001-20000, 30005" />
                                    <p className="text-[9px] text-gray-600 italic">Bisa spesifik atau range (misal: 10001-20000). Kosongkan jika menggunakan Biteship API.</p>
                                </div>
                                <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/40 mt-4">
                                    {intlFormData.id ? 'PERBARUI ZONA' : 'SIMPAN ZONA BARU'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* International Method Modal */}
            {showIntlModal === 'method' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[111] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase">
                                {intlFormData.id ? 'Ubah Metode' : 'Tambah Metode Pengiriman'}
                            </h3>
                            <button onClick={() => setShowIntlModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveIntlMethod} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Layanan</label>
                                    <input type="text" value={intlFormData.name || ''} onChange={(e) => setIntlFormData({ ...intlFormData, name: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" placeholder="e.g. Standard Air Freight" required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Jenis Logistik</label>
                                    <select value={intlFormData.courier_type || 'AIR'} onChange={(e) => setIntlFormData({ ...intlFormData, courier_type: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none">
                                        <option value="AIR">✈️ AIR (UDARA)</option>
                                        <option value="SHIP">🚢 SHIP (LAUT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Tipe Perhitungan</label>
                                    <select value={intlFormData.calc_type || 'flat'} onChange={(e) => setIntlFormData({ ...intlFormData, calc_type: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none">
                                        <option value="flat">FLAT RATE</option>
                                        <option value="per_kg">PER KILOGRAM</option>
                                        <option value="free_shipping">GRATIS ONGKIR (MINIMAL BELANJA)</option>
                                        <option value="api">🚀 BITESHIP API (OTOMATIS)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                        {intlFormData.calc_type === 'api' ? 'Tarif (Dari API)' : 'Tarif / Harga (Rp)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={intlFormData.calc_type === 'api' ? 0 : (intlFormData.rate || 0)}
                                        onChange={(e) => setIntlFormData({ ...intlFormData, rate: parseFloat(e.target.value) })}
                                        className={`w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none ${intlFormData.calc_type === 'api' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        disabled={intlFormData.calc_type === 'api'}
                                        required={intlFormData.calc_type !== 'api'}
                                    />
                                    {intlFormData.calc_type === 'api' && (
                                        <p className="text-[9px] text-emerald-400 font-bold italic mt-1 animate-pulse">
                                            HARGA AKAN DIHITUNG LIVE OLEH BITESHIP SAAT CHECKOUT.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Weight (KG)</label>
                                    <input type="number" step="0.1" value={intlFormData.min_weight || 1} onChange={(e) => setIntlFormData({ ...intlFormData, min_weight: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" required />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Subtotal (Gratis Ongkir)</label>
                                    <input type="number" value={intlFormData.min_subtotal || 0} onChange={(e) => setIntlFormData({ ...intlFormData, min_subtotal: parseFloat(e.target.value) })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Estimasi Pengiriman (Teks)</label>
                                <input type="text" value={intlFormData.eta_text || ''} onChange={(e) => setIntlFormData({ ...intlFormData, eta_text: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none" placeholder="e.g. 14-21 Business Days" required />
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/40">
                                {intlFormData.id ? 'PERBARUI METODE' : 'SIMPAN METODE BARU'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmationModal
                show={confirmConfig.show}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig({ ...confirmConfig, show: false });
                }}
                onCancel={() => setConfirmConfig({ ...confirmConfig, show: false })}
            />

            <AlertModal
                show={alertConfig.show}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ ...alertConfig, show: false })}
            />
        </div>
    );
};

export default Settings;
