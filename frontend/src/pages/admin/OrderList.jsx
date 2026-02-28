import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableCell,
} from './components/ui/Table';
import Badge from './components/ui/Badge';
import {
    HiOutlineClipboardList,
    HiOutlineSearch,
    HiOutlineRefresh,
    HiOutlineDownload,
    HiOutlineClock,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineTruck,
    HiOutlineEye,
    HiOutlineChevronLeft,
    HiOutlineChevronRight,
    HiOutlineQrcode,
    HiOutlineShoppingCart,
    HiOutlineLightningBolt
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';

const OrderList = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [localSearch, setLocalSearch] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'ready', 'po'
    const [filters, setFilters] = useState({
        status: '',
        payment_status: '',
        type: '',
        page: 1,
        limit: 10 // Default limit from template
    });
    const [pagination, setPagination] = useState({ total: 0, pages: 1 });
    const [statsData, setStatsData] = useState({ total: 0, pending: 0, processing: 0, shipped: 0, cancelled: 0 });

    useEffect(() => {
        const timer = setTimeout(() => {
            setFilters(prev => ({ ...prev, search: localSearch, page: 1 }));
        }, 500);
        return () => clearTimeout(timer);
    }, [localSearch]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        const typeFilter = tab === 'all' ? '' : tab;
        setFilters(prev => ({ ...prev, type: typeFilter, page: 1 }));
    };

    const loadOrders = async () => {
        setLoading(true);
        try {
            const [ordersRes, statsRes] = await Promise.all([
                adminService.getOrders(filters),
                adminService.getOrderStats()
            ]);

            setOrders(ordersRes.data || []);
            setPagination({
                total: ordersRes.total || 0,
                pages: Math.ceil((ordersRes.total || 0) / filters.limit)
            });
            setStatsData(statsRes);
        } catch (error) {
            console.error('Failed to load orders', error);
        } finally {
            setLoading(false);
        }
    };

    const mapStatusToVariant = (status) => {
        switch (status) {
            case 'delivered': return 'success';
            case 'shipped': return 'info';
            case 'processing': return 'info';
            case 'cancelled': return 'error';
            case 'pending': return 'warning';
            default: return 'light';
        }
    };

    const mapPaymentToVariant = (status) => {
        switch (status) {
            case 'paid': return 'success';
            case 'paid_full': return 'success';
            case 'refunded': return 'error';
            case 'balance_due': return 'warning';
            default: return 'light';
        }
    };

    const stats = useMemo(() => ({
        total: statsData.total || 0,
        pending: statsData.pending || 0,
        processing: statsData.processing || 0,
        shipped: statsData.shipped || 0,
        cancelled: statsData.cancelled || 0
    }), [statsData]);

    const handleSearchChange = (e) => {
        setLocalSearch(e.target.value);
    };

    useEffect(() => {
        loadOrders();
    }, [filters]);

    return (
        <div className="mx-auto max-w-7xl">
            {/* Header Section */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-title-md2 font-semibold text-gray-900 dark:text-white uppercase italic tracking-tighter">
                    Manajemen Pesanan
                </h2>
                <div className="flex items-center gap-3">
                    <button onClick={loadOrders} className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-center font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-gray-700 transition-all">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                    {hasPermission('order.edit') && (
                        <>
                            <button
                                onClick={() => navigate('/admin/pos')}
                                className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-rose-600 px-6 py-3 text-center font-medium text-white hover:bg-opacity-90 transition-all"
                            >
                                <HiOutlineShoppingCart className="w-5 h-5" />
                                <span className="hidden sm:inline">Buat Pesanan (POS)</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 mb-6">
                {[
                    { label: 'Total Pesanan', value: stats.total, icon: HiOutlineClipboardList, color: 'text-brand-500', bg: 'bg-brand-50' },
                    { label: 'Menunggu', value: stats.pending, icon: HiOutlineClock, color: 'text-warning-500', bg: 'bg-warning-50' },
                    { label: 'Diproses', value: stats.processing, icon: HiOutlineCheckCircle, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Dikirim', value: stats.shipped, icon: HiOutlineTruck, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: 'Dibatalkan', value: stats.cancelled, icon: HiOutlineXCircle, color: 'text-error-500', bg: 'bg-error-50' },
                ].map((stat, i) => (
                    <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{stat.label}</span>
                                <h4 className="mt-1 text-xl font-bold text-gray-800 dark:text-white">{stat.value}</h4>
                            </div>
                            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.bg} dark:bg-white/5`}>
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-800 dark:bg-gray-900">

                {/* Custom Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-800">
                    <button
                        onClick={() => handleTabChange('all')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest text-center transition-all ${activeTab === 'all'
                            ? 'text-brand-500 border-b-2 border-brand-500 bg-brand-50/50 dark:bg-brand-900/10'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        Semua Pesanan
                    </button>
                    <button
                        onClick={() => handleTabChange('ready')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest text-center transition-all ${activeTab === 'ready'
                            ? 'text-green-500 border-b-2 border-green-500 bg-green-50/50 dark:bg-green-900/10'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        Ready Stock
                    </button>
                    <button
                        onClick={() => handleTabChange('po')}
                        className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest text-center transition-all ${activeTab === 'po'
                            ? 'text-purple-500 border-b-2 border-purple-500 bg-purple-50/50 dark:bg-purple-900/10'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50'
                            }`}
                    >
                        Pre-Order (PO)
                    </button>
                </div>

                <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="relative w-full sm:w-auto">
                        <button className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
                            <HiOutlineSearch className="w-5 h-5" />
                        </button>
                        <input
                            type="text"
                            placeholder="Cari pesanan (No, Nama)..."
                            value={localSearch}
                            onChange={handleSearchChange}
                            className="w-full sm:w-80 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-10 pr-4 text-sm text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                            className="rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-xs font-bold uppercase tracking-widest text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                            <option value="">SEMUA STATUS</option>
                            <option value="pending">MENUNGGU</option>
                            <option value="processing">DIPROSES</option>
                            <option value="shipped">DIKIRIM</option>
                            <option value="delivered">DITERIMA</option>
                            <option value="cancelled">DIBATALKAN</option>
                        </select>
                        <select
                            value={filters.limit}
                            onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value), page: 1 })}
                            className="rounded-lg border border-gray-200 bg-transparent py-2.5 px-4 text-xs font-bold text-gray-800 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        >
                            <option value="10">10 data</option>
                            <option value="20">20 data</option>
                            <option value="50">50 data</option>
                        </select>
                    </div>
                </div>

                <div className="max-w-full overflow-x-auto">
                    <Table>
                        <TableHeader className="border-b border-gray-200 dark:border-gray-800">
                            <TableRow>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">ID Pesanan</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">Pelanggan</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">Total Biaya</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">Status Pesanan</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">Pembayaran</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-start text-[10px] dark:text-gray-400">Tanggal</TableCell>
                                <TableCell isHeader className="px-5 py-3 font-bold uppercase tracking-widest text-gray-500 text-right text-[10px] dark:text-gray-400">Aksi</TableCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {loading ? (
                                <TableRow>
                                    <TableCell className="px-5 py-8 text-center" >
                                        <div className="flex items-center justify-center">
                                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500"></div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : orders.length === 0 ? (
                                <TableRow>
                                    <TableCell className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Tidak ada pesanan yang ditemukan.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                orders.map((order) => (
                                    <TableRow key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <TableCell className="px-5 py-4">
                                            <span className="font-medium text-gray-800 dark:text-white">#{order.order_number?.split('-').pop() || order.id}</span>
                                            {order.source === 'pos' && <span className="ml-2 text-[10px] bg-blue-100 text-blue-800 px-1 py-0.5 rounded dark:bg-blue-900/30 dark:text-blue-300">POS</span>}
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-9 w-9 overflow-hidden rounded-full flex items-center justify-center text-xs font-bold text-white ${order.source === 'pos' ? 'bg-orange-500' : 'bg-brand-500'}`}>
                                                    {(order.source === 'pos' ? order.billing_first_name : (order.user?.full_name || 'C'))?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white">{order.source === 'pos' ? (order.billing_first_name || 'Guest') : (order.user?.full_name || 'Guest')}</span>
                                                    <span className="block text-gray-500 text-theme-xs dark:text-gray-400">{order.source === 'pos' ? (order.billing_email || 'No Email') : order.user?.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <span className="font-medium text-gray-800 dark:text-white">Rp {order.total_amount?.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge variant="light" color={mapStatusToVariant(order.status)}>
                                                {order.status === 'pending' ? 'MENUNGGU' :
                                                    order.status === 'processing' ? 'DIPROSES' :
                                                        order.status === 'shipped' ? 'DIKIRIM' :
                                                            order.status === 'delivered' ? 'SELESAI' :
                                                                order.status === 'cancelled' ? 'DIBATALKAN' : order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <Badge variant="light" color={mapPaymentToVariant(order.payment_status)}>
                                                {order.payment_status === 'paid' ? 'LUNAS' :
                                                    order.payment_status === 'paid_full' ? 'LUNAS' :
                                                        order.payment_status === 'refunded' ? 'DIKEMBALIKAN' :
                                                            order.payment_status === 'balance_due' ? 'SISA BAYAR' :
                                                                order.payment_status === 'pending' ? 'BELUM BAYAR' : order.payment_status?.replace('_', ' ')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-5 py-4">
                                            <p className="text-gray-500 text-theme-sm dark:text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
                                        </TableCell>
                                        <TableCell className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => navigate(`/admin/orders/${order.id}`)}
                                                className="text-gray-500 hover:text-brand-500 dark:text-gray-400 dark:hover:text-brand-400"
                                            >
                                                <HiOutlineEye className="w-5 h-5" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {pagination.total > 0 && (
                    <div className="flex flex-col items-center justify-between p-4 border-t border-gray-200 dark:border-gray-800 sm:flex-row gap-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Menampilkan <span className="font-medium text-gray-800 dark:text-white">{(filters.page - 1) * filters.limit + 1}</span> sampai <span className="font-medium text-gray-800 dark:text-white">{Math.min(filters.page * filters.limit, pagination.total)}</span> dari <span className="font-medium text-gray-800 dark:text-white">{pagination.total}</span> data
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={filters.page <= 1}
                                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                <HiOutlineChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                disabled={filters.page >= pagination.pages}
                                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                            >
                                <HiOutlineChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrderList;
