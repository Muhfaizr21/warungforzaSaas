import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import {
    HiOutlineDocumentText,
    HiOutlineFilter,
    HiOutlineSearch,
    HiOutlineCalendar,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineCheckCircle,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineCog,
    HiOutlineUser,
    HiOutlineRefresh,
    HiOutlineDownload,
    HiOutlineX,
    HiOutlineShoppingBag,
    HiOutlineCube,
    HiOutlineUsers,
    HiOutlineCurrencyDollar,
    HiOutlineSpeakerphone,
    HiOutlineClipboardList
} from 'react-icons/hi';

const AuditLogs = () => {
    // ... state ...
    const [logs, setLogs] = useState([]);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        module: '',
        action: '',
        from_date: '',
        to_date: '',
        search: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [moduleStats, setModuleStats] = useState({});

    useEffect(() => {
        loadModules();
    }, []);

    useEffect(() => {
        loadLogs();
    }, [filters]);

    const loadModules = async () => {
        try {
            const res = await adminService.getAuditLogModules();
            setModules(res.data || ['orders', 'products', 'users', 'settings', 'finance', 'marketing']);
        } catch (error) {
            console.error('Failed to load modules', error);
        }
    };

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await adminService.getAuditLogs(filters);
            setLogs(res.data || []);
            setPagination({
                total: res.total || 0,
                pages: Math.ceil((res.total || 0) / filters.limit)
            });

            const stats = {};
            (res.data || []).forEach(log => {
                stats[log.module] = (stats[log.module] || 0) + 1;
            });
            setModuleStats(stats);
        } catch (error) {
            console.error('Failed to load audit logs', error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': return <HiOutlinePlus className="w-4 h-4" />;
            case 'UPDATE': return <HiOutlinePencil className="w-4 h-4" />;
            case 'DELETE': return <HiOutlineTrash className="w-4 h-4" />;
            default: return <HiOutlineCog className="w-4 h-4" />;
        }
    };

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'UPDATE': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
            case 'DELETE': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'LOGIN': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
            default: return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    const getModuleIcon = (module) => {
        const icons = {
            orders: HiOutlineShoppingBag,
            products: HiOutlineCube,
            users: HiOutlineUsers,
            settings: HiOutlineCog,
            finance: HiOutlineCurrencyDollar,
            marketing: HiOutlineSpeakerphone,
            audit: HiOutlineClipboardList
        };
        const Icon = icons[module] || HiOutlineDocumentText;
        return <Icon className="w-5 h-5" />;
    };

    const [localSearch, setLocalSearch] = useState(filters.search);

    useEffect(() => {
        setLocalSearch(filters.search);
    }, [filters.search]);

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
    };

    const handleSearchBlur = () => {
        setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Audit Sistem</h2>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">Rekaman aktivitas infrastruktur yang tidak dapat diubah</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={loadLogs} className="p-2.5 glass-card rounded-xl text-gray-400 hover:text-white transition-all">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Insight Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {modules.slice(0, 6).map((mod) => (
                    <button
                        key={mod}
                        onClick={() => setFilters({ ...filters, module: filters.module === mod ? '' : mod, page: 1 })}
                        className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${filters.module === mod
                            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                            : 'glass-card border-white/5 hover:border-blue-500/30 group'
                            }`}
                    >
                        <div className={`p-3 rounded-xl ${filters.module === mod ? 'bg-white/20' : 'bg-white/5 group-hover:bg-white/10'} transition-all`}>
                            {getModuleIcon(mod)}
                        </div>
                        <div className="text-center">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${filters.module === mod ? 'text-blue-100' : 'text-gray-500'}`}>
                                {mod}
                            </p>
                            <p className={`text-xl font-bold tabular-nums mt-0.5 ${filters.module === mod ? 'text-white' : 'text-white'}`}>
                                {moduleStats[mod] || 0}
                            </p>
                        </div>
                    </button>
                ))}
            </div>

            {/* Log Hub */}
            <div className="glass-card rounded-3xl overflow-hidden border border-white/5 relative">
                <div className="p-6 border-b border-white/5 flex flex-col lg:flex-row gap-6 items-center">
                    <div className="relative flex-grow w-full">
                        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Cari di seluruh riwayat log..."
                            value={localSearch}
                            onChange={handleSearchChange}
                            onBlur={handleSearchBlur}
                            onKeyDown={handleSearchKeyDown}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium italic normal-case"
                        />
                    </div>
                    <div className="flex gap-4 w-full lg:w-auto">
                        <select
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
                            className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer font-bold uppercase tracking-widest text-[10px]"
                        >
                            <option value="">Semua Aksi</option>
                            <option value="CREATE">Buat (Create)</option>
                            <option value="UPDATE">Ubah (Update)</option>
                            <option value="DELETE">Hapus (Delete)</option>
                            <option value="LOGIN">Autentikasi</option>
                        </select>
                        <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1">
                            <input
                                type="date"
                                value={filters.from_date}
                                onChange={(e) => setFilters({ ...filters, from_date: e.target.value, page: 1 })}
                                className="bg-transparent border-0 px-4 py-2 text-[10px] font-black uppercase text-white focus:outline-none w-32"
                            />
                            <div className="w-px bg-white/10 h-6 my-auto"></div>
                            <input
                                type="date"
                                value={filters.to_date}
                                onChange={(e) => setFilters({ ...filters, to_date: e.target.value, page: 1 })}
                                className="bg-transparent border-0 px-4 py-2 text-[10px] font-black uppercase text-white focus:outline-none w-32"
                            />
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-6 py-4 backdrop-blur-md">
                            <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tampilkan</span>
                            <select
                                value={filters.limit}
                                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                                className="bg-transparent text-sm text-white focus:outline-none font-bold tabular-nums"
                            >
                                <option value="20" className="bg-slate-900">20</option>
                                <option value="50" className="bg-slate-900">50</option>
                                <option value="100" className="bg-slate-900">100</option>
                                <option value="500" className="bg-slate-900">500</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500 border-b border-white/5">
                            <tr>
                                <th className="text-left p-6">Garis Waktu</th>
                                <th className="text-left p-6">Identitas</th>
                                <th className="text-left p-6">Segmen</th>
                                <th className="text-left p-6">Mutasi Data</th>
                                <th className="text-left p-6 text-right">Node Akses</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-blue-500/[0.02] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-xs">
                                                {new Date(log.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <span className="text-[10px] text-gray-600 font-bold uppercase mt-1">{new Date(log.created_at).toLocaleTimeString('id-ID')}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-white/10 flex items-center justify-center text-blue-400 text-xs font-black">
                                                {log.user?.username?.[0]?.toUpperCase() || 'S'}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-bold italic normal-case truncate max-w-[150px]">{log.user?.username || log.actor || 'System'}</p>
                                                <p className="text-gray-600 text-[10px] uppercase font-black tracking-widest">
                                                    {typeof log.user?.role === 'object' ? log.user.role.name : (log.user?.role || 'Root')}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
                                            {getModuleIcon(log.module)} {log.module}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                            <span className="text-gray-500 text-xs italic normal-case truncate max-w-[200px]" title={log.details}>
                                                {log.details || `ID: ${log.record_id}`}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <span className="text-gray-600 font-mono text-[10px] font-bold tracking-tighter">{log.ip_address || '127.0.0.1'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {loading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 transition-all duration-500">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] shadow-glow-blue animate-pulse">Menyelaraskan Kriptografi...</p>
                        </div>
                    </div>
                )}

                {logs.length === 0 && !loading && (
                    <div className="p-24 text-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                            <HiOutlineDocumentText className="w-10 h-10 text-gray-700" />
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2 italic normal-case">Jalur riwayat kosong</h3>
                        <p className="text-gray-500 text-sm italic normal-case">Ledger audit tidak mengandung data yang sesuai dengan kueri Anda.</p>
                    </div>
                )}

                {/* Pagination Registry */}
                {logs.length > 0 && (
                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <div className="flex items-center gap-3 font-mono">
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Densitas Registri</span>
                            <span className="px-2.5 py-1 bg-white/5 rounded-lg text-white font-bold text-xs">{logs.length} / {pagination.total}</span>
                        </div>
                        <div className="flex gap-4">
                            <button
                                disabled={filters.page <= 1}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                className="flex items-center gap-2 px-6 py-3 glass-card rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <HiOutlineChevronLeft className="w-4 h-4" />
                                SEBELUMNYA
                            </button>
                            <button
                                disabled={filters.page >= pagination.pages}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                className="flex items-center gap-2 px-6 py-3 glass-card rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                SELANJUTNYA
                                <HiOutlineChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default AuditLogs;
