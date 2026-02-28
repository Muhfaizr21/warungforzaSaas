import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import { HiExclamationCircle, HiOutlineRefresh, HiOutlineBell } from 'react-icons/hi';

const LowStockWidget = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [alertSent, setAlertSent] = useState(false);
    const navigate = useNavigate();

    const fetch = async () => {
        setLoading(true);
        try {
            const res = await adminService.getLowStockProducts();
            setProducts(res.data || []);
        } catch {
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetch(); }, []);

    const sendAlert = async () => {
        setSending(true);
        try {
            await adminService.sendLowStockAlert();
            setAlertSent(true);
            setTimeout(() => setAlertSent(false), 4000);
        } catch {
            // ignore
        } finally {
            setSending(false);
        }
    };

    const getStockColor = (available, minLevel) => {
        if (available <= 0) return 'text-red-400';
        if (available <= Math.ceil(minLevel / 2)) return 'text-red-400';
        return 'text-amber-400';
    };

    const getBarWidth = (available, minLevel) => {
        if (available <= 0) return '0%';
        const pct = Math.min((available / (minLevel * 2)) * 100, 100);
        return `${pct}%`;
    };

    return (
        <div className="bg-[#0d0d0f] border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <HiExclamationCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm">Low Stock Alert</p>
                        <p className="text-gray-500 text-xs">
                            {loading ? 'Checking...' : products.length === 0 ? 'All products are well-stocked ✓' : `${products.length} product${products.length !== 1 ? 's' : ''} need restocking`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetch}
                        title="Refresh"
                        className="p-1.5 text-gray-600 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                        <HiOutlineRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    {products.length > 0 && (
                        <button
                            onClick={sendAlert}
                            disabled={sending}
                            title="Send email alert to admins"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${alertSent
                                ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
                                : 'bg-amber-600 hover:bg-amber-500 text-white'
                                }`}
                        >
                            <HiOutlineBell className="w-3.5 h-3.5" />
                            {alertSent ? 'Alert Sent!' : sending ? 'Sending...' : 'Send Alert'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="p-6 text-center text-gray-600 text-sm">Checking inventory...</div>
            ) : products.length === 0 ? (
                <div className="p-8 text-center">
                    <div className="text-3xl mb-2">✅</div>
                    <p className="text-gray-500 text-sm">All products have sufficient stock</p>
                </div>
            ) : (
                <div className="divide-y divide-white/[0.03] max-h-[360px] overflow-y-auto custom-scrollbar">
                    {products.map((p) => {
                        const available = p.available_stock ?? (p.stock - p.reserved_qty);
                        return (
                            <div
                                key={p.id}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                onClick={() => navigate(`/admin/products/${p.id}/edit`)}
                            >
                                {/* Stock Level Indicator */}
                                <div className="flex-shrink-0 w-1.5 h-10 rounded-full bg-white/5 overflow-hidden">
                                    <div
                                        className={`w-full rounded-full transition-all ${available <= 0 ? 'bg-red-500' : 'bg-amber-500'}`}
                                        style={{ height: getBarWidth(available, p.min_stock_level) }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white text-xs font-semibold truncate group-hover:text-amber-400 transition-colors">
                                        {p.name}
                                    </p>
                                    <p className="text-gray-600 text-[10px] font-mono">{p.sku}</p>
                                </div>

                                {/* Stock Numbers */}
                                <div className="text-right flex-shrink-0">
                                    <p className={`text-sm font-black ${getStockColor(available, p.min_stock_level)}`}>
                                        {available <= 0 ? 'OUT' : available}
                                        {available > 0 && <span className="text-[10px] font-normal text-gray-600 ml-1">left</span>}
                                    </p>
                                    <p className="text-[10px] text-gray-600">min: {p.min_stock_level}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Footer */}
            {products.length > 0 && (
                <div className="px-5 py-3 border-t border-white/5">
                    <button
                        onClick={() => navigate('/admin/products?stock_status=outofstock')}
                        className="text-xs text-gray-600 hover:text-amber-400 transition-colors font-medium"
                    >
                        View all low-stock products →
                    </button>
                </div>
            )}
        </div>
    );
};

export default LowStockWidget;
