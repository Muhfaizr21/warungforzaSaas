import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import {
    HiOutlineShoppingBag,
    HiOutlineUser,
    HiOutlineTruck,
    HiOutlineCheckCircle,
    HiOutlineClock,
    HiOutlineChevronRight,
    HiOutlineHeart,
    HiOutlineLocationMarker,
    HiOutlineMail,
    HiOutlinePhone,
    HiOutlinePencil,
    HiOutlineClipboardList
} from 'react-icons/hi';
import ProfileAlert from '../components/ProfileAlert';
import { useLanguage } from '../context/LanguageContext';

const UserDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState(null);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [displayCount, setDisplayCount] = useState(5);
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [ordersRes, profileRes, wishlistRes] = await Promise.all([
                customerService.getOrders(),
                customerService.getProfile(),
                customerService.getWishlist()
            ]);
            setOrders(ordersRes || []);
            setProfile(profileRes);
            setWishlistCount(wishlistRes?.length || 0);
        } catch (error) {
            console.error('Failed to load dashboard data', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusConfig = (status, order) => {
        const isPO = order?.items?.[0]?.product?.product_type === 'po' || order?.invoices?.some(inv => inv.type === 'deposit');
        switch (status?.toLowerCase()) {
            case 'completed': return { label: t('order.status.completed'), color: 'bg-emerald-500', textColor: 'text-emerald-400', bgColor: 'bg-emerald-500/10', icon: <HiOutlineCheckCircle className="w-4 h-4" /> };
            case 'shipped': return { label: t('order.status.shipped'), color: 'bg-blue-500', textColor: 'text-blue-400', bgColor: 'bg-blue-500/10', icon: <HiOutlineTruck className="w-4 h-4" /> };
            case 'delivered': return { label: t('order.status.delivered'), color: 'bg-teal-500', textColor: 'text-teal-400', bgColor: 'bg-teal-500/10', icon: <HiOutlineCheckCircle className="w-4 h-4" /> };
            case 'processing': return { label: t('order.status.processing'), color: 'bg-amber-500', textColor: 'text-amber-400', bgColor: 'bg-amber-500/10', icon: <HiOutlineClock className="w-4 h-4" /> };
            case 'pre_order': return { label: t('order.status.pre_order'), color: 'bg-purple-500', textColor: 'text-purple-400', bgColor: 'bg-purple-500/10', icon: <HiOutlineClipboardList className="w-4 h-4" /> };
            case 'payment_due': return { label: isPO ? t('order.status.payment_due') : t('order.status.pending'), color: 'bg-rose-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/10', icon: <HiOutlineClock className="w-4 h-4" /> };
            case 'pending': return { label: t('order.status.pending'), color: 'bg-gray-500', textColor: 'text-gray-400', bgColor: 'bg-gray-500/10', icon: <HiOutlineClock className="w-4 h-4" /> };
            case 'cancelled': return { label: t('order.status.cancelled'), color: 'bg-rose-500', textColor: 'text-rose-400', bgColor: 'bg-rose-500/10', icon: <HiOutlineClock className="w-4 h-4" /> };
            default: return { label: status, color: 'bg-gray-500', textColor: 'text-gray-400', bgColor: 'bg-white/5', icon: <HiOutlineClock className="w-4 h-4" /> };
        }
    };

    // Compute stats
    const stats = {
        total: orders.length,
        shipped: orders.filter(o => ['shipped', 'delivered'].includes(o.status?.toLowerCase())).length,
        completed: orders.filter(o => o.status === 'completed').length,
        processing: orders.filter(o => ['processing', 'pending', 'payment_due', 'pre_order'].includes(o.status?.toLowerCase())).length,
    };

    const safeParseAddress = (data) => {
        if (!data) return {};
        if (typeof data === 'object') return data;
        try {
            if (data === '[object Object]') return {};
            return JSON.parse(data);
        } catch (e) {
            return { main: data };
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm">{t('dashboard.synchronizing')}</p>
                </div>
            </div>
        );
    }

    const addrData = safeParseAddress(profile?.profile?.address);
    const hasAddress = (addrData.main && addrData.main.trim().length > 5) || (addrData.street && addrData.street.trim().length > 2);
    const hasPhone = profile?.user?.phone && profile.user.phone.length > 5;
    const hasName = profile?.user?.full_name && profile.user.full_name.trim().length > 2;
    const profileIncomplete = !hasAddress || !hasPhone || !hasName;

    return (
        <div className="bg-[#030303] min-h-screen pt-20 pb-24">
            <div className="container max-w-6xl mx-auto px-4">

                {/* Profile Incomplete Alert */}
                {profileIncomplete && (
                    <div className="mb-8 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <HiOutlineUser className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-grow">
                            <p className="text-amber-300 text-sm font-semibold">{t('dashboard.informationRequired')}</p>
                            <p className="text-amber-400/60 text-xs mt-0.5">
                                {!hasAddress ? t('dashboard.profileIncomplete') : t('dashboard.profileIncomplete')}
                            </p>
                        </div>
                        <button onClick={() => navigate('/profile')} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold rounded-xl transition-colors flex-shrink-0">
                            {t('dashboard.configureProfile')}
                        </button>
                    </div>
                )}

                {/* Header Section */}
                <div className="flex flex-col md:flex-row gap-8 mb-10">

                    {/* Profile Card */}
                    <div className="w-full md:w-80 flex-shrink-0">
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-4 mb-5">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600/80 to-rose-800/80 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-rose-600/20">
                                    {profile?.user?.full_name?.[0] || profile?.user?.username?.[0] || 'U'}
                                </div>
                                <div className="flex-grow min-w-0">
                                    <h2 className="text-white font-bold text-lg truncate">{profile?.user?.full_name || profile?.user?.username}</h2>
                                    <p className="text-gray-500 text-xs truncate">{profile?.user?.email}</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-5">
                                {profile?.user?.phone && (
                                    <div className="flex items-center gap-3 text-gray-400 text-xs">
                                        <HiOutlinePhone className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        <span className="truncate">{profile.user.phone}</span>
                                    </div>
                                )}
                                {hasAddress && (
                                    <div className="flex items-center gap-3 text-gray-400 text-xs">
                                        <HiOutlineLocationMarker className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                        <span className="truncate">{addrData.main || addrData.street || '-'}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => navigate('/profile')}
                                className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white text-xs font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <HiOutlinePencil className="w-3.5 h-3.5" />
                                {t('dashboard.editCredentials')}
                            </button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex-grow grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group cursor-pointer" onClick={() => navigate('/wallet')}>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <HiOutlineClipboardList className="w-5 h-5 text-emerald-400" />
                            </div>
                            <p className="text-xl font-bold text-white">{formatPrice(profile?.user?.balance || 0)}</p>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1">{t('dashboard.wallet')}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <HiOutlineShoppingBag className="w-5 h-5 text-blue-400" />
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.total}</p>
                            <p className="text-gray-500 text-xs mt-1">{t('dashboard.orders')}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <HiOutlineClock className="w-5 h-5 text-amber-400" />
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.processing}</p>
                            <p className="text-gray-500 text-xs mt-1">{t('dashboard.active')}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <HiOutlineTruck className="w-5 h-5 text-cyan-400" />
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.shipped}</p>
                            <p className="text-gray-500 text-xs mt-1">{t('dashboard.shipped')}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group cursor-pointer" onClick={() => navigate('/wishlist')}>
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                <HiOutlineHeart className="w-5 h-5 text-rose-400" />
                            </div>
                            <p className="text-2xl font-bold text-white">{wishlistCount}</p>
                            <p className="text-gray-500 text-xs mt-1">{t('dashboard.wishlist')}</p>
                        </div>
                    </div>
                </div>

                {/* Orders Section */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <HiOutlineClipboardList className="w-5 h-5 text-gray-400" />
                            <h3 className="text-white font-bold text-base">{t('dashboard.orderHistory')}</h3>
                        </div>
                        <span className="text-xs text-gray-600">{orders.length} orders</span>
                    </div>

                    {orders.length === 0 ? (
                        <div className="p-16 text-center">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                                <HiOutlineShoppingBag className="w-10 h-10 text-gray-700" />
                            </div>
                            <h3 className="text-white font-semibold text-lg mb-2">{t('dashboard.noOrders')}</h3>
                            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">{t('dashboard.noOrdersDesc')}</p>
                            <button
                                onClick={() => navigate('/readystock')}
                                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-rose-600/20"
                            >
                                {t('dashboard.browseCatalogue')}
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {orders.slice(0, displayCount).map((order) => {
                                const statusConfig = getStatusConfig(order.status, order);
                                return (
                                    <div
                                        key={order.id}
                                        className="px-6 py-5 hover:bg-white/[0.02] transition-colors cursor-pointer group"
                                        onClick={() => navigate(`/order/${order.id}`)}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Status Icon */}
                                            <div className={`w-10 h-10 rounded-xl ${statusConfig.bgColor} flex items-center justify-center flex-shrink-0 ${statusConfig.textColor}`}>
                                                {statusConfig.icon}
                                            </div>

                                            {/* Order Info */}
                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="text-white font-semibold text-sm">#{order.order_number}</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                                                        {statusConfig.label}
                                                    </span>
                                                    {(order?.items?.[0]?.product?.product_type === 'po' || order?.invoices?.some(inv => inv.type === 'deposit')) && (
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest bg-purple-500/10 text-purple-400 border border-purple-500/20">PRE-ORDER</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                                    <span>•</span>
                                                    <span>{order.items?.length || 0} Artifacts</span>
                                                </div>

                                                {/* Tracking Info */}
                                                {['shipped', 'delivered'].includes(order.status?.toLowerCase()) && order.tracking_number && (
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <HiOutlineTruck className="w-3.5 h-3.5 text-blue-400" />
                                                        <span className="text-xs text-blue-400 font-mono">{order.tracking_number}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price */}
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-white font-bold text-base">{formatPrice(order.total_amount)}</p>
                                            </div>

                                            {/* Arrow */}
                                            <HiOutlineChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white transition-colors flex-shrink-0" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Load More */}
                    {orders.length > 5 && (
                        <div className="px-6 py-4 border-t border-white/5 flex items-center justify-center gap-6">
                            {displayCount < orders.length && (
                                <button
                                    onClick={() => setDisplayCount(prev => Math.min(prev + 5, orders.length))}
                                    className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs font-medium rounded-xl transition-all"
                                >
                                    {t('dashboard.loadMore')}
                                </button>
                            )}
                            {displayCount > 5 && (
                                <button
                                    onClick={() => setDisplayCount(5)}
                                    className="text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    {t('dashboard.collapse')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;
