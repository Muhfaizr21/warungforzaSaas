import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import {
    HiOutlineChevronLeft,
    HiOutlineTruck,
    HiOutlineClipboardList,
    HiOutlineUser,
    HiOutlineCash,
    HiOutlineClock,
    HiOutlineAnnotation,
    HiOutlineDotsVertical,
    HiOutlineReceiptTax,
    HiOutlineXCircle,
    HiOutlineCheckCircle,
    HiOutlineArrowNarrowLeft,
    HiOutlinePrinter,
    HiOutlinePhone
} from 'react-icons/hi';
import { usePermission } from '../../hooks/usePermission';

const getFullCountryName = (code) => {
    if (!code) return '';
    try {
        if (code.length === 2) {
            return new Intl.DisplayNames(['id'], { type: 'region' }).of(code.toUpperCase());
        }
        return code;
    } catch (e) {
        return code;
    }
};

const OrderDetail = ({ orderId: propOrderId, onBack }) => {
    const { id: paramId } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const orderId = propOrderId || paramId;

    const [order, setOrder] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [carriers, setCarriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(null);
    const [formData, setFormData] = useState({});
    const [showActionDropdown, setShowActionDropdown] = useState(false);
    const [shippingRates, setShippingRates] = useState([]);
    const [verifyModal, setVerifyModal] = useState({ isOpen: false, invoice: null });
    const [verifying, setVerifying] = useState(false);

    const handleMarkDelivered = async () => {
        if (!confirm("Konfirmasi paket sudah diterima pelanggan? Status akan berubah menjadi DELIVERED.")) return;
        setLoading(true);
        try {
            await adminService.updateOrderStatus(orderId, { status: 'delivered' });
            loadData();
        } catch (error) {
            showToast.error('Gagal update status: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
            setShowActionDropdown(false);
        }
    };

    useEffect(() => {
        if (orderId) {
            loadData();
        }
    }, [orderId]);

    const loadData = async () => {
        try {
            const [orderData, invoicesData, carriersData, ratesData] = await Promise.all([
                adminService.getOrder(orderId),
                adminService.getOrderInvoices(orderId),
                adminService.getCarriers(),
                adminService.getShippingRates()
            ]);
            // Backend returns { order: {...}, tracking_url: "..." }
            setOrder(orderData.order || orderData);
            setInvoices(Array.isArray(invoicesData) ? invoicesData : (invoicesData.data || []));
            setCarriers(carriersData.data || []);
            setShippingRates(Array.isArray(ratesData) ? ratesData : (ratesData.data || []));
        } catch (error) {
            console.error("Failed to load order", error);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            navigate('/admin/orders');
        }
    };

    const handleShip = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminService.shipOrder(orderId, formData);
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal ship order: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminService.updateOrderStatus(orderId, formData);
            setShowModal(null);
            loadData();
            showToast.success('Berhasil update data pengiriman.');
        } catch (error) {
            showToast.error('Gagal update data pengiriman: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (e) => {
        e.preventDefault();
        try {
            await adminService.cancelOrder(orderId, { reason: formData.reason });
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal cancel order: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleApprovePayment = async () => {
        if (!confirm("Apakah Anda yakin ingin menyetujui pembayaran ini? Invoice akan ditandai LUNAS.")) return;
        setVerifying(true);
        try {
            await adminService.payInvoice(verifyModal.invoice.id);
            setVerifyModal({ isOpen: false, invoice: null });
            loadData();
            showToast.success("Pembayaran berhasil diverifikasi.");
        } catch (error) {
            showToast.error('Gagal verifikasi pembayaran: ' + (error.response?.data?.error || error.message));
        } finally {
            setVerifying(false);
        }
    };

    const handleRefund = async (e) => {
        e.preventDefault();
        try {
            await adminService.refundOrder(orderId, formData);
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal proses refund: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!formData.note) return;
        try {
            await adminService.addOrderNote(orderId, formData.note);
            setShowModal(null);
            loadData();
        } catch (error) {
            showToast.error('Gagal tambah note: ' + (error.response?.data?.error || error.message));
        }
    };

    const handleInvoicePayment = async (invoiceId) => {
        if (!confirm("Confirm manual payment for this invoice?")) return;
        try {
            await adminService.payInvoice(invoiceId);
            loadData();
        } catch (error) {
            showToast.error("Failed to pay invoice: " + (error.response?.data?.error || error.message));
        }
    };

    const handleOpenBalance = async () => {
        if (!confirm("Open balance payment for this order? Customer will be notified.")) return;
        try {
            await adminService.openBalanceDue(orderId);
            loadData();
        } catch (error) {
            showToast.error("Failed to open balance: " + (error.response?.data?.error || error.message));
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
            processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
            shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        };
        return styles[status] || 'bg-white/5 text-gray-500 border-white/10';
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Mengakses Registri Pesanan...</p>
        </div>
    );

    if (!order) return (
        <div className="p-24 text-center">
            <HiOutlineXCircle className="w-20 h-20 text-rose-500 mx-auto mb-6 opacity-20" />
            <h3 className="text-white font-bold text-2xl italic normal-case">Pesanan tidak terlacak</h3>
            <p className="text-gray-500 mt-2 mb-8 italic normal-case">Catatan yang Anda cari telah dihapus atau dipindahkan.</p>
            <button onClick={handleBack} className="text-blue-400 font-black uppercase tracking-widest text-[10px] hover:underline">← KEMBALI KE DAFTAR</button>
        </div>
    );

    const isPO = order.items?.some(item => item.product?.product_type === 'po') || order?.invoices?.some(inv => inv.type === 'deposit');

    return (
        <div className="p-8 space-y-8 animate-in fade-in zoom-in-95 duration-700">
            {/* Header Control */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <button onClick={handleBack} className="p-4 glass-card rounded-lg text-gray-400 hover:text-white transition-all shadow-sm group">
                        <HiOutlineArrowNarrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div>
                        <div className="flex items-center gap-4">
                            <h2 className="text-3xl font-bold text-white tracking-tight">PESANAN #{order.order_number?.split('-').pop()}</h2>
                            <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/20 backdrop-blur-md ${getStatusBadge(order.status)}`}>
                                {order.status === 'pending' ? 'MENUNGGU' :
                                    order.status === 'processing' ? 'DIPROSES' :
                                        order.status === 'shipped' ? 'DIKIRIM' :
                                            order.status === 'delivered' ? 'DITERIMA' :
                                                order.status === 'paid' ? 'LUNAS' :
                                                    order.status === 'cancelled' ? 'DIBATALKAN' : order.status}
                            </span>
                        </div>
                        <p className="admin-label mt-1 opacity-60 normal-case">Diverifikasi pada {new Date(order.created_at).toLocaleString('id-ID')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => window.open(`/admin/orders/${orderId}/packing-slip`, '_blank')} className="flex items-center gap-2 p-3 glass-card rounded-lg text-gray-400 hover:text-white transition-all h-[48px]" title="Cetak Packing Slip">
                        <HiOutlinePrinter className="w-5 h-5" />
                    </button>
                    {hasPermission('order.edit') && (
                        <div className="relative">
                            <button
                                onClick={() => setShowActionDropdown(!showActionDropdown)}
                                className="btn-primary"
                            >
                                <HiOutlineDotsVertical /> PUSAT AKSI
                            </button>
                            {showActionDropdown && (
                                <div className="absolute right-0 top-full mt-2 w-64 bg-[#0F172A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 space-y-1">
                                        {(order.status === 'shipped' || order.status === 'processing') && (
                                            <button
                                                onClick={handleMarkDelivered}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-emerald-400 font-bold text-xs flex items-center gap-3 transition-colors"
                                            >
                                                <HiOutlineCheckCircle className="w-4 h-4" /> KONFIRMASI DITERIMA
                                            </button>
                                        )}
                                        {order.status === 'processing' && (
                                            <button
                                                onClick={() => {
                                                    // Auto-fill carrier from order.shipping_method
                                                    // Usually looks like "J&T - EZ" or "SICEPAT - HALU"
                                                    const method = order.shipping_method || "";
                                                    const suggestedCarrier = method.split(" - ")[0] || method;

                                                    setFormData({
                                                        ...formData,
                                                        carrier: suggestedCarrier,
                                                        tracking_number: "" // Clear old ones
                                                    });
                                                    setShowModal('ship');
                                                    setShowActionDropdown(false);
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-blue-400 font-bold text-xs flex items-center gap-3 transition-colors"
                                            >
                                                <HiOutlineTruck className="w-4 h-4" /> KIRIM PAKET (DISPATCH)
                                            </button>
                                        )}
                                        <button onClick={() => window.open(`/admin/orders/${orderId}/packing-slip`, '_blank')} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white font-bold text-xs flex items-center gap-3 transition-colors">
                                            <HiOutlinePrinter className="w-4 h-4" /> CETAK PACKING SLIP
                                        </button>
                                        <button onClick={() => window.open(`/admin/orders/${orderId}/shipping-label`, '_blank')} className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white font-bold text-xs flex items-center gap-3 transition-colors">
                                            <HiOutlineClipboardList className="w-4 h-4" /> CETAK SHIPPING LABEL
                                        </button>
                                        <div className="h-px bg-white/10 my-1"></div>
                                        {order.status !== 'cancelled' && hasPermission('order.edit') && (
                                            <button
                                                onClick={() => { setShowModal('cancel'); setShowActionDropdown(false); }}
                                                className="w-full text-left px-4 py-3 hover:bg-rose-500/10 rounded-xl text-rose-500 font-bold text-xs flex items-center gap-3 transition-colors"
                                            >
                                                <HiOutlineXCircle className="w-4 h-4" /> BATALKAN PESANAN
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Item Register */}
                    <div className="glass-card rounded-xl overflow-hidden border border-white/5">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                            <h3 className="text-white font-bold text-lg normal-case flex items-center gap-3">
                                <HiOutlineClipboardList className="text-blue-500" /> Alokasi Inventaris
                            </h3>
                            <span className="admin-label !mb-0">{order.items?.length || 0} UNIT TERSEDIA</span>
                        </div>
                        <div className="p-8 space-y-6">
                            {order.items?.map((item, i) => (
                                <div key={i} className="flex gap-6 items-center group">
                                    <div className="w-24 h-24 bg-white/5 rounded-3xl border border-white/5 flex-shrink-0 overflow-hidden relative">
                                        {item.product?.images?.[0] ? (
                                            <img src={item.product.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                                        )}
                                        <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-tl-xl border-t border-l border-white/20">
                                            x{item.quantity}
                                        </div>
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-white font-bold text-lg normal-case truncate">{item.product?.name || 'Legacy Module'}</h4>
                                        <p className="admin-label mt-1 mb-4 normal-case opacity-60">{item.product?.sku || 'UNKNOWN-SKU'}</p>
                                        <div className="flex gap-2">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${isPO ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                                                {isPO ? 'PO' : (item.product?.product_type?.toUpperCase() || 'READY')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="admin-label">SUB-ALOKASI</p>
                                        <p className="text-xl font-bold text-white tabular-nums">Rp {item.total?.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Summary Block */}
                        <div className="p-8 bg-blue-500/[0.02] border-t border-white/5 flex justify-end">
                            <div className="w-80 space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-600">
                                    <span>Subtotal</span>
                                    <span className="text-white">Rp {order.subtotal_amount?.toLocaleString() || order.total_amount?.toLocaleString()}</span>
                                </div>
                                {order.shipping_cost > 0 && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-600">
                                        <span>Pengiriman ({order.shipping_method || 'Standard'})</span>
                                        <span className="text-white">Rp {order.shipping_cost?.toLocaleString()}</span>
                                    </div>
                                )}
                                {order.discount_amount > 0 && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                        <span>Diskon {order.coupon_code && `(${order.coupon_code})`}</span>
                                        <span>- Rp {order.discount_amount?.toLocaleString()}</span>
                                    </div>
                                )}
                                {order.deposit_paid > 0 && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-500">
                                        <span>DP Terbayar (Deposit)</span>
                                        <span>- Rp {order.deposit_paid?.toLocaleString()}</span>
                                    </div>
                                )}
                                {order.remaining_balance > 0 && order.remaining_balance !== order.total_amount && (
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-amber-500">
                                        <span>Sisa Tagihan</span>
                                        <span>Rp {order.remaining_balance?.toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="pt-4 border-t border-white/10 flex justify-between items-end">
                                    <span className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em]">Total Keseluruhan</span>
                                    <span className="text-3xl font-black text-white tabular-nums tracking-tighter">Rp {order.total_amount?.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Logistic Node */}
                    {(order.tracking_number || order.carrier) && (
                        <div className="glass-card rounded-[2.5rem] p-8 border border-purple-500/20 bg-purple-500/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[100px] -mr-32 -mt-32"></div>
                            <h3 className="text-purple-400 font-bold italic normal-case flex items-center gap-3 mb-6 relative z-10">
                                <HiOutlineTruck className="w-6 h-6" /> DATA PENGIRIMAN AKTIF
                            </h3>
                            <div className="grid grid-cols-2 gap-12 relative z-10">
                                <div>
                                    <p className="text-[10px] text-purple-400/50 font-black uppercase tracking-[0.2em] mb-2">Kurir / Vendor</p>
                                    <p className="text-white font-bold text-xl italic normal-case">{order.carrier || 'BELUM DITENTUKAN'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-purple-400/50 font-black uppercase tracking-[0.2em] mb-2">Nomor Resi</p>
                                    <div className="flex flex-col">
                                        <p className="text-white font-black text-xl font-mono tracking-widest">{order.tracking_number || 'AWAITING TRACKING ID'}</p>
                                        {!order.tracking_number && (
                                            <button
                                                onClick={() => {
                                                    setFormData({ ...formData, tracking_number: '', carrier: order.carrier || '', fulfillment_status: 'shipped' });
                                                    setShowModal('updateStatus');
                                                }}
                                                className="text-[10px] text-purple-400 hover:text-white uppercase font-bold tracking-widest mt-2 text-left underline w-fit"
                                            >
                                                Update Resi Manual
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PO Protocol Controls */}
                    {isPO && (
                        <div className="glass-card rounded-[2.5rem] p-8 border border-amber-500/20 bg-amber-500/5 relative overflow-hidden">
                            <div className="p-4 border-b border-amber-500/10 flex items-center justify-between mb-6">
                                <h3 className="text-amber-400 font-bold italic normal-case flex items-center gap-3">
                                    <HiOutlineClock className="w-6 h-6" /> PROTOKOL PRE-ORDER
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500/50">KONSOL MANAJEMEN</span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Mark Arrived Action */}
                                {invoices.find(inv => inv.type === 'balance' && inv.status === 'pending_arrival') || (isPO && order.status === 'processing' && order.payment_status === 'paid') ? (
                                    <div className="space-y-4">
                                        <p className="text-gray-400 text-xs">Barang sudah sampai di gudang? Update status untuk pelanggan.</p>
                                        <button
                                            onClick={async () => {
                                                if (!hasPermission('order.manage')) return;
                                                // Smart Confirmation Logic
                                                const isPaid = order.payment_status === 'paid' || order.remaining_balance <= 0;
                                                const confirmMsg = isPaid
                                                    ? "KONFIRMASI KEDATANGAN: Pesanan sudah LUNAS. Status akan berubah menjadi DIPROSES (Siap Kirim) dan pelanggan akan menerima email."
                                                    : "KONFIRMASI KEDATANGAN: Pesanan masih memiliki SISA TAGIHAN. Invoice sisa pembayaran akan diterbitkan dan pelanggan akan diminta melunasi.";

                                                if (confirm(confirmMsg)) {
                                                    try {
                                                        await adminService.markOrderArrived(orderId);
                                                        loadData();
                                                    } catch (e) { showToast.error("Aksi Gagal: " + e.message); }
                                                }
                                            }}
                                            disabled={!hasPermission('order.edit')}
                                            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                                        >
                                            TANDAI BARANG TIBA
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 opacity-50 cursor-not-allowed">
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">STATUS KEDATANGAN</p>
                                        <p className="text-white font-bold text-sm">
                                            {invoices.find(inv => inv.type === 'balance')?.status === 'unpaid' ? 'MENUNGGU PELUNASAN' :
                                                invoices.find(inv => inv.type === 'balance')?.status === 'paid' ? 'LUNAS / SELESAI' :
                                                    order.status === 'processing' ? 'TIBA - SIAP KIRIM' : 'MENUNGGU PROTOKOL'}
                                        </p>
                                    </div>
                                )}

                                {/* Force Cancel Action */}
                                {['cancelled', 'completed', 'refunded'].includes(order.status) ? (
                                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 opacity-50">
                                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">PROTOCOL STATUS</p>
                                        <p className="text-white font-bold text-sm">ORDER FINALIZED ({order.status.toUpperCase()})</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <p className="text-gray-400 text-xs">Customer non-responsive? Forfeit deposit and release stock.</p>
                                        <button
                                            onClick={async () => {
                                                if (confirm("GHOST PROTOCOL: Force Cancel Order? \n\n⚠️ DEPOSIT WILL BE FORFEITED (Profit)\n⚠️ Stock will be RELEASED\n⚠️ Customer will be flagged\n\nProceed with caution.")) {
                                                    try {
                                                        await adminService.forceCancelPO(orderId);
                                                        loadData();
                                                    } catch (e) { showToast.error("Action Failed: " + (e.response?.data?.error || e.message)); }
                                                }
                                            }}
                                            disabled={!hasPermission('order.ghost_protocol')}
                                            className="w-full py-4 bg-transparent border border-rose-500 text-rose-500 hover:bg-rose-500 hover:text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all disabled:opacity-50"
                                        >
                                            FORCE CANCEL (GHOST)
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Ledger Block */}
                    <div className="glass-card rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <h3 className="text-white font-bold italic normal-case flex items-center gap-3">
                                <HiOutlineCash className="text-emerald-500" /> Buku Besar Transaksi
                            </h3>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/50">{invoices.length} INVOICE DITERBITKAN</span>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {invoices.map((inv) => (
                                <div key={inv.id} className="p-6 bg-white/5 rounded-[2rem] border border-white/5 flex flex-col justify-between group hover:border-emerald-500/30 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <p className="text-white font-black text-lg font-mono">#{inv.invoice_number?.split('-').pop()}</p>
                                            <p className="text-gray-600 text-[10px] font-black uppercase tracking-widest mt-1">{inv.type?.toUpperCase()} PROTOCOL</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${inv.status === 'paid' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]' :
                                            inv.status === 'awaiting_approval' ? 'text-blue-400 border-blue-500/20 bg-blue-500/10 animate-pulse' :
                                                'text-amber-400 border-amber-500/20 bg-amber-500/10'
                                            }`}>
                                            {inv.status === 'awaiting_approval' ? 'BUTUH KONFIRMASI' : inv.status}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <p className="text-2xl font-black text-white tabular-nums">Rp {inv.amount?.toLocaleString()}</p>
                                        <div className="flex gap-2">
                                            {inv.payment_proof && (
                                                <button
                                                    onClick={() => setVerifyModal({ isOpen: true, invoice: inv })}
                                                    className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                                                >
                                                    <HiOutlineClipboardList /> LIHAT BUKTI
                                                </button>
                                            )}
                                            {inv.status !== 'paid' && hasPermission('finance.manage') && (
                                                <button onClick={() => handleInvoicePayment(inv.id)} className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-all underline decoration-emerald-500/30 underline-offset-4">SETTLE NOW</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-8">
                    {/* Identity Module */}
                    <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-16 -mt-16"></div>
                        <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <HiOutlineUser /> Identitas Pembeli
                        </h3>
                        <div className="flex items-center gap-6 mb-8 relative z-10">
                            <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-blue-500/20">
                                {order.user?.username?.[0]?.toUpperCase() || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-white font-black text-xl italic normal-case truncate">{order.user?.full_name || 'Anonymous'}</p>
                                <p className="text-gray-600 text-[10px] uppercase font-black tracking-widest mt-1 truncate">{order.user?.email}</p>
                                {order.user?.phone && (
                                    <p className="text-blue-400 text-[10px] uppercase font-black tracking-widest mt-1 flex items-center gap-1">
                                        <HiOutlinePhone className="w-3 h-3" /> {order.user.phone}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6 relative z-10">
                            <div>
                                <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest block mb-2">Detail Penagihan</span>
                                <div className="p-5 bg-white/5 border border-white/5 rounded-3xl text-xs italic normal-case leading-relaxed shadow-inner shadow-black/20">
                                    <p className="text-white font-bold text-base not-italic mb-1">{order.billing_first_name} {order.billing_last_name}</p>
                                    {order.billing_company && <p className="text-gray-400 font-semibold flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {order.billing_company}</p>}
                                    <div className="text-gray-400 space-y-1 mb-5">
                                        <p className="text-sm">{order.billing_address_1}</p>
                                        {order.billing_address_2 && <p className="text-sm">{order.billing_address_2}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                        <div>
                                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">KOTA/KABUPATEN</span>
                                            <span className="text-gray-300 not-italic text-sm">{order.billing_city || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">PROVINSI/STATE</span>
                                            <span className="text-gray-300 not-italic text-sm">{order.billing_state || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">KODE POS</span>
                                            <span className="text-gray-300 not-italic text-sm">{order.billing_postcode || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block mb-1">NEGARA</span>
                                            <span className="text-blue-400 font-semibold not-italic text-sm">{getFullCountryName(order.billing_country) || 'Tidak ditentukan'}</span>
                                        </div>
                                    </div>
                                    <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-3">
                                        <p className="text-gray-300 flex items-center gap-3 not-italic text-sm font-medium">
                                            <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><HiOutlinePhone className="w-4 h-4" /></span>
                                            +{order.billing_phone?.replace(/^\+/, '') || '-'}
                                        </p>
                                        <p className="text-gray-300 flex items-center gap-3 not-italic text-sm font-medium">
                                            <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">✉️</span>
                                            <span className="lowercase">{order.billing_email || '-'}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Address (if different) */}
                            {order.ship_to_different && (
                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest block mb-2">Alamat Pengiriman (Berbeda)</span>
                                    <div className="p-5 bg-purple-500/5 border border-purple-500/20 rounded-3xl text-xs italic normal-case leading-relaxed shadow-inner shadow-black/20">
                                        <p className="text-white font-bold text-base not-italic mb-1">{order.shipping_first_name} {order.shipping_last_name}</p>
                                        {order.shipping_company && <p className="text-gray-400 font-semibold flex items-center gap-2 mb-3"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {order.shipping_company}</p>}
                                        <div className="text-purple-200/50 space-y-1 mb-5">
                                            <p className="text-sm">{order.shipping_address_1}</p>
                                            {order.shipping_address_2 && <p className="text-sm">{order.shipping_address_2}</p>}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-purple-500/10">
                                            <div>
                                                <span className="text-[9px] text-purple-400/50 font-black uppercase tracking-widest block mb-1">KOTA/KABUPATEN</span>
                                                <span className="text-purple-100 not-italic text-sm">{order.shipping_city || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-purple-400/50 font-black uppercase tracking-widest block mb-1">PROVINSI/STATE</span>
                                                <span className="text-purple-100 not-italic text-sm">{order.shipping_state || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-purple-400/50 font-black uppercase tracking-widest block mb-1">KODE POS</span>
                                                <span className="text-purple-100 not-italic text-sm">{order.shipping_postcode || '-'}</span>
                                            </div>
                                            <div>
                                                <span className="text-[9px] text-purple-400/50 font-black uppercase tracking-widest block mb-1">NEGARA</span>
                                                <span className="text-purple-400 font-bold not-italic text-sm">{getFullCountryName(order.shipping_country) || 'Tidak ditentukan'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Payment & Shipping Method */}
                            <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest block mb-1">Pembayaran</span>
                                    <p className="text-emerald-400 text-xs font-medium">{order.payment_method_title || order.payment_method || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-700 text-[10px] font-black uppercase tracking-widest block mb-1">Kurir</span>
                                    <p className="text-purple-400 text-xs font-medium">{order.shipping_method || 'Standard'}</p>
                                </div>
                            </div>

                            {order.notes && (
                                <div className="mt-6 p-4 bg-white/5 rounded-2xl border-l-2 border-blue-500">
                                    <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest block mb-1">Catatan Pelanggan</span>
                                    <p className="text-gray-400 text-xs italic normal-case">"{order.notes}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Operational Hub */}
                    <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                        <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <HiOutlineDotsVertical /> Pusat Sistem Kontrol
                        </h3>
                        <div className="space-y-4">
                            {order.status === 'processing' && hasPermission('order.edit') && (
                                <button
                                    onClick={() => {
                                        const method = order.shipping_method || "";
                                        const suggestedCarrier = method.split(" - ")[0] || method;
                                        setFormData({
                                            ...formData,
                                            carrier: suggestedCarrier,
                                            tracking_number: ""
                                        });
                                        setShowModal('ship');
                                    }}
                                    className="btn-primary w-full h-[56px] text-base group"
                                >
                                    <HiOutlineTruck className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    MULAI PENGIRIMAN
                                </button>
                            )}
                            {order.status === 'shipped' && hasPermission('order.edit') && (
                                <button onClick={handleMarkDelivered} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-lg font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 group">
                                    <HiOutlineCheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    KONFIRMASI TERIMA
                                </button>
                            )}
                            {hasPermission('order.edit') && (
                                <button onClick={() => setShowModal('note')} className="btn-secondary w-full h-[56px] text-base">
                                    <HiOutlineAnnotation /> LOG CATATAN INTERNAL
                                </button>
                            )}

                            {/* PO: Open Balance Action */}
                            {isPO && order.payment_status === 'deposit_paid' && hasPermission('order.edit') && (
                                <button onClick={handleOpenBalance} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20">
                                    <HiOutlineCash className="w-5 h-5" />
                                    BUKA PELUNASAN SISA
                                </button>
                            )}
                            {order.status !== 'cancelled' && hasPermission('order.edit') && (
                                <button onClick={() => setShowModal('cancel')} className="w-full hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 p-5 rounded-2xl font-bold border border-transparent hover:border-rose-500/20 transition-all flex items-center justify-center gap-3 text-[10px] uppercase tracking-widest">
                                    <HiOutlineXCircle /> BATALKAN TRANSAKSI
                                </button>
                            )}
                            {!hasPermission('order.edit') && !hasPermission('order.manage') && (
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-center">
                                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Mode Baca Saja</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Trace Logs */}
                    {order.logs && order.logs.length > 0 && (
                        <div className="glass-card rounded-[2.5rem] p-8 border border-white/5">
                            <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <HiOutlineClock /> Jalur Audit Pesanan
                            </h3>
                            <div className="space-y-6 relative ml-4">
                                <div className="absolute top-0 bottom-0 left-[-1rem] w-px bg-white/5"></div>
                                {order.logs.map((log, i) => (
                                    <div key={log.id} className="relative">
                                        <div className="absolute left-[-1.25rem] top-1.5 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest">{log.action}</span>
                                            <span className="text-gray-700 text-[10px] font-bold">{new Date(log.created_at).toLocaleTimeString()}</span>
                                        </div>
                                        <p className="text-gray-500 text-xs italic normal-case leading-tight">{log.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {
                showModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                        <div className="glass-card rounded-[3rem] w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                            <div className="p-10 border-b border-white/5 bg-white/[0.01]">
                                <h3 className="text-white font-bold text-2xl tracking-tight italic normal-case flex items-center gap-3">
                                    {showModal === 'ship' ? <HiOutlineTruck className="text-blue-500" /> : <HiOutlineAnnotation className="text-amber-500" />}
                                    {showModal === 'ship' ? 'Kirim Pesanan' :
                                        showModal === 'cancel' ? 'Batalkan Transaksi' :
                                            showModal === 'refund' ? 'Proses Refund' :
                                                showModal === 'updateStatus' ? 'Update Data Pengiriman' : 'Tambah Catatan'}
                                </h3>
                            </div>
                            <form onSubmit={
                                showModal === 'ship' ? handleShip :
                                    showModal === 'cancel' ? handleCancel :
                                        showModal === 'refund' ? handleRefund :
                                            showModal === 'updateStatus' ? handleUpdateStatus :
                                                handleAddNote
                            } className="p-10 space-y-8">
                                {showModal === 'ship' || showModal === 'updateStatus' ? (
                                    <>
                                        <div className="space-y-3">
                                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Kurir Terpilih (Otomatis)</label>
                                            <input
                                                type="text"
                                                list="carrier-options"
                                                value={formData.carrier || ''}
                                                onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-blue-500/50"
                                                placeholder="Pilih dari daftar atau ketik manual..."
                                                required
                                            />
                                            <datalist id="carrier-options">
                                                {carriers.map(c => <option key={c.id} value={c.name} />)}

                                                {shippingRates.filter(r => r.zone === 'CARGO' || r.method === 'AIR' || r.method === 'SHIP' || r.method === 'SEA').map(r => (
                                                    <option key={r.id} value={`${r.method} (Cargo)`}>
                                                        {r.method === 'AIR' ? '✈️ ' : '🚢 '}{r.method} - Rp {r.cost_per_kg?.toLocaleString()}/kg
                                                    </option>
                                                ))}
                                                {shippingRates.filter(r => r.zone === 'CARGO' || r.method === 'AIR' || r.method === 'SHIP' || r.method === 'SEA').length === 0 && (
                                                    <>
                                                        <option value="By Air (Manual)" />
                                                        <option value="By Ship (Manual)" />
                                                    </>
                                                )}
                                                <option value="DHL Express" />
                                                <option value="FedEx" />
                                            </datalist>
                                            <p className="text-[10px] text-gray-500 italic px-2">
                                                Pelanggan memilih: <span className="text-blue-400 font-bold">{order.shipping_method || 'Tidak ada'}</span>
                                            </p>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Identitas Resi (Opsional)</label>
                                                <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-500/20">BITESHIP AUTO</span>
                                            </div>
                                            <input
                                                type="text"
                                                value={formData.tracking_number || ''}
                                                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-mono uppercase focus:outline-none focus:border-blue-500/50"
                                                placeholder="Kosongkan jika ingin resi otomatis..."
                                            />
                                            <p className="text-[9px] text-gray-600 leading-relaxed px-2">
                                                Jika dikosongkan, sistem akan otomatis melakukan pengajuan (Booking) ke Biteship dan resi akan muncul otomatis setelah kurir memprosesnya.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-3">
                                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Alasan Operasional</label>
                                        <textarea value={formData.reason || formData.note || ''} onChange={(e) => setFormData({ ...formData, [showModal === 'note' ? 'note' : 'reason']: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-white h-32 focus:outline-none focus:border-blue-500/50 resize-none italic normal-case" required />
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <button type="button" onClick={() => setShowModal(null)} className="flex-1 glass-card border-white/10 py-5 rounded-2xl font-bold uppercase text-[10px] tracking-widest text-gray-400 hover:text-white transition-all" disabled={loading}>BATAL</button>
                                    <button type="submit" className={`flex-1 ${showModal === 'cancel' ? 'bg-rose-600' : 'bg-blue-600'} text-white py-5 rounded-2xl font-bold uppercase text-[10px] tracking-[0.2em] shadow-xl shadow-blue-500/20 disabled:opacity-50`} disabled={loading}>
                                        {loading ? 'MEMPROSES...' : 'PROSES'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
            {/* Verify Payment Modal */}
            {
                verifyModal.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                        <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh]">
                            <button
                                onClick={() => setVerifyModal({ isOpen: false, invoice: null })}
                                className="absolute top-4 right-4 text-gray-400 hover:text-white z-10 bg-black/50 rounded-full p-2"
                            >
                                <HiOutlineXCircle className="w-6 h-6" />
                            </button>

                            <div className="flex-1 overflow-y-auto min-h-0 mb-4">
                                <h3 className="text-lg font-bold text-white mb-4 sticky top-0 bg-[#111] py-2 border-b border-white/5">Verifikasi Pembayaran Manual</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">BUKTI TRANSFER</p>
                                        <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
                                            <a href={`${import.meta.env.VITE_UPLOAD_BASE_URL || 'http://localhost:5000'}${verifyModal.invoice?.payment_proof}`} target="_blank" rel="noreferrer">
                                                <img
                                                    src={`${import.meta.env.VITE_UPLOAD_BASE_URL || 'http://localhost:5000'}${verifyModal.invoice?.payment_proof}`}
                                                    alt="Bukti Transfer"
                                                    className="w-full h-auto object-contain hover:scale-105 transition-transform duration-500"
                                                />
                                            </a>
                                        </div>
                                        <p className="text-[10px] text-center text-gray-500 mt-2 italic">Klik gambar untuk memperbesar</p>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">INVOICE</p>
                                            <p className="text-white font-mono">{verifyModal.invoice?.invoice_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">JUMLAH TAGIHAN</p>
                                            <p className="text-xl text-white font-black">Rp {verifyModal.invoice?.amount?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">CATATAN CUSTOMER</p>
                                            <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-sm text-gray-300 italic">
                                                {verifyModal.invoice?.payment_note || 'Tidak ada catatan'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#111]">
                                <button
                                    onClick={() => setVerifyModal({ isOpen: false, invoice: null })}
                                    className="px-6 py-3 rounded-xl border border-white/10 text-white hover:bg-white/5 transition-all font-bold text-xs uppercase tracking-widest"
                                >
                                    Tutup
                                </button>
                                <button
                                    onClick={handleApprovePayment}
                                    disabled={verifying || verifyModal.invoice?.status === 'paid'}
                                    className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {verifying ? 'Memverifikasi...' : verifyModal.invoice?.status === 'paid' ? 'Sudah Lunas' : 'TERIMA PEMBAYARAN'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default OrderDetail;
