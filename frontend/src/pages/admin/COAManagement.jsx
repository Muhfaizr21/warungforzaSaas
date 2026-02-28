import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
    HiOutlineChartBar,
    HiOutlinePlus,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlinePencil,
    HiOutlineFolder,
    HiOutlineFolderOpen,
    HiChevronRight,
    HiChevronDown,
    HiOutlineSearch,
    HiOutlinePlusCircle,
    HiOutlineTrash
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';
import AlertModal from '../../components/AlertModal';

const JournalModal = React.memo(({ show, coas, onCancel, onSubmit }) => {
    const [form, setForm] = useState({
        description: '',
        date: new Date().toISOString().split('T')[0],
        items: [
            { coa_id: '', debit: '', credit: '' },
            { coa_id: '', debit: '', credit: '' }
        ]
    });

    const addItem = () => setForm(prev => ({
        ...prev,
        items: [...prev.items, { coa_id: '', debit: '', credit: '' }]
    }));

    const removeItem = (index) => setForm(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
    }));

    const updateItem = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        // If debit is filled, clear credit and vice versa (usually standard entry)
        if (field === 'debit' && value > 0) newItems[index].credit = '';
        if (field === 'credit' && value > 0) newItems[index].debit = '';
        setForm({ ...form, items: newItems });
    };

    const totals = useMemo(() => {
        return form.items.reduce((acc, item) => ({
            debit: acc.debit + (parseFloat(item.debit) || 0),
            credit: acc.credit + (parseFloat(item.credit) || 0)
        }), { debit: 0, credit: 0 });
    }, [form.items]);

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (totals.debit !== totals.credit || totals.debit === 0) {
            showToast.warning('Jurnal tidak seimbang atau total nol!');
            return;
        }

        const payload = {
            description: form.description,
            date: new Date(form.date).toISOString(),
            items: form.items
                .filter(i => i.coa_id && (i.debit > 0 || i.credit > 0))
                .map(i => ({
                    coa_id: parseInt(i.coa_id),
                    debit: parseFloat(i.debit) || 0,
                    credit: parseFloat(i.credit) || 0
                }))
        };
        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <div className="glass-card rounded-[2rem] w-full max-w-4xl border border-white/10 animate-in zoom-in-95 duration-300 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h3 className="text-white font-bold text-xl tracking-tight italic normal-case">Entri Jurnal Manual</h3>
                        <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1 italic">Sesuaikan saldo atau input saldo awal</p>
                    </div>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-2">
                            <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Narasi Transaksi</label>
                            <input
                                type="text"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 italic normal-case"
                                placeholder="E.g. Input Saldo Awal Kas & Modal"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Tanggal Efektif</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between text-[10px] text-gray-600 font-black uppercase tracking-widest px-4">
                            <div className="flex-grow">Akun Ledger</div>
                            <div className="w-40 text-right">Debit</div>
                            <div className="w-40 text-right">Kredit</div>
                            <div className="w-10"></div>
                        </div>

                        {form.items.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-left-2 duration-300">
                                <div className="flex-grow">
                                    <select
                                        value={item.coa_id}
                                        onChange={e => updateItem(idx, 'coa_id', e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none"
                                        required
                                    >
                                        <option value="" className="bg-slate-900">Pilih Akun...</option>
                                        {coas.filter(c => c.can_post).map(c => (
                                            <option key={c.id} value={c.id} className="bg-slate-900 text-xs">
                                                [{c.code}] {c.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-40">
                                    <input
                                        type="number"
                                        value={item.debit}
                                        onChange={e => updateItem(idx, 'debit', e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-emerald-400 font-bold focus:outline-none text-right tabular-nums"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="w-40">
                                    <input
                                        type="number"
                                        value={item.credit}
                                        onChange={e => updateItem(idx, 'credit', e.target.value)}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-rose-400 font-bold focus:outline-none text-right tabular-nums"
                                        placeholder="0"
                                    />
                                </div>
                                <button type="button" onClick={() => removeItem(idx)} className="p-2 text-gray-700 hover:text-rose-500 transition-colors">
                                    <HiOutlineTrash />
                                </button>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addItem}
                            className="w-full border-2 border-dashed border-white/5 rounded-2xl p-4 text-gray-500 hover:text-white hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest"
                        >
                            <HiOutlinePlusCircle /> Tambah Baris Baris
                        </button>
                    </div>
                </form>

                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex gap-12">
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Debit</p>
                            <p className="text-xl font-bold text-emerald-400 tabular-nums">Rp {totals.debit.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Kredit</p>
                            <p className="text-xl font-bold text-rose-400 tabular-nums">Rp {totals.credit.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center">
                            {totals.debit === totals.credit && totals.debit > 0 ? (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1.5 rounded-xl border border-emerald-500/20 font-black tracking-widest uppercase">Balanced</span>
                            ) : (
                                <span className="bg-rose-500/10 text-rose-400 text-[10px] px-3 py-1.5 rounded-xl border border-rose-500/20 font-black tracking-widest uppercase italic">Not Balanced</span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={handleSubmit}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02]"
                    >
                        Posting Jurnal
                    </button>
                </div>
            </div>
        </div>
    );
});

const COAModal = React.memo(({ show, coas, onCancel, onSubmit, editData = null, prefilledParentId = null }) => {
    const [form, setForm] = useState({
        code: '',
        name: '',
        type: 'EXPENSE',
        parent_id: '',
        is_active: true,
        can_post: true,
        mapping_key: ''
    });
    const [isLoadingCode, setIsLoadingCode] = useState(false);

    useEffect(() => {
        if (editData) {
            setForm({
                code: editData.code || '',
                name: editData.name || '',
                type: editData.type || 'EXPENSE',
                parent_id: editData.parent_id || '',
                is_active: editData.is_active ?? true,
                can_post: editData.can_post ?? true,
                mapping_key: editData.mapping_key || ''
            });
        } else {
            const initialParentId = prefilledParentId || '';
            const parent = coas.find(c => c.id === parseInt(initialParentId));

            setForm({
                code: '',
                name: '',
                type: parent ? parent.type : 'EXPENSE',
                parent_id: initialParentId,
                is_active: true,
                can_post: true,
                mapping_key: ''
            });
            fetchNextCode(parent ? parent.type : 'EXPENSE', initialParentId);
        }
    }, [editData, show, prefilledParentId]);

    const fetchNextCode = async (type, pId = null) => {
        setIsLoadingCode(true);
        try {
            // Enhanced suggestion: Pass parent_id if available
            const res = await adminService.getNextCOACode(type, pId);
            setForm(prev => ({ ...prev, code: res.code, type }));
        } catch (error) {
            console.error("Failed to fetch next code", error);
        } finally {
            setIsLoadingCode(false);
        }
    };

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...form,
            parent_id: form.parent_id ? parseInt(form.parent_id) : null,
            mapping_key: form.mapping_key || null // Ensure empty string becomes null
        };
        onSubmit(payload);
    };

    const selectedParent = coas.find(c => c.id === parseInt(form.parent_id));

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <div className="glass-card rounded-3xl w-full max-w-2xl border border-white/10 animate-in zoom-in-95 duration-300 overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h3 className="text-white font-bold text-xl tracking-tight">
                            {editData ? 'Koreksi Akun' : prefilledParentId ? `Tambah Sub-Akun: ${selectedParent?.name}` : 'Tambah Akun Induk'}
                        </h3>
                        <p className="text-gray-500 text-xs mt-1">Struktur Akun (Chart of Accounts)</p>
                    </div>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {prefilledParentId && !editData && (
                        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/20 rounded-xl">
                                    <HiOutlineFolder className="text-purple-400 w-5 h-5" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-purple-300 font-black uppercase tracking-widest">Akan terdaftar di bawah:</span>
                                    <span className="text-white font-bold text-sm">{selectedParent?.code} - {selectedParent?.name}</span>
                                </div>
                            </div>
                            {selectedParent?.can_post && (
                                <p className="text-[10px] text-amber-400 italic bg-amber-400/5 p-2 rounded-lg border border-amber-400/10">
                                    ⚠️ Akun induk ini ("{selectedParent.name}") saat ini memiliki label <b>POSTABLE</b>. Menambahkan sub-akun akan otomatis mengubahnya menjadi <b>HEADER/GRUP</b> untuk menjaga validitas laporan.
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Tipe Akun</label>
                            <select
                                value={form.type}
                                onChange={(e) => fetchNextCode(e.target.value, form.parent_id)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none pointer-events-auto"
                                disabled={!!prefilledParentId && !editData}
                                required
                            >
                                <option value="ASSET" className="bg-slate-900">ASSET (Harta)</option>
                                <option value="LIABILITY" className="bg-slate-900">LIABILITY (Hutang)</option>
                                <option value="EQUITY" className="bg-slate-900">EQUITY (Modal)</option>
                                <option value="REVENUE" className="bg-slate-900">REVENUE (Pendapatan)</option>
                                <option value="COGS" className="bg-slate-900">COGS (HPP)</option>
                                <option value="EXPENSE" className="bg-slate-900">EXPENSE (Biaya Operasional)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest flex justify-between">
                                Kode Akun
                                {isLoadingCode && <span className="animate-pulse text-purple-400 capitalize">Auto...</span>}
                            </label>
                            <input
                                type="text"
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 font-mono tracking-widest"
                                placeholder="E.g. 1001"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Nama Identitas Akun</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50"
                            placeholder="Contoh: Kas Toko / Biaya Sewa Kantin"
                            required
                        />
                    </div>

                    {!prefilledParentId && !editData && (
                        <div className="space-y-2">
                            <label className="text-gray-400 text-[10px] uppercase font-black tracking-widest">Induk Akun (Parent)</label>
                            <select
                                value={form.parent_id}
                                onChange={(e) => {
                                    const pId = e.target.value;
                                    setForm(prev => ({ ...prev, parent_id: pId }));
                                    const parent = coas.find(c => c.id === parseInt(pId));
                                    if (parent) fetchNextCode(parent.type, pId);
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-purple-500/50 appearance-none"
                            >
                                <option value="" className="bg-slate-900 text-gray-500">--- Akun Level Teratas (Top Level) ---</option>
                                {coas.filter(c => !c.can_post && c.id !== editData?.id).map(coa => (
                                    <option key={coa.id} value={coa.id} className="bg-slate-900">{coa.code} - {coa.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                            <input
                                type="checkbox"
                                checked={form.is_active}
                                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/20"
                            />
                            <div className="flex flex-col">
                                <span className="text-white text-xs font-black tracking-widest uppercase">Akun Aktif</span>
                                <span className="text-[10px] text-gray-500">Siap digunakan di jurnal</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                            <input
                                type="checkbox"
                                checked={form.can_post}
                                onChange={(e) => setForm({ ...form, can_post: e.target.checked })}
                                className="w-6 h-6 rounded-lg border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/20"
                            />
                            <div className="flex flex-col">
                                <span className="text-white text-xs font-black tracking-widest uppercase">Izinkan Posting</span>
                                <span className="text-[10px] text-gray-500">Jika mati, hanya jadi Header</span>
                            </div>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className={`w-full ${editData ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02]'} text-white py-5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-xl shadow-purple-500/10 mt-4 active:scale-95`}
                    >
                        {editData ? 'Simpan Perubahan' : 'Daftarkan Akun'}
                    </button>
                </form>
            </div>
        </div>
    );
});

const COAManagement = () => {
    const { hasPermission } = usePermission();
    const [coas, setCoas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showJournalModal, setShowJournalModal] = useState(false);
    const [editData, setEditData] = useState(null);
    const [prefilledParentId, setPrefilledParentId] = useState(null);
    const [collapsedIds, setCollapsedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [alertConfig, setAlertConfig] = useState({ show: false, title: '', message: '', type: 'info' });

    const loadCOAs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await adminService.getCOAs();
            setCoas(res.data || []);
        } catch (error) {
            console.error('Failed to load COAs', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCOAs();
    }, [loadCOAs]);

    const handleAddJournal = async (payload) => {
        try {
            setLoading(true);
            await adminService.createJournal(payload);
            setAlertConfig({
                show: true,
                title: 'Berhasil',
                message: 'Jurnal manual telah berhasil diposting dan saldo telah disesuaikan.',
                type: 'success'
            });
            setShowJournalModal(false);
            loadCOAs();
        } catch (error) {
            setAlertConfig({
                show: true,
                title: 'Gagal Posting',
                message: error.response?.data?.error || 'Terjadi kesalahan sistem',
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const processedCoas = useMemo(() => {
        if (!coas || coas.length === 0) return [];

        let filtered = coas;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = coas.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.code.toLowerCase().includes(q)
            );
            // If searching, flatten tree for visibility
            return filtered.map(c => ({ ...c, depth: 0, isVisible: true, hasChildren: false }));
        }

        const buildTree = (parentId = null, depth = 0, isHidden = false) => {
            let result = [];
            const children = coas
                .filter(c => c.parent_id === parentId)
                .sort((a, b) => a.code.localeCompare(b.code));

            children.forEach(child => {
                const hasChildren = coas.some(c => c.parent_id === child.id);
                const isCollapsed = collapsedIds.has(child.id);

                result.push({
                    ...child,
                    depth,
                    hasChildren,
                    isCollapsed,
                    isVisible: !isHidden
                });

                const subChildren = buildTree(child.id, depth + 1, isHidden || isCollapsed);
                result = [...result, ...subChildren];
            });
            return result;
        };

        const tree = buildTree(null, 0, false);
        const includedIds = new Set(tree.map(t => t.id));
        const orphans = coas.filter(c => c.parent_id && !includedIds.has(c.id));

        return orphans.length > 0
            ? [...tree, ...orphans.map(o => ({ ...o, depth: 0, hasChildren: false, isCollapsed: false, isVisible: true }))]
            : tree;
    }, [coas, collapsedIds, searchQuery]);

    const toggleCollapse = useCallback((id) => {
        setCollapsedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleAddOrEdit = async (formData) => {
        try {
            if (editData) {
                await adminService.updateCOA(editData.id, formData);
            } else {
                // If adding a sub-account to a parent that can currently post, 
                // we should update the parent to be a Header first.
                if (prefilledParentId) {
                    const parent = coas.find(c => c.id === parseInt(prefilledParentId));
                    if (parent && parent.can_post) {
                        await adminService.updateCOA(parent.id, { can_post: false });
                    }
                }
                await adminService.createCOA(formData);
            }
            setShowModal(false);
            setEditData(null);
            setPrefilledParentId(null);
            loadCOAs();
        } catch (error) {
            setAlertConfig({ show: true, title: 'Gagal Memproses COA', message: error.response?.data?.error || error.message, type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <div className="w-16 h-16 border-t-4 border-purple-500 border-r-4 border-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Menyiapkan Arsitektur Buku Besar...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tighter italic uppercase">Daftar Akun</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Chart of Accounts & Hierarchical Ledger</p>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Cari Kode / Nama Akun..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-purple-500/50 w-[300px] transition-all"
                        />
                    </div>
                    <button onClick={loadCOAs} className="p-4 glass-card rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm active:scale-95">
                        <HiOutlineRefresh className="w-6 h-6" />
                    </button>
                    {hasPermission('finance.manage') && (
                        <>
                            <button
                                onClick={() => setShowJournalModal(true)}
                                className="flex items-center gap-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 px-8 py-4 rounded-2xl font-black text-sm transition-all hover:bg-emerald-600/20 active:scale-95 uppercase tracking-widest"
                            >
                                <HiOutlineRefresh className="w-5 h-5 font-black" />
                                Entri Jurnal
                            </button>
                            <button
                                onClick={() => { setEditData(null); setPrefilledParentId(null); setShowModal(true); }}
                                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-purple-500/20 active:scale-95 uppercase tracking-widest"
                            >
                                <HiOutlinePlus className="w-5 h-5 font-black" />
                                Akun Baru
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl">
                <div className="p-8 border-b border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                            <HiOutlineChartBar className="text-purple-400 w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Struktur Buku Besar</h3>
                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Klik folder/panah untuk melihat sub-akun</p>
                        </div>
                    </div>
                    {searchQuery && (
                        <span className="text-purple-400 text-[10px] font-black uppercase tracking-widest bg-purple-500/10 px-4 py-2 rounded-xl border border-purple-500/20 animate-pulse">
                            Searching Mode: Flat View
                        </span>
                    )}
                </div>

                <div className="p-8 space-y-3 min-h-[400px]">
                    {processedCoas.filter(c => c.isVisible).map((coa) => (
                        <div
                            key={coa.id}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all border group select-none relative ${coa.depth > 0
                                ? 'bg-white/[0.01] border-white/[0.02] hover:bg-white/[0.03]'
                                : 'bg-white/[0.04] border-white/10 hover:border-white/20 hover:scale-[1.005]'
                                } ${!coa.can_post ? 'border-l-4 border-l-purple-500' : 'hover:bg-purple-500/5'}`}
                            style={{
                                marginLeft: `${coa.depth * 40}px`,
                            }}
                            onClick={() => coa.hasChildren ? toggleCollapse(coa.id) : null}
                        >
                            {/* Visual Hierarchy Line */}
                            {coa.depth > 0 && Array.from({ length: coa.depth }).map((_, idx) => (
                                <div
                                    key={idx}
                                    className="absolute h-full w-[1px] bg-white/5"
                                    style={{ left: `-${(idx + 1) * 40 - 20}px`, top: '-50%', height: '150%' }}
                                />
                            ))}

                            <div className="flex items-center gap-4 flex-grow">
                                <div className="flex items-center justify-center w-8">
                                    {coa.hasChildren ? (
                                        coa.isCollapsed ? <HiChevronRight className="text-gray-500 w-5 h-5" /> : <HiChevronDown className="text-purple-400 w-5 h-5" />
                                    ) : (
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-700 ml-1"></div>
                                    )}
                                </div>

                                <div className={`p-3 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${coa.type === 'ASSET' ? 'bg-blue-500/10 text-blue-400' :
                                    coa.type === 'LIABILITY' ? 'bg-rose-500/10 text-rose-400' :
                                        coa.type === 'EQUITY' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' :
                                            coa.type === 'REVENUE' ? 'bg-emerald-500/10 text-emerald-400' :
                                                'bg-amber-500/10 text-amber-400'
                                    }`}>
                                    {!coa.can_post ? (
                                        coa.isCollapsed ? <HiOutlineFolder className="w-5 h-5" /> : <HiOutlineFolderOpen className="w-5 h-5 font-black" />
                                    ) : (
                                        <span className="text-[12px] font-black w-5 h-5 flex items-center justify-center">{coa.code[0]}</span>
                                    )}
                                </div>

                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-black tabular-nums text-gray-500 font-mono tracking-tighter bg-white/5 px-2 py-0.5 rounded-md`}>
                                            {coa.code}
                                        </span>
                                        <p className={`font-bold text-base tracking-tight transition-colors ${!coa.can_post ? 'text-purple-100' : 'text-white'}`}>
                                            {coa.name}
                                        </p>
                                        {coa.mapping_key && (
                                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[8px] font-black font-mono border border-blue-500/20 uppercase">
                                                {coa.mapping_key}
                                            </span>
                                        )}
                                        {!coa.is_active && (
                                            <span className="text-[8px] text-rose-500 font-black uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-md">HOLD</span>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest mt-1">
                                        {coa.type} • {coa.can_post ? 'POSTABLE' : 'GROUP/HEADER'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-6" onClick={(e) => e.stopPropagation()}>
                                <div className="text-right flex flex-col items-end">
                                    <span className={`text-lg font-black tabular-nums tracking-tighter ${coa.balance < 0 ? 'text-rose-400' : 'text-white'}`}>
                                        Rp {Math.abs(coa.balance || 0).toLocaleString()}
                                    </span>
                                    <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest opacity-50">Saldo Saat Ini</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {hasPermission('finance.manage') && (
                                        <>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditData(null);
                                                    setPrefilledParentId(coa.id);
                                                    setShowModal(true);
                                                }}
                                                className="p-3 text-emerald-400 hover:text-emerald-300 transition-all rounded-xl hover:bg-white/5 border border-transparent hover:border-emerald-500/20"
                                                title={coa.can_post ? "Jadikan Induk & Tambah Sub" : "Tambah Sub-Akun"}
                                            >
                                                <HiOutlinePlusCircle className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setEditData(coa); setShowModal(true); }}
                                                className="p-3 text-gray-500 hover:text-amber-500 transition-all rounded-xl hover:bg-white/5 border border-transparent hover:border-amber-500/20"
                                            >
                                                <HiOutlinePencil className="w-5 h-5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {coas.length === 0 && !loading && (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5">
                                <HiOutlineChartBar className="w-10 h-10 text-gray-700" />
                            </div>
                            <p className="text-gray-500 italic text-sm">Bagan akun belum dikonfigurasi. Mulai dengan Akun Baru.</p>
                        </div>
                    )}
                    {processedCoas.filter(c => c.isVisible).length === 0 && coas.length > 0 && (
                        <div className="py-20 text-center">
                            <p className="text-gray-500 text-sm">Tidak ada akun yang sesuai dengan pencarian "{searchQuery}"</p>
                            <button onClick={() => setSearchQuery('')} className="text-purple-400 text-xs font-bold mt-2 hover:underline uppercase tracking-widest">Reset Pencarian</button>
                        </div>
                    )}
                </div>
            </div>

            <COAModal
                show={showModal}
                coas={coas}
                onCancel={() => { setShowModal(false); setEditData(null); setPrefilledParentId(null); }}
                onSubmit={handleAddOrEdit}
                editData={editData}
                prefilledParentId={prefilledParentId}
            />

            <JournalModal
                show={showJournalModal}
                coas={coas}
                onCancel={() => setShowJournalModal(false)}
                onSubmit={handleAddJournal}
            />


            <AlertModal
                show={alertConfig.show}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ show: false, title: '', message: '', type: 'info' })}
            />
        </div>
    );
};

export default COAManagement;
