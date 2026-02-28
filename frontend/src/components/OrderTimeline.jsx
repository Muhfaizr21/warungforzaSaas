import React from 'react';
import { HiCheckCircle, HiClock, HiOutlineCubeTransparent } from 'react-icons/hi';

/**
 * OrderTimeline - Shared component for displaying order status progression
 * Supports both Regular Orders and Pre-Orders (PO)
 */
const OrderTimeline = ({ order, logs = [] }) => {
    const isPO = order?.items?.[0]?.product?.product_type === 'po' || order?.invoices?.some(inv => inv.type === 'deposit');

    // Define Regular Statuses
    const regularStatuses = [
        { key: 'created', label: 'Order Registered', icon: '📦' },
        { key: 'paid', label: 'Payment Authenticated', icon: '💰' },
        { key: 'processing', label: 'Processing', icon: '⚙️' },
        { key: 'shipped', label: 'En Route', icon: '🚚' },
        { key: 'delivered', label: 'Cargo Delivered', icon: '✅' },
    ];

    // Define PO Statuses
    const poStatuses = [
        { key: 'created', label: 'Pre-Order Initiated', icon: '📦' },
        { key: 'deposit_paid', label: 'Deposit Secured', icon: '💰' },
        { key: 'waiting_arrival', label: 'Awaiting Arrival', icon: '⏳', isWait: true },
        { key: 'payment_due', label: 'Arrival (Balance Pending)', icon: '📥' },
        { key: 'paid', label: 'Payment Cleared', icon: '💎' },
        { key: 'processing', label: 'Processing', icon: '⚙️' },
        { key: 'shipped', label: 'En Route', icon: '🚚' },
        { key: 'delivered', label: 'Cargo Delivered', icon: '✅' },
    ];

    const statuses = isPO ? poStatuses : regularStatuses;

    // Determine Logic Progress
    const getProgress = () => {
        const s = order?.status?.toLowerCase();
        const ps = order?.payment_status?.toLowerCase();

        if (s === 'cancelled') return -1;

        if (isPO) {
            if (s === 'completed' || s === 'delivered') return 8; // All done
            if (s === 'shipped') return 7;
            if (s === 'processing' || (ps === 'paid' && s !== 'payment_due')) return 6; // Fully Paid & Processing
            if (ps === 'paid') return 5; // Paid balance
            if (s === 'payment_due' || s === 'waiting_payment') return 4; // Arrived, waiting for balance
            if (s === 'pre_order' || ps === 'deposit_paid') return 3; // Built deposit, waiting for arrival
            if (s === 'pending' || s === 'awaiting_deposit') return 1; // Just created
            return 1;
        } else {
            if (s === 'completed' || s === 'delivered') return 5;
            if (s === 'shipped') return 4;
            if (s === 'processing') return 3;
            if (ps === 'paid') return 2;
            return 1;
        }
    };

    const currentStep = getProgress();
    const isCancelled = currentStep === -1;

    // Get timestamp from logs
    const getTimestamp = (actionKeywords) => {
        const log = logs.find(l => {
            const act = (l.action || '').toLowerCase();
            const note = (l.note || '').toLowerCase();
            return actionKeywords.some(keyword => act.includes(keyword) || note.includes(keyword));
        });
        return log ? new Date(log.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null;
    };

    return (
        <div className="relative">
            {/* Progress Line */}
            <div className={`absolute top-5 left-5 w-0.5 h-[calc(100%-40px)] ${isPO ? 'bg-purple-500/10' : 'bg-white/10'}`} />
            {!isCancelled && (
                <div
                    className={`absolute top-5 left-5 w-0.5 transition-all duration-1000 ease-out ${isPO ? 'bg-gradient-to-b from-purple-500 to-purple-500/50' : 'bg-gradient-to-b from-emerald-500 to-emerald-500/50'}`}
                    style={{ height: `${((currentStep - 1) / Math.max(1, statuses.length - 1)) * 100}%`, maxHeight: 'calc(100% - 40px)' }}
                />
            )}

            {/* Timeline Items */}
            <div className="space-y-6">
                {statuses.map((status, idx) => {
                    const stepNumber = idx + 1;
                    const isCompleted = isCancelled ? false : stepNumber <= currentStep;
                    const isCurrent = isCancelled ? false : stepNumber === currentStep;
                    const isFuture = isCancelled ? true : stepNumber > currentStep;

                    const themeColor = isPO ? 'purple' : 'emerald';

                    // Resolve Timestamps intelligently
                    let timestamp = null;
                    if (isCompleted) {
                        if (status.key === 'created') timestamp = order?.created_at ? new Date(order.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short' }) : null;
                        if (status.key === 'deposit_paid') timestamp = getTimestamp(['deposit', 'payment', 'paid']);
                        if (status.key === 'waiting_arrival') timestamp = getTimestamp(['pre_order']);
                        if (status.key === 'payment_due') timestamp = getTimestamp(['arrived', 'balance']);
                        if (status.key === 'paid' && !isPO) timestamp = getTimestamp(['payment', 'paid', 'success']);
                        if (status.key === 'paid' && isPO) timestamp = getTimestamp(['balance', 'paid', 'success']);
                        if (status.key === 'processing') timestamp = getTimestamp(['processing', 'ready']);
                        if (status.key === 'shipped') timestamp = getTimestamp(['shipped', 'dispatch', 'resi']);
                        if (status.key === 'delivered') timestamp = getTimestamp(['completed', 'delivered', 'receive']);
                    }

                    return (
                        <div key={status.key} className={`flex items-start gap-4 relative transition-opacity duration-500 ${isFuture ? 'opacity-30' : 'opacity-100'}`}>
                            {/* Icon Circle */}
                            <div className={`
                                relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300
                                ${isCompleted
                                    ? `bg-${themeColor}-500/20 border-2 border-${themeColor}-500/50 shadow-[0_0_15px_rgba(var(--tw-colors-${themeColor}-500),0.3)]`
                                    : 'bg-black/50 border border-white/10'
                                }
                                ${isCurrent ? `ring-2 ring-${themeColor}-500/30 ring-offset-2 ring-offset-[#030303] scale-110` : ''}
                            `}>
                                {isCompleted ? (
                                    <HiCheckCircle className={`w-5 h-5 text-${themeColor}-400`} />
                                ) : status.isWait && isCurrent ? (
                                    <HiOutlineCubeTransparent className={`w-5 h-5 text-${themeColor}-400 animate-pulse`} />
                                ) : (
                                    <HiClock className="w-4 h-4 text-gray-500" />
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pb-2 pt-1">
                                <p className={`font-bold text-sm ${isCompleted ? 'text-white' : 'text-gray-500'} ${isCurrent ? `text-${themeColor}-400` : ''}`}>
                                    {status.label}
                                </p>

                                {timestamp && (
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                                        {timestamp}
                                    </p>
                                )}

                                {isCurrent && !isCompleted && (
                                    <p className={`text-xs text-${themeColor}-400/70 mt-1 animate-pulse italic`}>
                                        Standby...
                                    </p>
                                )}

                                {/* Special Context for PO Arrival Waiting */}
                                {status.key === 'waiting_arrival' && isCurrent && (
                                    <div className="mt-3 p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                        <p className="text-xs text-purple-400 font-bold mb-1">Estimated Time of Arrival (ETA)</p>
                                        <p className="text-sm text-white">
                                            {(() => {
                                                try {
                                                    const poConfigStr = order?.items?.[0]?.product?.po_config;
                                                    if (!poConfigStr) return 'Awaiting Manufacturer Brief';
                                                    const config = typeof poConfigStr === 'string' ? JSON.parse(poConfigStr) : poConfigStr;
                                                    return config.eta ? new Date(config.eta).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Incoming';
                                                } catch (e) { return 'Awaiting Clearance'; }
                                            })()}
                                        </p>
                                    </div>
                                )}

                                {/* Special: Tracking info for shipped status */}
                                {status.key === 'shipped' && order?.tracking_number && isCompleted && (
                                    <div className="mt-3 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 backdrop-blur-sm">
                                        <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1">
                                            {order.carrier || 'Logistics Carrier'}
                                        </p>
                                        <div className="flex items-center justify-between gap-4">
                                            <p className="text-lg text-white font-mono tracking-wider font-bold">
                                                {order.tracking_number}
                                            </p>
                                            {order.tracking_url && (
                                                <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500 hover:bg-white hover:text-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all">
                                                    Track Package
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Cancelled State */}
            {isCancelled && (
                <div className="mt-6 p-5 bg-rose-500/10 border border-rose-500/20 rounded-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-rose-400 font-black tracking-widest uppercase text-xs mb-1">Order Terminated</p>
                        <p className="text-xs text-rose-200/50">
                            {getTimestamp(['cancel', 'batal']) || 'Terminated by System'}
                        </p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 opacity-5">
                        <HiClock className="w-24 h-24 text-rose-500" />
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderTimeline;
