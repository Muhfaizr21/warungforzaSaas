import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useParams, useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { generateInvoicePDF } from '../services/pdfService';
import {
    HiOutlineArrowLeft,
    HiOutlineClipboardList,
    HiOutlineTruck,
    HiOutlineCreditCard,
    HiOutlineInformationCircle,
    HiOutlineDownload,
    HiOutlineShieldCheck,
    HiOutlineLocationMarker,
    HiOutlineCalendar,
    HiOutlineCash
} from 'react-icons/hi';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import OrderTimeline from '../components/OrderTimeline';
import TrackingPanel from '../components/TrackingPanel';
import Image from '../components/Image';

const UserOrderDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [uploadModal, setUploadModal] = useState({ isOpen: false, invoiceId: null });
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadNote, setUploadNote] = useState('');
    const [uploading, setUploading] = useState(false);
    const [systemSettings, setSystemSettings] = useState({});

    useEffect(() => {
        loadOrder();
        loadSettings();

        const interval = setInterval(() => {
            loadOrder(true);
        }, 15000);

        return () => clearInterval(interval);
    }, [id]);

    const loadSettings = async () => {
        try {
            const res = await customerService.getPublicSettings();
            const settingsObj = {};
            res.forEach(s => {
                settingsObj[s.key] = s.value;
            });
            setSystemSettings(settingsObj);
        } catch (error) {
            console.error('Failed to load settings', error);
        }
    };

    const loadOrder = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await customerService.getOrderDetail(id);
            setOrder(res);
        } catch (error) {
            console.error('Failed to load order detail', error);
        } finally {
            setLoading(false);
        }
    };



    const getStatusStyle = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]';
            case 'shipped': return 'text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
            case 'delivered': return 'text-teal-400 bg-teal-500/10 border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.15)]';
            case 'processing': return 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(251,191,36,0.15)]';
            case 'pre_order': return 'text-purple-400 bg-purple-500/10 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
            case 'payment_due': return 'text-rose-600 bg-rose-600/10 border-rose-600/20 shadow-[0_0_15px_rgba(225,29,72,0.15)] animate-pulse';
            case 'cancelled': return 'text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.15)]';
            default: return 'text-gray-400 bg-white/5 border-white/10';
        }
    };

    const handlePayment = async (invoiceId) => {
        navigate(`/payment/${invoiceId}`);
    };

    const handleConfirmDelivery = () => {
        setConfirmModalOpen(true);
    };

    const processConfirmDelivery = async () => {
        try {
            await customerService.confirmDelivery(id);
            setAlertConfig({
                isOpen: true,
                title: 'Delivery Confirmed',
                message: 'Thank you for confirming receipt of your order.',
                type: 'success'
            });
            loadOrder();
        } catch (error) {
            setAlertConfig({
                isOpen: true,
                title: 'Error',
                message: "Failed to confirm delivery: " + (error.response?.data?.error || error.message),
                type: 'error'
            });
        } finally {
            setConfirmModalOpen(false);
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!uploadFile) {
            setAlertConfig({ isOpen: true, title: 'Error', message: 'Please attach a transmission receipt document.', type: 'error' });
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('proof', uploadFile);
        formData.append('note', uploadNote);

        try {
            await customerService.submitPaymentProof(uploadModal.invoiceId, formData);
            setAlertConfig({
                isOpen: true,
                title: 'Transmission Success',
                message: 'Receipt document securely transmitted. Awaiting centralized verification.',
                type: 'success'
            });
            setUploadModal({ isOpen: false, invoiceId: null });
            setUploadFile(null);
            setUploadNote('');
            loadOrder();
        } catch (error) {
            setAlertConfig({
                isOpen: true,
                title: 'Transmission Failed',
                message: error.response?.data?.error || 'Failed to securely transmit the receipt.',
                type: 'error'
            });
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-white/5 rounded-full"></div>
                    <div className="absolute top-0 w-16 h-16 border-t-4 border-rose-600 rounded-full animate-spin"></div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white p-4">
                <div className="p-8 glass-card rounded-3xl text-center max-w-sm">
                    <HiOutlineInformationCircle className="w-16 h-16 text-rose-600 mx-auto mb-6" />
                    <h1 className="text-2xl font-black mb-2 uppercase tracking-tighter">Order Not Found</h1>
                    <p className="text-gray-500 text-sm mb-8">The system could not locate the requested order ID.</p>
                    <button onClick={() => navigate('/dashboard')} className="w-full bg-white text-black font-black py-4 rounded-xl uppercase tracking-widest text-xs hover:bg-rose-600 hover:text-white transition-all">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#030303] min-h-screen pt-28 pb-20">
            <div className="container">
                {/* Header Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                    <div className="space-y-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="group flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase tracking-[0.2em] text-[10px] font-black"
                        >
                            <HiOutlineArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Return to History
                        </button>

                        <div className="flex flex-wrap items-center gap-4">
                            <h1 className="text-4xl md:text-6xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                                Order <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-900">#{order.order_number}</span>
                            </h1>
                            <span className={`px-4 py-2 rounded-[8px] text-[10px] font-black uppercase tracking-[0.2em] border ${getStatusStyle(order.status)}`}>
                                {(() => {
                                    const isPO = order.items?.[0]?.product?.product_type === 'po' || order?.invoices?.some(inv => inv.type === 'deposit');
                                    const s = order.status?.toLowerCase();
                                    if (isPO) {
                                        if (s === 'pre_order') return 'AWAITING ARRIVAL';
                                        if (s === 'payment_due') return 'BALANCE PAYMENT';
                                        if (s === 'pending') return 'AWAITING DEPOSIT';
                                    }
                                    return s?.replace('_', ' ');
                                })()}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                <HiOutlineCalendar className="text-rose-600 text-sm" />
                                {new Date(order.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-black tracking-widest">
                                <HiOutlineShieldCheck className="text-emerald-400 text-sm" /> Encrypted Transaction
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {['shipped', 'delivered'].includes(order.status?.toLowerCase()) && (
                            <button
                                onClick={handleConfirmDelivery}
                                className="bg-emerald-500 hover:bg-white hover:text-emerald-500 text-white px-8 h-[48px] rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-2"
                            >
                                <HiOutlineTruck className="w-4 h-4" /> Confirm Received
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Main Column */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Status Timeline */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-[8px] p-6">
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-6 flex items-center gap-3">
                                <span className="w-2 h-2 bg-emerald-400 rounded-full"></span> Order Status
                            </h3>
                            <OrderTimeline order={order} logs={order.logs || []} />
                        </div>

                        {/* Manifest Items */}
                        <div className="bg-white/5 backdrop-blur-md rounded-[8px] border border-white/5 p-8">
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-8 flex items-center gap-3">
                                <HiOutlineClipboardList className="text-rose-600 text-base" /> Product Manifest
                            </h3>
                            <div className="space-y-6">
                                {order.items?.map((item) => (
                                    <div key={item.id} className="flex flex-col sm:flex-row gap-6 items-center group p-4 rounded-[8px] hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
                                        <div className="w-24 h-24 rounded-[8px] bg-black border border-white/10 overflow-hidden flex-shrink-0 relative">
                                            <Image
                                                src={(() => {
                                                    if (!item.product?.images) return '/placeholder.jpg';
                                                    try {
                                                        const imgs = typeof item.product.images === 'string'
                                                            ? JSON.parse(item.product.images)
                                                            : item.product.images;
                                                        return Array.isArray(imgs) ? imgs[0] : '/placeholder.jpg';
                                                    } catch (e) {
                                                        return '/placeholder.jpg';
                                                    }
                                                })()}
                                                alt={item.product?.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-black text-white italic">
                                                ×{item.quantity}
                                            </div>
                                        </div>
                                        <div className="flex-grow text-center sm:text-left">
                                            <h4 className="text-white font-black text-lg italic uppercase tracking-tight group-hover:text-rose-600 transition-colors">{item.product?.name}</h4>
                                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-1">
                                                Unit Price: {formatPrice(item.price)}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-white font-black text-2xl italic tracking-tighter">{formatPrice(item.total)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Totals Section */}
                            <div className="mt-10 pt-8 border-t border-white/10 space-y-4">
                                <div className="flex justify-between text-xs px-2">
                                    <span className="text-gray-500 uppercase font-black tracking-widest">Subtotal</span>
                                    <span className="text-white font-bold">{formatPrice(order.subtotal_amount || order.total_amount)}</span>
                                </div>

                                {order.shipping_cost > 0 && (
                                    <div className="flex justify-between text-xs px-2">
                                        <span className="text-gray-500 uppercase font-black tracking-widest">{order.shipping_method || 'Logistik Standard'}</span>
                                        <span className="text-white font-bold">{formatPrice(order.shipping_cost)}</span>
                                    </div>
                                )}

                                {order.discount_amount > 0 && (
                                    <div className="flex justify-between text-xs px-2">
                                        <span className="text-emerald-400 uppercase font-black tracking-widest flex items-center gap-2">
                                            Discount {order.coupon_code && <span className="bg-emerald-500/10 px-2 py-0.5 rounded text-[10px] tracking-normal font-mono">{order.coupon_code}</span>}
                                        </span>
                                        <span className="text-emerald-400 font-bold">- {formatPrice(order.discount_amount)}</span>
                                    </div>
                                )}

                                {order.deposit_paid > 0 && (
                                    <div className="flex justify-between text-xs px-2">
                                        <span className="text-blue-400 uppercase font-black tracking-widest">Deposit Paid</span>
                                        <span className="text-blue-400 font-bold">- {formatPrice(order.deposit_paid)}</span>
                                    </div>
                                )}

                                <div className="pt-6 border-t border-white/10 mt-6 relative group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-rose-600/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                                    <div className="flex justify-between items-end px-2 relative z-10">
                                        <div>
                                            <p className="text-[10px] text-rose-600 uppercase font-black tracking-[0.3em] mb-1">Total Payment</p>
                                            <p className="text-4xl md:text-5xl font-black text-white italic tracking-[calc(-0.05em)]">{formatPrice(order.total_amount)}</p>
                                        </div>
                                        {order.remaining_balance > 0 && order.remaining_balance !== order.total_amount && (
                                            <div className="text-right">
                                                <p className="text-[10px] text-amber-500 uppercase font-black tracking-widest mb-1">Remaining Balance</p>
                                                <p className="text-xl font-bold text-amber-500 italic">{formatPrice(order.remaining_balance)}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Billing & Shipping Details */}
                        <div className="bg-white/[0.03] border border-white/10 rounded-[8px] p-6">
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-8 flex items-center gap-3">
                                <HiOutlineLocationMarker className="text-purple-400 text-base" /> Shipping & Billing Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                {/* Billing Address */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-1 h-4 bg-purple-500"></span>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Billing Address</p>
                                    </div>
                                    <div className="text-gray-300 text-sm space-y-1.5 pl-3">
                                        <p className="text-white font-black uppercase italic text-base">{order.billing_first_name} {order.billing_last_name}</p>
                                        <p className="opacity-80">{order.billing_address_1}</p>
                                        {order.billing_address_2 && <p className="opacity-80">{order.billing_address_2}</p>}
                                        <p className="opacity-80 font-medium">{order.billing_city}, {order.billing_state} {order.billing_postcode}</p>
                                        <p className="text-purple-400 flex items-center gap-2 mt-4 font-mono">📱 {order.billing_phone}</p>
                                        <p className="text-gray-500 flex items-center gap-2 font-mono">✉️ {order.billing_email}</p>
                                    </div>
                                </div>

                                {/* Shipping Address */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-1 h-4 bg-rose-600"></span>
                                        <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Shipping Destination</p>
                                    </div>
                                    {order.ship_to_different ? (
                                        <div className="text-gray-300 text-sm space-y-1.5 pl-3">
                                            <p className="text-white font-black uppercase italic text-base">{order.shipping_first_name} {order.shipping_last_name}</p>
                                            <p className="opacity-80">{order.shipping_address_1}</p>
                                            <p className="opacity-80 font-medium">{order.shipping_city}, {order.shipping_state} {order.shipping_postcode}</p>
                                        </div>
                                    ) : (
                                        <div className="pl-3 py-4 flex flex-col justify-center items-center bg-white/[0.02] border border-white/5 rounded-[8px] border-dashed">
                                            <HiOutlineShieldCheck className="text-gray-600 text-3xl mb-2" />
                                            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest text-center">Same as Billing Address</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-emerald-500/10 rounded-[8px] border border-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                                        <HiOutlineCash className="text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Payment Method</p>
                                        <p className="text-white text-sm font-black uppercase tracking-wider">
                                            {(() => {
                                                const paidInvoice = order.invoices?.find(i => i.status === 'paid' || i.status === 'awaiting_approval');
                                                if (paidInvoice?.payment_method) {
                                                    const m = paidInvoice.payment_method;
                                                    if (m === 'manual_transfer') return 'Bank Transfer (Manual)';
                                                    if (m === 'qris') return 'QRIS';
                                                    if (m.includes('va')) return 'Virtual Account';
                                                    return m.replace(/_/g, ' ').toUpperCase();
                                                }
                                                if (order.payment_method === 'manual_transfer') return 'Bank Transfer';
                                                return 'Awaiting Payment';
                                            })()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 group">
                                    <div className="p-3 bg-purple-500/10 rounded-[8px] border border-purple-500/20 text-purple-400 group-hover:scale-110 transition-transform">
                                        <HiOutlineTruck className="text-xl" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Shipping Carrier</p>
                                        <p className="text-white text-sm font-black uppercase tracking-wider">{order.shipping_method || 'Standard Logistics'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Tracking & Invoices */}
                    <div className="lg:col-span-4 space-y-8">

                        {/* Tracking Panel - Live Shipment Tracking */}
                        <TrackingPanel
                            orderId={order.id}
                            orderStatus={order.status}
                            trackingNumber={order.tracking_number}
                            carrier={order.carrier}
                        />

                        {/* Invoices Stack */}
                        <div className="bg-white/5 backdrop-blur-md rounded-[8px] border border-white/5 p-8 bg-gradient-to-br from-rose-600/10 via-transparent to-transparent">
                            <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-8 flex items-center gap-3">
                                <HiOutlineCreditCard className="text-rose-600 text-base" /> Invoices & Payments
                            </h3>
                            <div className="space-y-4">
                                {(order.invoices || [])?.sort((a, b) => a.id - b.id).map((inv) => {
                                    const isPendingArrival = inv.status === 'pending_arrival';
                                    const isPaid = inv.status === 'paid';
                                    const isUnpaid = inv.status === 'unpaid';
                                    const isOverdue = isUnpaid && inv.due_date && new Date(inv.due_date) < new Date();

                                    let statusColor = 'text-gray-400 border-gray-500/20 bg-gray-500/5';
                                    let glowColor = '';
                                    if (isPaid) {
                                        statusColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
                                        glowColor = 'shadow-[0_0_15px_rgba(16,185,129,0.1)]';
                                    }
                                    if (isUnpaid) {
                                        statusColor = 'text-rose-400 border-rose-500/20 bg-rose-500/10';
                                        glowColor = 'shadow-[0_0_15px_rgba(244,63,94,0.1)]';
                                    }
                                    if (isPendingArrival) {
                                        statusColor = 'text-blue-400 border-blue-500/20 bg-blue-500/10';
                                        glowColor = 'shadow-[0_0_15px_rgba(59,130,246,0.1)]';
                                    }
                                    if (inv.status === 'awaiting_approval') {
                                        statusColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10';
                                        glowColor = 'shadow-[0_0_15px_rgba(234,179,8,0.1)]';
                                    }
                                    if (isOverdue) statusColor = 'text-white border-red-500 bg-red-500 animate-pulse';

                                    const displayText = inv.status === 'awaiting_approval' ? 'Awaiting Verification' :
                                        isOverdue ? 'CRITICAL EXP' :
                                            isPendingArrival ? 'Await Arrival' :
                                                inv.status;

                                    return (
                                        <div key={inv.id} className={`p-5 rounded-[8px] border transition-all ${isOverdue ? 'bg-red-950/40 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-black/40 border-white/5 hover:border-white/20'}`}>
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-[9px] text-gray-400 font-black uppercase tracking-[0.2em]">
                                                    {inv.type === 'deposit' ? 'Deposit Payment' : inv.type === 'balance' ? 'Balance Payment' : 'Main Payment'}
                                                </span>
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${statusColor} ${glowColor}`}>
                                                    {displayText}
                                                </span>
                                            </div>

                                            <div className="mb-6">
                                                <p className="text-white font-mono text-[10px] opacity-40 mb-1">REF: {inv.invoice_number}</p>
                                                <p className="text-2xl font-black text-white italic tracking-tighter">{formatPrice(inv.amount)}</p>
                                                {inv.due_date && !isPendingArrival && (
                                                    <p className={`text-[9px] uppercase tracking-widest font-bold mt-2 ${isOverdue ? 'text-red-400' : 'text-gray-500'}`}>
                                                        {isOverdue ? 'Cancelled on: ' : 'Due by: '} {new Date(inv.due_date).toLocaleDateString('id-ID')}
                                                    </p>
                                                )}
                                                {isPendingArrival && (
                                                    <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest mt-2 animate-pulse">Awaiting Item Arrival</p>
                                                )}
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                {(isUnpaid || isPendingArrival) && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handlePayment(inv.id)}
                                                            className="flex-1 btn-primary h-[48px]"
                                                        >
                                                            Pay Invoice
                                                        </button>
                                                        {systemSettings.enable_bank_transfer === 'true' && (
                                                            <button
                                                                onClick={() => setUploadModal({ isOpen: true, invoiceId: inv.id })}
                                                                className="px-4 bg-white/10 hover:bg-white/20 border border-white/10 rounded-[8px] text-white transition-all flex items-center justify-center font-black uppercase tracking-widest text-[10px]"
                                                                title="Manual Verification / Upload Transfer Proof"
                                                            >
                                                                <HiOutlineClipboardList className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {inv.status === 'awaiting_approval' && (
                                                    <div className="w-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 h-[48px] flex items-center justify-center rounded-[8px] text-[10px] font-bold uppercase tracking-widest text-center animate-pulse">
                                                        Awaiting Administrative Verification
                                                    </div>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const btn = document.getElementById(`btn-inv-${inv.id}`);
                                                            if (btn) btn.innerText = "SPOOLING...";

                                                            const data = await customerService.getInvoicePDFData(order.id, inv.id);
                                                            generateInvoicePDF(data);

                                                            if (btn) btn.innerText = "DOWNLOAD DOC";
                                                        } catch (e) {
                                                            console.error("PDF Error", e);
                                                            setAlertConfig({
                                                                isOpen: true,
                                                                title: 'Download Failed',
                                                                message: 'Failed to access the requested archive. Please reattempt.',
                                                                type: 'error'
                                                            });
                                                            const btn = document.getElementById(`btn-inv-${inv.id}`);
                                                            if (btn) btn.innerText = "DOWNLOAD DOC";
                                                        }
                                                    }}
                                                    id={`btn-inv-${inv.id}`}
                                                    className={`w-full border ${isPaid ? 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'border-white/10 text-white/60 hover:text-white hover:bg-white/5'} h-[40px] rounded-[8px] text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2`}
                                                >
                                                    <HiOutlineDownload className="text-base" /> Download Doc
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Security Badge Card */}
                        <div className="p-8 border border-white/5 bg-white/[0.01] rounded-3xl text-center">
                            <HiOutlineShieldCheck className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest leading-relaxed">
                                All financial transmissions are processed over secure, encrypted channels.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals outside the grid flow */}
            <ConfirmationModal
                isOpen={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={processConfirmDelivery}
                title="Confirm Cargo Reception"
                message="Please ensure your requested artifacts arrived in perfect condition. This operation cannot be reversed."
                confirmText="Yes, Cargo Received"
                cancelText="Cancel"
                variant="success"
            />

            {/* Upload Proof Modal */}
            {
                uploadModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-[#111] border border-white/10 rounded-[8px] w-full max-w-md p-6 relative shadow-2xl shadow-rose-600/10">
                            <button
                                onClick={() => setUploadModal({ isOpen: false, invoiceId: null })}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-tighter">
                                <HiOutlineClipboardList className="text-rose-600" /> Payment Validation
                            </h3>
                            <form onSubmit={handleUploadSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                                        Transfer Receipt (Image/PDF)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setUploadFile(e.target.files[0])}
                                        className="w-full text-[10px] text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-[8px] file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-white/10 file:text-white hover:file:bg-white/20 transition-all cursor-pointer"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">
                                        Transmission Memo (Optional)
                                    </label>
                                    <textarea
                                        value={uploadNote}
                                        onChange={(e) => setUploadNote(e.target.value)}
                                        className="input-standard min-h-[100px] py-3"
                                        placeholder="e.g., Wire from Bank Mandiri sender A/N Bruce Wayne"
                                        rows="3"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full btn-primary h-[54px]"
                                >
                                    {uploading ? 'Transmitting Data...' : 'Submit Payment Proof'}
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div >
    );
};

export default UserOrderDetail;
