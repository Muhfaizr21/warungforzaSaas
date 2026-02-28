import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
    HiOutlineClipboardList,
    HiOutlineSearch,
    HiOutlineEye,
    HiOutlineTruck,
    HiOutlineCheckCircle,
    HiOutlinePlus,
    HiOutlineRefresh,
    HiOutlineOfficeBuilding,
    HiOutlineDocumentText,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlinePencil,
    HiOutlineTrash
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';

const Procurement = () => {
    const { hasPermission } = usePermission();
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [localSearch, setLocalSearch] = useState('');
    const [filters, setFilters] = useState({
        status: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [statsData, setStatsData] = useState({ total: 0, draft: 0, ordered: 0, received: 0 });

    useEffect(() => {
        loadOrders();
    }, [filters]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const [ordersRes, statsRes] = await Promise.all([
                adminService.getPurchaseOrders(filters),
                adminService.getPurchaseOrderStats()
            ]);

            setOrders(ordersRes.data || []);
            setPagination({
                total: ordersRes.total || 0,
                pages: Math.ceil((ordersRes.total || 0) / filters.limit)
            });
            setStatsData(statsRes);
        } catch (error) {
            console.error('Failed to load POs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!window.confirm('Hapus Purchase Order ini?')) return;
        try {
            await adminService.deletePurchaseOrder(id);
            loadOrders();
        } catch (error) {
            showToast.error('Gagal menghapus PO: ' + error.message);
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            draft: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
            ordered: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            received: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
            cancelled: 'bg-rose-500/10 text-rose-500 border-rose-500/20'
        };
        return styles[status] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    };

    const stats = useMemo(() => ({
        total: statsData.total || 0,
        draft: statsData.draft || 0,
        ordered: statsData.ordered || 0,
        received: statsData.received || 0
    }), [statsData]);

    // Use backend filtering directly
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: searchQuery, page: 1 }));
    }, [searchQuery]);

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
    };

    const handleSearchBlur = () => {
        setSearchQuery(localSearch);
    };

    const handleSearchKey = (e) => {
        if (e.key === 'Enter') setSearchQuery(localSearch);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Pengadaan (PO)</h2>
                    <p className="admin-label mt-1 opacity-60 normal-case">Kelola pesanan pembelian ke pemasok dan sinkronisasi stok masuk</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadOrders} className="p-3 glass-card rounded-lg text-gray-400 hover:text-white transition-all">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                    {hasPermission('procurement.manage') && (
                        <button
                            onClick={() => navigate('/admin/procurement/new')}
                            className="btn-primary"
                        >
                            <HiOutlinePlus className="w-5 h-5" />
                            Buat PO Baru
                        </button>
                    )}
                </div>
            </div>

            {/* Insight Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total PO', value: statsData.total || 0, subValue: `${statsData.total_items || 0} Unit`, icon: HiOutlineClipboardList, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Draft', value: statsData.draft || 0, icon: HiOutlineDocumentText, color: 'text-gray-400', bg: 'bg-gray-500/10' },
                    { label: 'Dipesan', value: statsData.ordered || 0, icon: HiOutlineTruck, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Diterima', value: statsData.received || 0, subValue: `${statsData.received_items || 0} Unit`, icon: HiOutlineCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-5 rounded-xl flex items-center gap-4 group hover:border-white/20 transition-all">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="admin-label !mb-0">{stat.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-xl font-bold text-white tabular-nums mt-0.5">{stat.value}</p>
                                {stat.subValue && (
                                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{stat.subValue}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <div className="glass-card p-4 rounded-xl flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                    <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari No PO atau Supplier..."
                        value={localSearch}
                        onChange={handleSearchChange}
                        onBlur={handleSearchBlur}
                        onKeyDown={handleSearchKey}
                        className="admin-input pl-12 italic"
                    />
                </div>
                <div className="flex gap-4 w-full lg:w-auto">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="admin-input lg:w-48 appearance-none cursor-pointer text-xs font-bold uppercase tracking-widest"
                    >
                        <option value="" className="bg-slate-900">SEMUA STATUS</option>
                        <option value="draft" className="bg-slate-900">DRAFT</option>
                        <option value="ordered" className="bg-slate-900">DIPESAN</option>
                        <option value="received" className="bg-slate-900">DITERIMA</option>
                        <option value="cancelled" className="bg-slate-900">DIBATALKAN</option>
                    </select>
                    <div className="flex items-center gap-3 admin-input lg:w-32 bg-white/5 border-white/5">
                        <span className="admin-table-head opacity-60">Tampilkan</span>
                        <select
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                            className="bg-transparent text-sm text-white focus:outline-none font-bold tabular-nums ml-auto"
                        >
                            <option value="20" className="bg-slate-900">20</option>
                            <option value="50" className="bg-slate-900">50</option>
                            <option value="100" className="bg-slate-900">100</option>
                            <option value="500" className="bg-slate-900">500</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Registry */}
            <div className="glass-card rounded-3xl overflow-hidden border border-white/5 relative">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="text-left p-6 admin-table-head">Identitas PO</th>
                                <th className="text-left p-6 admin-table-head">Pemasok</th>
                                <th className="text-left p-6 admin-table-head">Total Nilai</th>
                                <th className="text-left p-6 admin-table-head">Status</th>
                                <th className="text-left p-6 admin-table-head">Dibuat Pada</th>
                                <th className="text-right p-6 admin-table-head">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {orders.map((po) => (
                                <tr key={po.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black tracking-tight font-mono">
                                                {po.po_number}
                                            </span>
                                            <span className="text-[10px] text-gray-500 mt-1 uppercase font-bold">{po.items?.length || 0} ITEMS</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white text-xs font-black shadow-lg">
                                                <HiOutlineOfficeBuilding className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-bold italic normal-case truncate max-w-[150px]">{po.supplier?.name || 'Unknown Supplier'}</p>
                                                <p className="text-gray-500 text-[10px] truncate max-w-[150px] font-medium">{po.supplier?.contact_person}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-white font-black tabular-nums tracking-tighter text-base">Rp {po.total_amount?.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-500 font-bold">ESTIMASI</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${getStatusBadge(po.status)}`}>
                                            {po.status === 'draft' ? 'DRAF' :
                                                po.status === 'ordered' ? 'DIPESAN' :
                                                    po.status === 'received' ? 'DITERIMA' :
                                                        po.status === 'cancelled' ? 'DIBATALKAN' : po.status}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-gray-400 font-bold text-xs">
                                                {new Date(po.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-black uppercase mt-0.5">{new Date(po.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/procurement/${po.id}`)}
                                                className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all group-hover:scale-105"
                                                title="Edit"
                                            >
                                                <HiOutlinePencil className="w-5 h-5" />
                                            </button>
                                            {hasPermission('procurement.manage') && (
                                                <button
                                                    onClick={() => handleCancel(po.id)}
                                                    className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all group-hover:scale-105"
                                                    title="Hapus"
                                                >
                                                    <HiOutlineTrash className="w-5 h-5" />
                                                </button>
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

                {/* Empty State */}
                {orders.length === 0 && !loading && (
                    <div className="text-center py-24 glass-card border-0 m-6 rounded-3xl">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <HiOutlineClipboardList className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2 italic normal-case">Belum ada Purchase Order</h3>
                        <p className="text-gray-500 text-sm max-w-sm mx-auto italic normal-case leading-relaxed">Buat PO baru untuk mulai mencatat pengadaan stok ke pemasok.</p>
                    </div>
                )}

                {/* Loading State Overlay */}
                {loading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-500">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] animate-pulse">Memuat Data PO...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Procurement;
