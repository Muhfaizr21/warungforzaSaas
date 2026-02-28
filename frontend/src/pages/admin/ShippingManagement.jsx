import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import {
    HiOutlineTruck,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineExclamation,
    HiOutlineGlobeAlt,
    HiOutlineCollection
} from 'react-icons/hi';

import { usePermission } from '../../hooks/usePermission';

const ShippingManagement = () => {
    const { hasPermission } = usePermission();
    const [carriers, setCarriers] = useState([]);
    const [shippingRates, setShippingRates] = useState([]);
    const [intlZones, setIntlZones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('domestic'); // 'domestic' | 'international' | 'cargo'
    const [showModal, setShowModal] = useState(null); // 'carrier' | 'rate' | 'zone' | 'method' | 'cargo'
    const [formData, setFormData] = useState({});
    const [fetchedCountries, setFetchedCountries] = useState([]);
    const [countrySearch, setCountrySearch] = useState('');
    const [showCountryPicker, setShowCountryPicker] = useState(false);
    const [settings, setSettings] = useState({});
    const [saving, setSaving] = useState(false);

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
            const [carriersRes, ratesRes, zonesRes, settingsRes] = await Promise.all([
                adminService.getCarriers(),
                adminService.getShippingRates(),
                adminService.getShippingZones(),
                adminService.getSettings()
            ]);
            setCarriers(Array.isArray(carriersRes) ? carriersRes : (carriersRes?.data || []));
            setShippingRates(Array.isArray(ratesRes) ? ratesRes : (ratesRes?.data || []));
            setIntlZones(Array.isArray(zonesRes) ? zonesRes : (zonesRes?.data || []));

            const settingsArray = Array.isArray(settingsRes) ? settingsRes : (settingsRes?.data || []);
            const settingsObj = {};
            settingsArray.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            setSettings(settingsObj);
        } catch (error) {
            console.error('Failed to load shipping data', error);
            showToast.error("Gagal memuat data pengiriman");
        } finally {
            setLoading(false);
        }
    };

    const handleSyncBiteship = async () => {
        try {
            const res = await adminService.syncCarriers();
            showToast.success(res.message || "Sinkronisasi Biteship berhasil");
            loadData();
        } catch (err) {
            showToast.error("Gagal sinkronisasi dari Biteship");
        }
    };

    const handleToggleCarrier = async (carrier) => {
        try {
            await adminService.updateCarrier(carrier.id, { active: !carrier.active });
            showToast.success(`${carrier.name} ${!carrier.active ? 'diaktifkan' : 'dinonaktifkan'}`);
            loadData();
        } catch (err) {
            showToast.error("Gagal memperbarui status kurir");
        }
    };

    const handleToggleService = async (carrierId, service) => {
        try {
            await adminService.updateCarrierService(carrierId, service.id, { active: !service.active });
            showToast.success(`Layanan ${service.name} diperbarui`);
            loadData();
        } catch (err) {
            showToast.error("Gagal memperbarui layanan");
        }
    };

    const handleToggleCargoMaster = async () => {
        const newValue = settings.cargo_logistics_enabled === 'true' ? 'false' : 'true';
        setSaving(true);
        try {
            await adminService.updateSetting({
                key: 'cargo_logistics_enabled',
                value: newValue,
                group: 'shipping'
            });
            setSettings({ ...settings, cargo_logistics_enabled: newValue });
            showToast.success(`Modul Ship & On-Air ${newValue === 'true' ? 'diaktifkan' : 'dinonaktifkan'}`);
        } catch (error) {
            showToast.error("Gagal memperbarui pengaturan");
        } finally {
            setSaving(false);
        }
    };

    const handleToggleBiteshipMaster = async () => {
        const newValue = settings.biteship_enabled === 'false' ? 'true' : 'false';
        setSaving(true);
        try {
            await adminService.updateSetting({
                key: 'biteship_enabled',
                value: newValue,
                group: 'shipping'
            });
            setSettings({ ...settings, biteship_enabled: newValue });
            showToast.success(`Integrasi Biteship ${newValue === 'true' ? 'diaktifkan' : 'dinonaktifkan'}`);
        } catch (error) {
            showToast.error("Gagal memperbarui pengaturan");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold text-xs uppercase tracking-widest animate-pulse">Memuat Pusat Pengiriman...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/5 p-8 rounded-[40px] border border-white/5 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl">
                            <HiOutlineTruck className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-black text-white italic tracking-tight">LOGISTIK & PENGIRIMAN</h1>
                    </div>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em] ml-1">Pusat Kendali Pengiriman Nasional & Internasional</p>
                    <p className="text-gray-500 text-[11px] mt-2 max-w-xl italic leading-relaxed">
                        Kelola seluruh alur logistik toko Anda mulai dari integrasi kurir API Biteship (JNE, SiCepat, dll) hingga pengaturan tarif kustom untuk pengiriman ke luar negeri.
                    </p>
                </div>

                <div className="flex gap-2 relative z-10 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('domestic')}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === 'domestic' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Domestik (Biteship)
                    </button>
                    <button
                        onClick={() => setActiveTab('cargo')}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === 'cargo' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Ship & On-Air (Lokal)
                    </button>
                    <button
                        onClick={() => setActiveTab('international')}
                        className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${activeTab === 'international' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
                    >
                        Internasional (Zona)
                    </button>
                </div>
            </div>

            {activeTab === 'domestic' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Biteship Info Card */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <HiOutlineCollection className="w-24 h-24" />
                                </div>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <h3 className="text-white font-bold text-lg italic flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full animate-pulse ${settings.biteship_enabled === 'false' ? 'bg-rose-500' : 'bg-blue-500'}`}></span>
                                                Integrasi Biteship Live
                                            </h3>
                                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">
                                                STATUS: {settings.biteship_enabled === 'false' ? 'NON-AKTIF' : 'TERHUBUNG VIA API KEY'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/5">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master</span>
                                            <button
                                                onClick={handleToggleBiteshipMaster}
                                                disabled={saving}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-500 focus:outline-none ${settings.biteship_enabled === 'false' ? 'bg-gray-700' : 'bg-blue-600'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-500 ${settings.biteship_enabled === 'false' ? 'translate-x-1' : 'translate-x-6'}`} />
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSyncBiteship}
                                        disabled={settings.biteship_enabled === 'false'}
                                        className={`flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all text-xs font-bold uppercase tracking-widest shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        <HiOutlineRefresh className="w-4 h-4" />
                                        Sync Ulang Biteship
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {carriers.map((carrier) => (
                                        <div key={carrier.id} className="p-5 glass-card rounded-3xl border border-white/5 flex flex-col gap-4 group/card hover:border-blue-500/30 transition-all hover:bg-white/[0.02]">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white font-bold text-sm italic">{carrier.name}</p>
                                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{carrier.biteship_code || 'Standard'}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleCarrier(carrier)}
                                                    className={`w-12 h-6 rounded-full relative transition-all duration-500 ${carrier.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/10'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-500 ${carrier.active ? 'left-[26px]' : 'left-1'}`}></div>
                                                </button>
                                            </div>

                                            {carrier.services && carrier.services.length > 0 && carrier.active && (
                                                <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-2.5">
                                                    {carrier.services.map(svc => (
                                                        <div key={svc.id} className="flex items-center justify-between pl-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-[11px] text-gray-200 font-bold">{svc.name}</span>
                                                                {svc.description && (
                                                                    <span className="text-[9px] text-gray-500 italic leading-tight mt-0.5">{svc.description}</span>
                                                                )}
                                                                <span className="text-[8px] uppercase text-gray-600 font-black tracking-wider mt-1">{svc.service_code}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleService(carrier.id, svc)}
                                                                className={`w-8 h-4 rounded-full relative transition-all duration-300 ${svc.active ? 'bg-blue-500' : 'bg-white/5'}`}
                                                            >
                                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-300 ${svc.active ? 'left-[18px]' : 'left-0.5'}`}></div>
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-rose-500/5 rounded-[32px] p-8 border border-rose-500/10 backdrop-blur-sm">
                                <h4 className="text-rose-400 font-bold text-sm italic flex items-center gap-2 mb-4">
                                    <HiOutlineExclamation className="w-5 h-5" />
                                    PENTING!
                                </h4>
                                <p className="text-[11px] text-gray-400 leading-relaxed italic">
                                    Pastikan Kode Pos Toko sudah diatur di <span className="text-white font-bold underline">Pengaturan Umum</span>. Biteship memerlukan asal pengiriman yang valid untuk menghitung ongkos kirim.
                                </p>
                                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-2">Tips Kurir:</p>
                                    <p className="text-[10px] text-gray-400 leading-relaxed">Aktifkan hanya kurir yang bekerja sama dengan Anda untuk menjaga kualitas pengiriman tetap terkontrol.</p>
                                </div>
                            </div>

                            {/* Custom Domestic Fallback */}
                            <div className="bg-white/5 rounded-[32px] p-8 border border-white/5">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h4 className="text-white font-bold text-sm italic">Tarif Kustom (Fallback)</h4>
                                        <p className="text-[9px] text-gray-500 font-black tracking-widest uppercase mt-1">Cadangan jika API bermasalah</p>
                                    </div>
                                    <button onClick={() => { setShowModal('fallback'); setFormData({ zone: 'INDONESIA', method: 'JNE', base_cost: 0, cost_per_kg: 20000, est_days_min: 1, est_days_max: 3, min_charge_weight: 1 }); }} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-600/20">
                                        <HiOutlinePlus className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {shippingRates.filter(r => r.zone === 'INDONESIA').length === 0 && (
                                        <p className="text-center py-6 text-[10px] text-gray-600 italic font-black uppercase tracking-widest border-2 border-dashed border-white/5 rounded-2xl">Belum ada tarif cadangan</p>
                                    )}
                                    {shippingRates.filter(r => r.zone === 'INDONESIA').map(rate => (
                                        <div key={rate.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                                            <div>
                                                <p className="text-white font-bold text-xs italic">{rate.method}</p>
                                                <p className="text-[9px] text-emerald-400 font-black">Rp {rate.cost_per_kg?.toLocaleString()}/kg  <span className="text-gray-500 font-medium ml-1">({rate.min_charge_weight}kg min)</span></p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setFormData(rate); setShowModal('fallback'); }} className="p-2 text-gray-500 hover:text-white transition-colors">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            if (window.confirm('Hapus tarif ini?')) {
                                                                await adminService.deleteShippingRate(rate.id);
                                                                showToast.success("Tarif cadangan dihapus");
                                                                loadData();
                                                            }
                                                        } catch (err) {
                                                            showToast.error("Gagal menghapus tarif: " + (err.response?.data?.error || err.message));
                                                        }
                                                    }}
                                                    className="p-2 text-gray-600 hover:text-rose-500 transition-colors"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'cargo' ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="bg-white/5 rounded-[40px] p-8 md:p-12 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/5 blur-[120px] -mr-48 -mt-48"></div>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
                            <div className="flex-grow">
                                <h3 className="text-white font-black text-2xl italic flex items-center gap-3">
                                    <HiOutlineTruck className="w-8 h-8 text-emerald-400" />
                                    LOGISTIK LOKAL (SHIP & ON-AIR)
                                </h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">KHUSUS PENGIRIMAN DOMESTIK INDONESIA</p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/5 p-4 rounded-3xl border border-white/5">
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Status Modul</p>
                                    <p className={`text-[10px] font-black uppercase ${settings.cargo_logistics_enabled === 'true' ? 'text-emerald-400' : 'text-rose-500'}`}>
                                        {settings.cargo_logistics_enabled === 'true' ? 'AKTIF' : 'NON-AKTIF'}
                                    </p>
                                </div>
                                <button
                                    onClick={handleToggleCargoMaster}
                                    disabled={saving}
                                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500 focus:outline-none ${settings.cargo_logistics_enabled === 'true' ? 'bg-emerald-600' : 'bg-gray-700'}`}
                                >
                                    <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-all duration-500 ${settings.cargo_logistics_enabled === 'true' ? 'translate-x-7' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <button
                                onClick={() => { setShowModal('rate'); setFormData({ zone: 'CARGO', method: 'AIR', base_cost: 0, cost_per_kg: 150000 }); }}
                                className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-emerald-600/20"
                            >
                                <HiOutlinePlus className="w-4 h-4" />
                                Tambah Layanan Cargo
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                            {shippingRates.filter(r => r.zone === 'CARGO' || (r.method === 'AIR' || r.method === 'SHIP')).length === 0 && (
                                <div className="col-span-full py-20 text-center border-4 border-dashed border-white/5 rounded-[40px]">
                                    <HiOutlineTruck className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                                    <p className="text-gray-500 font-black text-xs uppercase tracking-widest">Belum ada pengaturan Cargo.</p>
                                    <p className="text-gray-600 text-[10px] mt-2 italic">Tambahkan "By Air" atau "By Ship" untuk pengiriman manual.</p>
                                </div>
                            )}

                            {shippingRates.filter(r => r.zone === 'CARGO' || (r.method === 'AIR' || r.method === 'SHIP' || r.method === 'SEA')).map(rate => (
                                <div key={rate.id} className="glass-card rounded-[2.5rem] p-8 border border-white/5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-colors"></div>
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="p-4 bg-white/5 rounded-3xl text-emerald-400 group-hover:scale-110 transition-transform">
                                            {rate.method === 'AIR' ? <span className="text-2xl">✈️</span> : <span className="text-2xl">🚢</span>}
                                        </div>
                                        <div className="flex gap-2 relative z-10">
                                            <button onClick={() => { setFormData(rate); setShowModal('rate'); }} className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                                                <HiOutlinePencil className="w-5 h-5 pointer-events-none" />
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        if (window.confirm(`Hapus layanan ${rate.method}?`)) {
                                                            await adminService.deleteShippingRate(rate.id);
                                                            showToast.success(`Layanan ${rate.method} dihapus`);
                                                            loadData();
                                                        }
                                                    } catch (err) {
                                                        showToast.error("Gagal menghapus layanan: " + (err.response?.data?.error || err.message));
                                                    }
                                                }}
                                                className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                            >
                                                <HiOutlineTrash className="w-5 h-5 pointer-events-none" />
                                            </button>
                                        </div>
                                    </div>

                                    <h4 className="text-white font-black text-lg italic uppercase tracking-tight">
                                        {rate.method === 'AIR' ? 'VIA AIR (ON-AIR)' : rate.method === 'SHIP' || rate.method === 'SEA' ? 'VIA SHIP (LAUT)' : rate.method}
                                    </h4>
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">Estimasi: {rate.est_days_min}-{rate.est_days_max} Hari</p>

                                    <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Harga Dasar</span>
                                            <span className="text-white font-bold">Rp {rate.base_cost?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Per KG</span>
                                            <span className="text-emerald-400 font-black text-xl italic tabular-nums">Rp {rate.cost_per_kg?.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-end pt-2">
                                            <span className="text-[10px] text-gray-600 font-black uppercase tracking-widest">Min Berat</span>
                                            <span className="text-gray-400 text-xs font-bold">{rate.min_charge_weight || 1} KG</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    {/* International Logic ... (SIMPLIFIED FOR NOW TO FOCUS ON UI RESTRUCTURING) */}
                    <div className="bg-white/5 rounded-[32px] p-12 border border-white/5 text-center">
                        <HiOutlineGlobeAlt className="w-16 h-16 text-blue-500 mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold text-white italic">Pengiriman Internasional (Dunia)</h3>
                        <p className="text-gray-500 text-xs mt-2 max-w-lg mx-auto leading-relaxed">
                            Modul ini memungkinkan Anda membuat zona kustom (misal: ASEAN, Europe) dan menentukan biaya per kg untuk pembeli di luar Indonesia.
                        </p>
                        <button
                            onClick={() => showToast.info("Fitur kustom zona internasional dapat diakses melalui tombol tambah zona di bawah.")}
                            className="mt-8 px-8 py-3 bg-white/5 text-white rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all text-[11px] uppercase tracking-widest"
                        >
                            Konfigurasi Zona Sekarang
                        </button>
                    </div>

                    <div className="flex border-b border-white/5 mb-6">
                        <h2 className="pb-4 text-white font-black italic tracking-tight border-b-2 border-blue-500">DAFTAR ZONA TERDAFTAR</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {intlZones.map(zone => (
                            <div key={zone.id} className="bg-white/5 rounded-[32px] p-8 border border-white/5 group hover:border-blue-500/30 transition-all">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h4 className="text-white font-black text-lg italic uppercase">{zone.name}</h4>
                                        <p className="text-[9px] text-gray-500 font-bold mt-1 uppercase tracking-widest">{JSON.parse(zone.countries || '[]').length} Negara Tercakup</p>
                                    </div>
                                    <div className="flex gap-2 relative z-10">
                                        <button onClick={() => { setFormData({ ...zone, countries: JSON.parse(zone.countries || '[]') }); setShowModal('zone'); }} className="p-3 bg-white/5 text-gray-400 rounded-xl hover:text-white hover:bg-white/10 transition-all cursor-pointer">
                                            <HiOutlinePencil className="w-4 h-4 pointer-events-none" />
                                        </button>
                                        <button onClick={async () => {
                                            try {
                                                if (window.confirm(`Hapus zona ${zone.name}?`)) {
                                                    await adminService.deleteShippingZone(zone.id);
                                                    showToast.success(`Zona ${zone.name} dihapus`);
                                                    loadData();
                                                }
                                            } catch (err) {
                                                showToast.error("Gagal menghapus zona");
                                            }
                                        }} className="p-3 bg-white/5 text-gray-400 rounded-xl hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer">
                                            <HiOutlineTrash className="w-4 h-4 pointer-events-none" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {zone.methods?.map(method => (
                                        <div key={method.id} className="p-4 bg-white/5 rounded-2xl flex items-center justify-between group">
                                            <div>
                                                <span className="text-xs text-gray-300 font-bold italic block">{method.name} ({method.courier_type})</span>
                                                <span className="text-[11px] font-black text-emerald-400">Rp {method.rate?.toLocaleString()}/kg</span>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setFormData({ ...method, zone_id: zone.id }); setShowModal('intl_method'); }} className="p-2 text-gray-500 hover:text-white transition-colors">
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                                <button onClick={async () => {
                                                    if (window.confirm("Hapus metode ini?")) {
                                                        await adminService.deleteShippingMethod(method.id);
                                                        loadData();
                                                    }
                                                }} className="p-2 text-gray-600 hover:text-rose-500 transition-colors">
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={() => { setFormData({ zone_id: zone.id, courier_type: 'AIR', calc_type: 'per_kg' }); setShowModal('intl_method'); }} className="w-full py-3 border-2 border-dashed border-white/5 rounded-2xl text-[10px] font-black uppercase text-gray-600 hover:text-blue-500 hover:border-blue-500/20 transition-all">
                                        + Tambah Metode
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button onClick={() => { setShowModal('zone'); setFormData({ countries: [], is_active: true }); }} className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-white/5 rounded-[40px] hover:bg-white/[0.02] hover:border-blue-500/20 transition-all group">
                            <div className="p-4 bg-white/5 rounded-3xl mb-4 group-hover:scale-110 transition-transform">
                                <HiOutlinePlus className="w-8 h-8 text-gray-600 group-hover:text-blue-500" />
                            </div>
                            <span className="text-xs font-black uppercase text-gray-600 tracking-widest group-hover:text-white">Tambah Zona Baru</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Cargo/Rate Modal */}
            {showModal === 'rate' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase">
                                {formData.id ? 'Ubah Layanan Cargo' : 'Tambah Layanan Cargo'}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                // Bersihkan data untuk menghindari masalah parsing di Backend
                                const payload = {
                                    ...formData,
                                    cost_per_kg: parseFloat(formData.cost_per_kg || 0),
                                    base_cost: parseFloat(formData.base_cost || 0),
                                    min_charge_weight: parseFloat(formData.min_charge_weight || 1),
                                    est_days_min: parseInt(formData.est_days_min || 1),
                                    est_days_max: parseInt(formData.est_days_max || 7),
                                };
                                delete payload.created_at;
                                delete payload.updated_at;

                                if (formData.id) {
                                    await adminService.updateShippingRate(formData.id, payload);
                                    showToast.success("Layanan Cargo berhasil diperbarui");
                                } else {
                                    await adminService.createShippingRate(payload);
                                    showToast.success("Layanan Cargo berhasil ditambahkan");
                                }
                                setShowModal(null);
                                loadData();
                            } catch (err) {
                                showToast.error("Gagal menyimpan: " + (err.response?.data?.error || err.message));
                            }
                        }} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Jenis Logistik</label>
                                    <select
                                        value={formData.method || 'AIR'}
                                        onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 appearance-none"
                                    >
                                        <option value="AIR">✈️ BY AIR (UDARA)</option>
                                        <option value="SHIP">🚢 BY SHIP (LAUT)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Grup Zona</label>
                                    <select
                                        value="CARGO"
                                        disabled
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white opacity-70 cursor-not-allowed appearance-none mix-blend-luminosity"
                                    >
                                        <option value="CARGO">📦 LOKAL CARGO (ANTAR PULAU)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Harga per KG (Rp)</label>
                                    <input
                                        type="number"
                                        value={formData.cost_per_kg || 0}
                                        onChange={(e) => setFormData({ ...formData, cost_per_kg: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        placeholder="e.g. 150000"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Biaya Tetap / Base (Rp)</label>
                                    <input
                                        type="number"
                                        value={formData.base_cost || 0}
                                        onChange={(e) => setFormData({ ...formData, base_cost: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        placeholder="Biaya admin/handling"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Berat Min (KG)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.min_charge_weight || 1}
                                        onChange={(e) => setFormData({ ...formData, min_charge_weight: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Est Hari Min</label>
                                    <input
                                        type="number"
                                        value={formData.est_days_min || 1}
                                        onChange={(e) => setFormData({ ...formData, est_days_min: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Est Hari Maks</label>
                                    <input
                                        type="number"
                                        value={formData.est_days_max || 7}
                                        onChange={(e) => setFormData({ ...formData, est_days_max: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/40 mt-4">
                                {formData.id ? 'PERBARUI LAYANAN' : 'SIMPAN LAYANAN CARGO'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Fallback Custom Biteship Equivalent Modal */}
            {showModal === 'fallback' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-blue-600/10">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase text-blue-500">
                                {formData.id ? 'Ubah Tarif Cadangan' : 'Tambah Tarif Cadangan'}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!formData.method || formData.method.trim() === '') {
                                showToast.error("Nama Ekspedisi wajib diisi!");
                                return;
                            }
                            try {
                                const payload = {
                                    ...formData,
                                    zone: 'INDONESIA', // Fix it to Indonesia to be caught by Biteship fallback logical
                                    cost_per_kg: parseFloat(formData.cost_per_kg || 0),
                                    base_cost: parseFloat(formData.base_cost || 0),
                                    min_charge_weight: parseFloat(formData.min_charge_weight || 1),
                                    est_days_min: parseInt(formData.est_days_min || 1),
                                    est_days_max: parseInt(formData.est_days_max || 3),
                                };
                                delete payload.created_at;
                                delete payload.updated_at;

                                if (formData.id) {
                                    await adminService.updateShippingRate(formData.id, payload);
                                    showToast.success("Tarif cadangan berhasil diperbarui");
                                } else {
                                    await adminService.createShippingRate(payload);
                                    showToast.success("Tarif cadangan berhasil ditambahkan");
                                }
                                setShowModal(null);
                                loadData();
                            } catch (err) {
                                showToast.error("Gagal menyimpan: " + (err.response?.data?.error || err.message));
                            }
                        }} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Ekspedisi / Kurir</label>
                                <input
                                    type="text"
                                    value={formData.method || ''}
                                    onChange={(e) => setFormData({ ...formData, method: e.target.value.toUpperCase() })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 uppercase"
                                    placeholder="Contoh: JNE REG, SICEPAT HALU, J&T EZ"
                                    required
                                />
                                <p className="text-[9px] text-gray-500 italic mt-1">Nama ini akan meniru (samain dengan) kurir yang aslinya gagal dipanggil API.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Harga per KG (Rp)</label>
                                    <input
                                        type="number"
                                        value={formData.cost_per_kg || 0}
                                        onChange={(e) => setFormData({ ...formData, cost_per_kg: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Berat (KG)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.min_charge_weight || 1}
                                        onChange={(e) => setFormData({ ...formData, min_charge_weight: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Estimasi Min (Hari)</label>
                                    <input
                                        type="number"
                                        value={formData.est_days_min || 1}
                                        onChange={(e) => setFormData({ ...formData, est_days_min: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Estimasi Maks (Hari)</label>
                                    <input
                                        type="number"
                                        value={formData.est_days_max || 3}
                                        onChange={(e) => setFormData({ ...formData, est_days_max: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/40 mt-4">
                                {formData.id ? 'PERBARUI CADANGAN' : 'SIMPAN TARIF CADANGAN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Tambah/Edit Zona Internasional */}
            {showModal === 'zone' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-blue-600/10">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase text-blue-500">
                                {formData.id ? 'Ubah Zona' : 'Tambah Zona'}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const payload = {
                                    ...formData,
                                    countries: JSON.stringify(formData.countries || [])
                                };
                                delete payload.created_at;
                                delete payload.updated_at;
                                delete payload.methods;
                                if (formData.id) {
                                    await adminService.updateShippingZone(formData.id, payload);
                                    showToast.success("Zona diperbarui");
                                } else {
                                    await adminService.createShippingZone(payload);
                                    showToast.success("Zona dibuat");
                                }
                                setShowModal(null);
                                loadData();
                            } catch (err) {
                                showToast.error("Gagal menyimpan zona");
                            }
                        }} className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Zona (Bebas / Pilih Template)</label>
                                <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50 uppercase italic font-bold"
                                    placeholder="Contoh: ASIA TENGGARA"
                                    required
                                />
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {['ASEAN', 'ASIA (LUAR ASEAN)', 'EROPA (EUROPE)', 'AMERIKA (USA/CAN)', 'TIMUR TENGAH', 'AUSTRALIA & OCEANIA'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, name: t })}
                                            className="px-3 py-1.5 bg-blue-500/10 text-[9px] font-black tracking-widest uppercase text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-3 relative">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Negara Tercakup</label>
                                <div
                                    className="w-full min-h-[60px] bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap gap-2 cursor-pointer focus-within:border-blue-500/50"
                                    onClick={() => setShowCountryPicker(true)}
                                >
                                    {(formData.countries || []).map(cc => {
                                        const cName = fetchedCountries.find(x => x.code === cc)?.name || cc;
                                        return (
                                            <span key={cc} className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-lg flex items-center gap-2">
                                                {cName}
                                                <button type="button" onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFormData({ ...formData, countries: formData.countries.filter(x => x !== cc) });
                                                }} className="hover:text-white"><HiOutlineX /></button>
                                            </span>
                                        );
                                    })}
                                    <input type="text" placeholder={(formData.countries || []).length === 0 ? "Pilih negara..." : ""} className="bg-transparent border-none outline-none text-white text-sm flex-1" value={countrySearch} onChange={e => { setCountrySearch(e.target.value); setShowCountryPicker(true); }} />
                                </div>

                                {showCountryPicker && (
                                    <div className="absolute top-full left-0 w-full mt-2 glass-card rounded-2xl border border-white/10 max-h-60 overflow-y-auto z-50 p-2 shadow-2xl">
                                        <div className="p-2 border-b border-white/5 flex justify-between">
                                            <span className="text-xs font-bold text-gray-400">Pilih Negara</span>
                                            <button type="button" onClick={() => setShowCountryPicker(false)} className="text-gray-500"><HiOutlineX /></button>
                                        </div>
                                        {fetchedCountries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                                            <div
                                                key={c.code}
                                                className={`p-3 text-sm cursor-pointer hover:bg-white/10 rounded-xl transition-all ${(formData.countries || []).includes(c.code) ? 'text-blue-400 font-bold bg-blue-500/10' : 'text-gray-300'}`}
                                                onClick={() => {
                                                    const arr = formData.countries || [];
                                                    if (!arr.includes(c.code)) setFormData({ ...formData, countries: [...arr, c.code] });
                                                    setCountrySearch('');
                                                    setShowCountryPicker(false);
                                                }}
                                            >
                                                {c.name} ({c.code})
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-blue-500/40 mt-4">
                                {formData.id ? 'PERBARUI ZONA' : 'SIMPAN ZONA BARU'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Tambah/Edit Metode Internasional */}
            {showModal === 'intl_method' && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[110] p-4">
                    <div className="glass-card rounded-[3rem] w-full max-w-xl border border-white/10 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-white/5 flex items-center justify-between bg-emerald-600/10">
                            <h3 className="text-white font-black text-2xl tracking-tighter italic uppercase text-emerald-500">
                                {formData.id ? 'Ubah Metode Internasional' : 'Tambah Metode Internasional'}
                            </h3>
                            <button onClick={() => setShowModal(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-8 h-8" />
                            </button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const payload = {
                                    ...formData,
                                    rate: parseFloat(formData.rate || 0),
                                    min_weight: parseFloat(formData.min_weight || 1)
                                };
                                delete payload.created_at;
                                delete payload.updated_at;
                                if (formData.id) {
                                    await adminService.updateShippingMethod(formData.id, payload);
                                    showToast.success("Metode diperbarui");
                                } else {
                                    await adminService.createShippingMethod(payload);
                                    showToast.success("Metode dibuat");
                                }
                                setShowModal(null);
                                loadData();
                            } catch (err) {
                                showToast.error("Gagal menyimpan metode");
                            }
                        }} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Layanan</label>
                                    <input
                                        type="text"
                                        value={formData.name || ''}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50"
                                        placeholder="FedEx / DHL"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Courier Type</label>
                                    <select
                                        value={formData.courier_type || 'AIR'}
                                        onChange={e => setFormData({ ...formData, courier_type: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                    >
                                        <option value="AIR">✈️ AIR (UDARA)</option>
                                        <option value="SHIP">🚢 SHIP (LAUT)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Harga per KG (Rp)</label>
                                    <input
                                        type="number"
                                        value={formData.rate || 0}
                                        onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Min Berat (KG)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.min_weight || 1}
                                        onChange={e => setFormData({ ...formData, min_weight: parseFloat(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Baris Info (Estimasi)</label>
                                <input
                                    type="text"
                                    value={formData.eta_text || ''}
                                    onChange={e => setFormData({ ...formData, eta_text: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none"
                                    placeholder="Contoh: 15-30 Hari"
                                    required
                                />
                            </div>

                            <button type="submit" className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-2xl shadow-emerald-500/40 mt-4">
                                {formData.id ? 'PERBARUI METODE' : 'SIMPAN METODE PENGIRIMAN'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShippingManagement;
