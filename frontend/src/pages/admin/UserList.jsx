import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
    HiOutlineUsers,
    HiOutlineSearch,
    HiOutlineEye,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlineCalendar,
    HiOutlineShoppingBag,
    HiOutlineCurrencyDollar,
    HiOutlineUserAdd,
    HiOutlineUserCircle,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlineCheckCircle,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineTrash
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';

const UserList = () => {
    const { hasPermission } = usePermission();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        role: '',
        status: '',
        page: 1,
        limit: 20
    });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [localSearch, setLocalSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showDetail, setShowDetail] = useState(false);

    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        pending: 0,
        banned: 0,
        new_this_month: 0
    });

    useEffect(() => {
        loadUsers();
        fetchStats();
    }, [filters]);

    const fetchStats = async () => {
        try {
            const data = await adminService.getCustomerStats();
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch customer stats", error);
        }
    };

    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await adminService.getCustomers(filters);
            setUsers(res.data || []);
            setPagination({
                total: res.total || 0,
                pages: Math.ceil((res.total || 0) / filters.limit)
            });
        } catch (error) {
            console.error('Failed to load users', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async () => {
        if (confirm('PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data pelanggan? Tindakan ini akan menghapus semua pengguna non-admin dan data terkait mereka secara permanen. Lanjutkan?')) {
            setLoading(true);
            try {
                const res = await adminService.resetCustomers();
                showToast.success(`Reset Berhasil. Menghapus ${res.count} pengguna.`);
                loadUsers();
            } catch (error) {
                console.error('Reset failed', error);
                showToast.error('Gagal mereset database');
            } finally {
                setLoading(false);
            }
        }
    };

    const viewDetail = async (userId) => {
        try {
            const res = await adminService.getCustomer(userId);
            if (res.data) {
                console.log("Customer Detail Response:", res.data);
                const { customer, profile, order_count, wishlist_count, total_spent } = res.data;
                setSelectedUser({
                    ...customer,
                    phone: customer.phone || profile?.phone,
                    orders_count: order_count,
                    wishlist_count: wishlist_count,
                    total_spent: total_spent
                });
                setShowDetail(true);
            }
        } catch (error) {
            console.error('Failed to load user details', error);
        }
    };

    const filteredUsers = users;

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
    };

    const handleSearchBlur = () => {
        setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">Direktori Pelanggan</h2>
                    <p className="text-gray-400 text-sm italic normal-case mt-1">Daftar pengguna terdaftar (Non-Staff) dan verifikasi akun</p>
                </div>
                <div className="flex gap-3">
                    {hasPermission('user.delete') && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                        >
                            <HiOutlineTrash className="w-4 h-4" />
                            Reset Data
                        </button>
                    )}
                    <button onClick={loadUsers} className="p-3 glass-card rounded-xl text-gray-400 hover:text-white transition-all shadow-sm">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Pengguna', value: stats.total, icon: HiOutlineUsers, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                    { label: 'Terverifikasi', value: stats.active, icon: HiOutlineCheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Menunggu Verifikasi', value: stats.pending, icon: HiOutlineRefresh, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'Pertumbuhan Baru', value: stats.new_this_month, icon: HiOutlineUserAdd, color: 'text-orange-400', bg: 'bg-orange-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-5 rounded-2xl flex items-center gap-4 group hover:border-white/20 transition-all">
                        <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">{stat.label}</p>
                            <p className="text-xl font-bold text-white tabular-nums mt-0.5">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter Hub */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="glass-card p-2 rounded-2xl flex-grow relative">
                    <HiOutlineSearch className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Cari identitas pelanggan (nama, email, username)..."
                        value={localSearch}
                        onChange={handleSearchChange}
                        onBlur={handleSearchBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-14 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-gray-600"
                    />
                </div>
                <div className="flex flex-wrap gap-4">
                    <select
                        value={filters.status}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                        className="bg-white/5 border border-white/5 glass-card rounded-2xl px-6 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer font-bold uppercase tracking-widest text-[10px] min-w-[140px]"
                    >
                        <option value="">Semua Status</option>
                        <option value="active">AKTIF</option>
                        <option value="pending">MENUNGGU</option>
                        <option value="banned">DIBLOKIR</option>
                    </select>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/5 glass-card rounded-2xl px-6 py-2">
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

            {/* Table Layout */}
            {loading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">Mengambil Data Pelanggan...</p>
                </div>
            ) : filteredUsers.length > 0 ? (
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Akun Pengguna</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Role</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Kontak Email</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400">Status Verifikasi</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Total Pesanan</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-right">Bergabung Sejak</th>
                                    <th className="p-4 text-[10px] uppercase font-black tracking-widest text-gray-400 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg">
                                                    {user.full_name?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">{user.full_name || user.username}</p>
                                                    <p className="text-gray-500 text-xs">@{user.username || 'unknown'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/10">
                                                {user.role?.name === 'user' ? 'PELANGGAN' : user.role?.name || 'USER'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <HiOutlineMail className="w-4 h-4 text-blue-400" />
                                                <span className="text-sm">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                                {user.status === 'active' ? (
                                                    <><HiOutlineCheckCircle className="w-3 h-3" /> Terverifikasi</>
                                                ) : (
                                                    <><HiOutlineRefresh className="w-3 h-3 animate-spin-slow" /> Menunggu Verifikasi</>
                                                )}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className="text-white font-bold text-sm">{user.orders_count || 0}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <span className="text-gray-400 text-xs font-medium">
                                                {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <button
                                                onClick={() => viewDetail(user.id)}
                                                className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-sm group-hover:shadow-blue-500/20"
                                                title="Lihat Detail"
                                            >
                                                <HiOutlineEye className="w-4 h-4" />
                                            </button>
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
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Halaman</span>
                                <span className="px-2.5 py-1 bg-white/5 rounded-lg text-white font-bold text-xs">{filters.page} / {pagination.pages}</span>
                                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest ml-4">Total Data</span>
                                <span className="px-2.5 py-1 bg-white/5 rounded-lg text-white font-bold text-xs">{pagination.total}</span>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    disabled={filters.page <= 1 || loading}
                                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                    className="flex items-center gap-2 px-6 py-3 glass-card rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <HiOutlineChevronLeft className="w-4 h-4" />
                                    SEBELUMNYA
                                </button>
                                <button
                                    disabled={filters.page >= pagination.pages || loading}
                                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                    className="flex items-center gap-2 px-6 py-3 glass-card rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white hover:border-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                        <HiOutlineUsers className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-white font-bold text-xl mb-2">Direktori pengguna kosong</h3>
                    <p className="text-gray-500 italic text-sm max-w-md">Tidak ada catatan pelanggan yang sesuai dengan kriteria pencarian Anda saat ini.</p>
                </div>
            )}

            {/* Detail Modal */}
            {showDetail && selectedUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="glass-card rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-bold text-xl tracking-tight">Informasi Pelanggan</h3>
                            <button onClick={() => setShowDetail(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="flex items-center gap-6">
                                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-2xl border border-white/10">
                                    {selectedUser.full_name?.[0]?.toUpperCase() || selectedUser.username?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-2xl italic normal-case">{selectedUser.full_name || selectedUser.username}</h3>
                                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Status: Konsumen Aktif</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Alamat Email</p>
                                    <p className="text-white font-bold text-sm truncate">{selectedUser.email}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Referensi Telepon</p>
                                    <p className="text-white font-bold text-sm">{selectedUser.phone || 'Belum disediakan'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-6 bg-blue-500/10 rounded-2xl border border-blue-500/10 text-center">
                                    <HiOutlineShoppingBag className="w-6 h-6 text-blue-400 mx-auto mb-3" />
                                    <p className="text-3xl font-black text-white">{selectedUser.orders_count || 0}</p>
                                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">Pesanan</p>
                                </div>
                                <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 text-center">
                                    <HiOutlineCurrencyDollar className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
                                    <p className="text-2xl font-black text-white">Rp {(selectedUser.total_spent || 0).toLocaleString()}</p>
                                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">LTV</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl text-gray-400 text-xs">
                                <HiOutlineCalendar className="w-4 h-4" />
                                <span>Anggota sejak {new Date(selectedUser.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;
