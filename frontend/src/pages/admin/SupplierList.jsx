import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
    HiOutlineOfficeBuilding,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineRefresh,
    HiOutlineSearch,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineUser,
    HiOutlineX
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';

const SupplierList = () => {
    const { hasPermission } = usePermission();
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: ''
    });

    useEffect(() => {
        loadSuppliers();
    }, []);

    const loadSuppliers = async () => {
        setLoading(true);
        try {
            const res = await adminService.getSuppliers();
            setSuppliers(Array.isArray(res) ? res : (res.data || []));
        } catch (error) {
            console.error('Failed to load suppliers', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (supplier = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name,
                contact: supplier.contact,
                email: supplier.email,
                phone: supplier.phone,
                address: supplier.address
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: '',
                contact: '',
                email: '',
                phone: '',
                address: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await adminService.updateSupplier(editingSupplier.id, formData);
            } else {
                await adminService.createSupplier(formData);
            }
            setIsModalOpen(false);
            loadSuppliers();
        } catch (error) {
            showToast.error('Gagal menyimpan pemasok: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Hapus pemasok ini?')) return;
        try {
            await adminService.deleteSupplier(id);
            loadSuppliers();
        } catch (error) {
            showToast.error('Gagal menghapus pemasok: ' + error.message);
        }
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.active !== false) && (
            s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.contact?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Manajemen Pemasok</h2>
                    <p className="text-gray-400 text-sm italic normal-case mt-1">Kelola daftar kontak pemasok resmi Anda</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadSuppliers} className="p-3 glass-card rounded-xl text-gray-400 hover:text-white transition-all">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                    {hasPermission('procurement.manage') && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                        >
                            <HiOutlinePlus className="w-5 h-5" />
                            Tambah Pemasok
                        </button>
                    )}
                </div>
            </div>

            <div className="glass-card p-4 rounded-2xl flex items-center">
                <div className="relative flex-grow">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari nama, email, atau kontak person..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium italic normal-case"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSuppliers.map((supplier) => (
                    <div key={supplier.id} className="glass-card p-6 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-blue-600/10 transition-colors"></div>

                        <div className="flex items-start justify-between relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <HiOutlineOfficeBuilding className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {hasPermission('procurement.manage') && (
                                    <>
                                        <button onClick={() => handleOpenModal(supplier)} className="p-2 bg-white/5 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors">
                                            <HiOutlinePencil className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(supplier.id)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors">
                                            <HiOutlineTrash className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 space-y-4 relative z-10">
                            <div>
                                <h3 className="text-lg font-bold text-white italic normal-case truncate">{supplier.name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-gray-500">
                                    <HiOutlineUser className="w-3 h-3" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{supplier.contact || 'No Contact Person'}</span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 space-y-2">
                                <div className="flex items-center gap-3 text-gray-400 text-xs hover:text-white transition-colors">
                                    <HiOutlineMail className="w-4 h-4 text-blue-500" />
                                    <span className="truncate">{supplier.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400 text-xs hover:text-white transition-colors font-mono">
                                    <HiOutlinePhone className="w-4 h-4 text-emerald-500" />
                                    <span>{supplier.phone || 'N/A'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-lg rounded-[2.5rem] border border-white/10 shadow-2xl p-8 transform animate-in zoom-in-95 duration-500">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white italic normal-case">
                                {editingSupplier ? 'Edit Pemasok' : 'Tambah Pemasok Baru'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:text-white bg-white/5 rounded-lg">
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Nama Perusahaan/Pemasok</label>
                                <input
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 focus:border-blue-500 transition-all outline-none"
                                    placeholder="Contoh: Iron Studios Japan"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Kontak Person</label>
                                    <input
                                        value={formData.contact}
                                        onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 outline-none"
                                        placeholder="Nama PIC"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Nomor Telepon</label>
                                    <input
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 outline-none font-mono"
                                        placeholder="+81..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Alamat Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 outline-none"
                                    placeholder="pemasok@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-1">Alamat Kantor</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl p-4 text-white placeholder:text-gray-700 outline-none min-h-[100px]"
                                    placeholder="Alamat lengkap..."
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <HiOutlinePlus className="w-5 h-5" />
                                {editingSupplier ? 'Simpan Perubahan' : 'Daftarkan Pemasok'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierList;
