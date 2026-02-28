import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import {
    HiOutlineTag,
    HiOutlineCube,
    HiOutlineUsers,
    HiOutlineCollection,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineRefresh,
    HiOutlineColorSwatch,
    HiOutlineScale,
    HiOutlineHashtag,
    HiOutlineX,
    HiOutlineCheck
} from 'react-icons/hi';

import { usePermission } from '../../hooks/usePermission';
import ConfirmationModal from '../../components/ConfirmationModal';
import AlertModal from '../../components/AlertModal';

const TaxonomyManagement = () => {
    const { hasPermission } = usePermission();
    const [activeTab, setActiveTab] = useState('categories');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemName, setItemName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, title: '', message: '', onConfirm: null });
    const [alertConfig, setAlertConfig] = useState({ show: false, title: '', message: '', type: 'info' });

    const TABS = [
        { id: 'categories', label: 'Kategori', icon: HiOutlineTag },
        { id: 'brands', label: 'Merek', icon: HiOutlineCube },
        { id: 'series', label: 'Seri/Waralaba', icon: HiOutlineCollection },
        { id: 'characters', label: 'Karakter', icon: HiOutlineUsers },
        { id: 'genres', label: 'Genre', icon: HiOutlineColorSwatch },
        { id: 'scales', label: 'Skala', icon: HiOutlineScale },
        { id: 'materials', label: 'Material', icon: HiOutlineHashtag },
        { id: 'editionTypes', label: 'Tipe Edisi', icon: HiOutlineCheck },
    ];

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            let res;
            switch (activeTab) {
                case 'categories': res = await adminService.getCategories(); break;
                case 'brands': res = await adminService.getBrands(); break;
                case 'series': res = await adminService.getSeries(); break;
                case 'characters': res = await adminService.getCharacters(); break;
                case 'genres': res = await adminService.getGenres(); break;
                case 'scales': res = await adminService.getScales(); break;
                case 'materials': res = await adminService.getMaterials(); break;
                case 'editionTypes': res = await adminService.getEditionTypes(); break;
                default: break;
            }
            setData(Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
        } catch (error) {
            console.error("Failed to load taxonomy data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!itemName.trim()) return;
        setIsSubmitting(true);
        try {
            const payload = { name: itemName.trim() };
            if (editingItem) {
                switch (activeTab) {
                    case 'categories': await adminService.updateCategory(editingItem.id, payload); break;
                    case 'brands': await adminService.updateBrand(editingItem.id, payload); break;
                    case 'series': await adminService.updateSeries(editingItem.id, payload); break;
                    case 'characters': await adminService.updateCharacter(editingItem.id, payload); break;
                    case 'genres': await adminService.updateGenre(editingItem.id, payload); break;
                    case 'scales': await adminService.updateScale(editingItem.id, payload); break;
                    case 'materials': await adminService.updateMaterial(editingItem.id, payload); break;
                    case 'editionTypes': await adminService.updateEditionType(editingItem.id, payload); break;
                    default:
                        setAlertConfig({ show: true, title: 'Batas Sistem', message: "Pembaruan belum didukung untuk tipe ini oleh sistem backend.", type: 'info' });
                        break;
                }
            } else {
                switch (activeTab) {
                    case 'categories': await adminService.createCategory(payload); break;
                    case 'brands': await adminService.createBrand(payload); break;
                    case 'series': await adminService.createSeries(payload); break;
                    case 'characters': await adminService.createCharacter(payload); break;
                    case 'genres': await adminService.createGenre(payload); break;
                    case 'scales': await adminService.createScale(payload); break;
                    case 'materials': await adminService.createMaterial(payload); break;
                    case 'editionTypes': await adminService.createEditionType(payload); break;
                    default: break;
                }
            }
            setIsModalOpen(false);
            setEditingItem(null);
            setItemName('');
            loadData();
        } catch (error) {
            setAlertConfig({ show: true, title: 'Gagal Menyimpan', message: error.response?.data?.error || error.message, type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        setConfirmConfig({
            show: true,
            title: 'Hapus Master Data',
            message: 'Yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.',
            onConfirm: async () => {
                try {
                    switch (activeTab) {
                        case 'categories': await adminService.deleteCategory(id); break;
                        case 'brands': await adminService.deleteBrand(id); break;
                        case 'series': await adminService.deleteSeries(id); break;
                        case 'characters': await adminService.deleteCharacter(id); break;
                        case 'genres': await adminService.deleteGenre(id); break;
                        case 'scales': await adminService.deleteScale(id); break;
                        case 'materials': await adminService.deleteMaterial(id); break;
                        case 'editionTypes': await adminService.deleteEditionType(id); break;
                        default: break;
                    }
                    loadData();
                } catch (error) {
                    setAlertConfig({ show: true, title: 'Gagal', message: error.response?.data?.error || error.message, type: 'error' });
                }
            }
        });
    };

    const filteredData = data.filter(item =>
        item.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700">
            <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Manajemen Taksonomi</h2>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Kelola data master untuk kategori, merek, karakter, dan lainnya.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-3xl border border-white/5 mb-8 overflow-x-auto custom-scrollbar">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-grow w-full md:max-w-md">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder={`Cari ${TABS.find(t => t.id === activeTab).label}...`}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium italic normal-case"
                    />
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={loadData}
                        className="p-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-all border border-white/5"
                    >
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                    {hasPermission('taxonomy.manage') && (
                        <button
                            onClick={() => { setEditingItem(null); setItemName(''); setIsModalOpen(true); }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                        >
                            <HiOutlinePlus className="w-5 h-5" />
                            Tambah Baru
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 glass-card rounded-3xl h-96">
                    <div className="w-12 h-12 border-b-2 border-blue-500 rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest animate-pulse italic">Menarik Data Master...</p>
                </div>
            ) : filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredData.map((item) => (
                        <div key={item.id} className="glass-card p-5 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all animate-in zoom-in-95 duration-300">
                            <div className="flex flex-col">
                                <span className="text-white font-bold text-sm italic">{item.name}</span>
                                <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest mt-1">ID: {item.id}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission('taxonomy.manage') && (
                                    <button
                                        onClick={() => { setEditingItem(item); setItemName(item.name); setIsModalOpen(true); }}
                                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                        title="Ubah"
                                    >
                                        <HiOutlinePencil className="w-4 h-4" />
                                    </button>
                                )}
                                {hasPermission('taxonomy.manage') && (
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                                        title="Hapus"
                                    >
                                        <HiOutlineTrash className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card rounded-3xl p-20 text-center flex flex-col items-center border border-white/5 h-96 justify-center">
                    <p className="text-gray-500 italic text-sm">Tidak ada data ditemukan untuk kategori ini.</p>
                </div>
            )}

            {/* Action Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-[#0B0F1A] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="text-white font-bold text-lg italic">
                                {editingItem ? 'Perbarui Item' : 'Tambah Item Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama {TABS.find(t => t.id === activeTab).label}</label>
                                <input
                                    autoFocus
                                    type="text"
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="Masukkan nama..."
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500 italic normal-case"
                                    required
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 text-gray-400 hover:text-white transition-all border border-white/5"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !itemName.trim()}
                                    className="flex-1 px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
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

export default TaxonomyManagement;
