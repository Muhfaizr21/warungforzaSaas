import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { usePermission } from '../../hooks/usePermission';
import { HiOutlineChevronRight, HiOutlineGlobe } from 'react-icons/hi';
import { useCountries } from '../../hooks/useCountries';
import EcommerceMetrics from './components/charts/EcommerceMetrics';
import StatisticsChart from './components/charts/StatisticsChart';
import MonthlySalesChart from './components/charts/MonthlySalesChart';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './components/ui/Table';
import Badge from './components/ui/Badge';
import MapChart from './components/charts/MapChart';
import LowStockWidget from './components/LowStockWidget';

const DashboardOverview = () => {
    const { hasPermission } = usePermission();
    const { countries } = useCountries();
    const [stats, setStats] = useState({
        revenue: 0,
        products_count: 0,
        total_orders_count: 0,
        new_orders_count: 0,
        customers_count: 0,
        recent_orders: [],
        sales_trend: [],
        monthly_sales: [],
        top_products: [],
        recent_logs: [],
        order_distribution: [],
        demographics: null
    });
    const [period, setPeriod] = useState('all');
    const [chartPeriod, setChartPeriod] = useState('30d');
    const [loading, setLoading] = useState(true);
    const [chartLoading, setChartLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadStats();
    }, [period]);

    useEffect(() => {
        loadChartData();
    }, [chartPeriod]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const [baseStats, trendData, monthlyData, topProdData, distData, demographicsData] = await Promise.all([
                adminService.getDashboardStats({ period }),
                adminService.getSalesTrend({ period: chartPeriod }),
                adminService.getMonthlySales({ period }),
                adminService.getTopProducts({ period }),
                adminService.getOrderStatusDistribution({ period }),
                adminService.getCustomerDemographics({ period })
            ]);

            setStats({
                ...baseStats,
                sales_trend: trendData.data || [],
                monthly_sales: monthlyData.data || [],
                top_products: topProdData.data || [],
                order_distribution: distData.data || [],
                demographics: demographicsData
            });
        } catch (error) {
            console.error('Failed to load dashboard stats', error);
        } finally {
            setLoading(false);
        }
    };

    const loadChartData = async () => {
        if (loading) return; // Skip if main loading is active
        setChartLoading(true);
        try {
            const trendData = await adminService.getSalesTrend({ period: chartPeriod });
            setStats(prev => ({ ...prev, sales_trend: trendData.data || [] }));
        } catch (error) {
            console.error('Failed to load chart data', error);
        } finally {
            setChartLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 border-4 border-brand-600/20 border-t-brand-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!hasPermission('dashboard.view')) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 italic">
                Pilih menu dari bilah sisi untuk memulai...
            </div>
        );
    }

    return (
        <div className="space-y-4 md:space-y-6 animate-in fade-in zoom-in duration-500">
            {/* Header with Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white uppercase italic tracking-tighter">Ringkasan Dashboard</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Analisis dan performa waktu nyata</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 outline-none focus:border-rose-500 transition-all cursor-pointer shadow-sm"
                    >
                        <option value="all">Semua Waktu</option>
                        <option value="1m">1 Bulan Terakhir</option>
                        <option value="6m">6 Bulan Terakhir</option>
                        <option value="1y">1 Tahun Terakhir</option>
                    </select>
                    <button
                        onClick={loadStats}
                        className="p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 hover:text-rose-500 transition-all shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Top Metrics Cards */}
            <EcommerceMetrics stats={stats} />

            <div className="grid grid-cols-12 gap-4 md:gap-6">
                {/* Monthly Sales Bar Chart */}
                <div className="col-span-12 xl:col-span-7">
                    <MonthlySalesChart data={stats.monthly_sales} />
                </div>

                {/* Customer Demographics - TailAdmin Style */}
                <div className="col-span-12 xl:col-span-5">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all h-full flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <h4 className="text-xl font-bold text-gray-800 dark:text-white">Demografi Pelanggan</h4>
                                <p className="text-sm text-gray-500 mt-1 font-medium italic normal-case">Jumlah pelanggan berdasarkan negara</p>
                            </div>
                            <div className="dropdown relative">
                                <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                                        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Map Area */}
                        <div className="flex-1 h-[240px] mb-6 relative overflow-hidden">
                            <MapChart demographics={stats.demographics} countries={countries} />
                        </div>

                        {/* Demographics List */}
                        <div className="space-y-6">
                            {(stats.demographics?.data || []).slice(0, 3).map((item) => {
                                const countryData = countries.find(c => c.code === item.code);
                                const displayName = countryData?.name || item.country || 'Unknown';
                                const flagSrc = countryData?.flag
                                    ? null // Use Emoji if available but we still use flagcdn image for consistency below
                                    : null;

                                return (
                                    <div key={item.code} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-white/10 flex-shrink-0 shadow-sm flex items-center justify-center bg-gray-50 dark:bg-[#111]">
                                                {item.code !== 'UN' ? (
                                                    <img
                                                        src={`https://flagcdn.com/w80/${item.code.toLowerCase()}.png`}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover scale-150"
                                                    />
                                                ) : (
                                                    <HiOutlineGlobe className="w-5 h-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div>
                                                <h5 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">{displayName}</h5>
                                                <p className="text-xs text-gray-500 font-bold">{item.count.toLocaleString()} <span className="font-medium text-[10px] uppercase">Pelanggan</span></p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 w-1/2">
                                            <div className="flex-1 h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-brand-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                                                    style={{ width: `${item.percentage}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-bold text-gray-800 dark:text-white w-10 text-right">{item.percentage.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Low Stock Alert Widget */}
                <div className="col-span-12 xl:col-span-5">
                    <LowStockWidget />
                </div>

                {/* Main Statistics Area Chart */}
                <div className="col-span-12">
                    <StatisticsChart
                        data={stats.sales_trend}
                        period={chartPeriod}
                        onPeriodChange={setChartPeriod}
                        loading={chartLoading}
                    />
                </div>

                {/* Recent Orders Table */}
                <div className="col-span-12 xl:col-span-12">
                    <div className="rounded-2xl border border-gray-200 bg-white px-5 pt-6 pb-2.5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-7.5 xl:pb-1">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-bold text-gray-800 dark:text-white">Pesanan Terkini</h4>
                            <Link to="/admin/orders" className="flex items-center gap-2 text-sm text-brand-500 hover:text-brand-600 font-medium">
                                Lihat Semua <HiOutlineChevronRight />
                            </Link>
                        </div>
                        <div className="max-w-full overflow-x-auto">
                            <Table>
                                <TableHeader className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                                    <TableRow>
                                        <TableCell isHeader className="px-2 pb-3.5 font-medium text-sm text-gray-500 dark:text-gray-400">ID Pesanan</TableCell>
                                        <TableCell isHeader className="px-2 pb-3.5 font-medium text-sm text-gray-500 dark:text-gray-400">Pelanggan</TableCell>
                                        <TableCell isHeader className="px-2 pb-3.5 font-medium text-sm text-gray-500 dark:text-gray-400">Item Produk</TableCell>
                                        <TableCell isHeader className="px-2 pb-3.5 font-medium text-sm text-gray-500 dark:text-gray-400">Total Biaya</TableCell>
                                        <TableCell isHeader className="px-2 pb-3.5 font-medium text-sm text-gray-500 dark:text-gray-400">Status</TableCell>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.recent_orders?.slice(0, 5).map((order) => (
                                        <TableRow key={order.id} className="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                                            <TableCell className="px-2 py-4">
                                                <h5 className="font-medium text-gray-800 dark:text-white text-sm">#{order.order_number?.split('-').pop() || order.id}</h5>
                                            </TableCell>
                                            <TableCell className="px-2 py-4">
                                                <h5 className="font-medium text-gray-800 dark:text-white text-sm">{order.user?.full_name || 'Tamu'}</h5>
                                            </TableCell>
                                            <TableCell className="px-2 py-4">
                                                <h5 className="text-gray-500 dark:text-gray-400 text-sm">{order.items?.[0]?.product_name || 'Produk'} {order.items?.length > 1 ? `+${order.items.length - 1} lagi` : ''}</h5>
                                            </TableCell>
                                            <TableCell className="px-2 py-4">
                                                <h5 className="font-medium text-gray-800 dark:text-white text-sm">Rp {order.total_amount?.toLocaleString()}</h5>
                                            </TableCell>
                                            <TableCell className="px-2 py-4">
                                                <Badge
                                                    variant="light"
                                                    color={
                                                        order.status === 'delivered' ? 'success' :
                                                            order.status === 'shipped' ? 'info' :
                                                                order.status === 'cancelled' ? 'error' : 'warning'
                                                    }
                                                >
                                                    {order.status === 'delivered' ? 'Selesai' :
                                                        order.status === 'shipped' ? 'Dikirim' :
                                                            order.status === 'cancelled' ? 'Dibatalkan' :
                                                                order.status === 'processing' ? 'Diproses' : 'Menunggu'}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardOverview;
