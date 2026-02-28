import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

const statusIcons = {
    ORDER_CREATED: { icon: '📋', color: 'from-gray-500 to-gray-600', label: 'Order Registered' },
    PAYMENT_CONFIRMED: { icon: '✅', color: 'from-emerald-500 to-green-600', label: 'Payment Authenticated' },
    PICKING_UP: { icon: '📦', color: 'from-amber-500 to-orange-500', label: 'Courier Pickup' },
    PICKED: { icon: '📦', color: 'from-amber-500 to-orange-500', label: 'Package Secured' },
    DROPPING_OFF: { icon: '🏭', color: 'from-blue-500 to-indigo-500', label: 'To Facility' },
    SHIPPED: { icon: '🚚', color: 'from-blue-500 to-cyan-500', label: 'Dispatched' },
    IN_TRANSIT: { icon: '🚛', color: 'from-indigo-500 to-blue-600', label: 'In Transit' },
    OUT_FOR_DELIVERY: { icon: '🛵', color: 'from-rose-500 to-pink-500', label: 'Out for Delivery' },
    DELIVERED: { icon: '🎉', color: 'from-emerald-400 to-teal-500', label: 'Delivered' },
    REJECTED: { icon: '❌', color: 'from-red-500 to-red-700', label: 'Rejected' },
    RETURNED: { icon: '↩️', color: 'from-orange-500 to-red-500', label: 'Returned to Sender' },
    LOST: { icon: '⚠️', color: 'from-red-600 to-red-800', label: 'Missing / Lost' },
};

const getStatusMeta = (status) => statusIcons[status] || { icon: '📍', color: 'from-gray-500 to-gray-600', label: status };

export default function TrackingPanel({ orderId, orderStatus, trackingNumber, carrier, className = '' }) {
    const [tracking, setTracking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        fetchTracking();
    }, [orderId]);

    const fetchTracking = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/customer/orders/${orderId}/tracking`, getAuthHeader());
            setTracking(res.data);
        } catch (err) {
            setError('Unable to retrieve tracking telemetry. Please reattempt.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className={`bg-white/[0.03] border border-white/10 rounded-[8px] p-8 ${className}`}>
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-gray-500 text-[11px] uppercase font-black tracking-widest animate-pulse">Retrieving Tracking Telemetry...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-white/[0.03] border border-rose-600/20 rounded-[8px] p-6 ${className}`}>
                <p className="text-rose-500 text-[11px] uppercase font-black tracking-widest">{error}</p>
                <button onClick={fetchTracking} className="mt-3 text-[10px] text-gray-500 hover:text-white underline transition-colors">Reattempt Synchronization</button>
            </div>
        );
    }

    if (!tracking) return null;

    const currentStatusMeta = getStatusMeta(tracking.status?.toUpperCase() || 'ORDER_CREATED');
    const displayEvents = expanded ? tracking.events : tracking.events?.slice(0, 3);

    return (
        <div className={`bg-white/[0.03] border border-white/10 rounded-[8px] overflow-hidden ${className}`}>
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-gradient-to-r from-blue-600/10 to-transparent">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-[8px] bg-gradient-to-br ${currentStatusMeta.color} flex items-center justify-center text-xl shrink-0 shadow-lg`}>
                            {currentStatusMeta.icon}
                        </div>
                        <div>
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1">Logistics Status</p>
                            <p className="text-white font-black text-base uppercase tracking-tight">{tracking.status_label}</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">Last synchronized: {tracking.last_update}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Route Info */}
            <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                <div className="p-4 text-center">
                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Origin</p>
                    <p className="text-white text-[11px] font-black uppercase truncate">{tracking.origin || 'Warung Forza'}</p>
                </div>
                <div className="p-4 flex items-center justify-center">
                    <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-rose-600 rounded-full" />
                        <div className="w-6 h-px bg-gradient-to-r from-rose-600 to-blue-500" />
                        <div className="text-[10px]">✈️</div>
                        <div className="w-6 h-px bg-gradient-to-r from-blue-500 to-emerald-500" />
                        <div className="w-1 h-1 bg-emerald-500 rounded-full" />
                    </div>
                </div>
                <div className="p-4 text-center">
                    <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">Destination</p>
                    <p className="text-white text-[11px] font-black uppercase truncate">{tracking.destination || '-'}</p>
                </div>
            </div>

            {/* Tracking Number */}
            {tracking.tracking_number && tracking.tracking_number !== '-' && (
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between gap-4">
                    <div>
                        <p className="text-[9px] text-gray-600 uppercase font-black tracking-widest mb-1">
                            Tracking ID {tracking.carrier && `• ${tracking.carrier.toUpperCase()}`}
                        </p>
                        <p className="text-white font-mono font-black text-lg tracking-widest">{tracking.tracking_number}</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigator.clipboard.writeText(tracking.tracking_number)}
                            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[8px] text-[10px] text-gray-400 hover:text-white font-black uppercase tracking-widest transition-all"
                            title="Salin Nomor Resi"
                        >
                            Copy
                        </button>
                        <a
                            href={`https://cekresi.com/?noresi=${tracking.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-[8px] text-[10px] text-emerald-400 hover:text-emerald-300 font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                            title="Lacak dengan CekResi (Lokal/Domestik)"
                        >
                            CekResi
                            <span className="text-[8px] mb-1">↗</span>
                        </a>
                        <a
                            href={`https://parcelsapp.com/en/tracking/${tracking.tracking_number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-[8px] text-[10px] text-blue-400 hover:text-blue-300 font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                            title="Lacak dengan ParcelsApp (Global/Internasional)"
                        >
                            Global Track
                            <span className="text-[8px] mb-1">↗</span>
                        </a>
                    </div>
                </div>
            )}

            {/* Timeline Events */}
            <div className="p-6">
                <p className="text-[9px] text-gray-600 uppercase font-black tracking-[0.3em] mb-6 flex items-center gap-3">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    Package Trajectory Log
                </p>

                <div className="space-y-0">
                    {displayEvents?.map((event, index) => {
                        const meta = getStatusMeta(event.status);
                        const isLatest = index === 0;
                        const isLast = index === displayEvents.length - 1;

                        return (
                            <div key={index} className="flex gap-4 relative">
                                {/* Timeline Line */}
                                {!isLast && (
                                    <div className="absolute left-5 top-10 bottom-0 w-px bg-white/5" />
                                )}

                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-[8px] bg-gradient-to-br ${meta.color} flex items-center justify-center text-base shrink-0 relative z-10 
                                    ${isLatest ? 'shadow-lg ring-2 ring-white/10' : 'opacity-60'}`}>
                                    {meta.icon}
                                </div>

                                {/* Content */}
                                <div className={`pb-6 flex-grow ${isLatest ? '' : 'opacity-50'}`}>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${isLatest ? 'text-white' : 'text-gray-500'}`}>
                                                {meta.label}
                                            </p>
                                            <p className={`text-[11px] mt-1 leading-relaxed ${isLatest ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {event.description}
                                            </p>
                                            {event.location && (
                                                <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                                                    📍 {event.location}
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-[9px] text-gray-600 shrink-0 font-mono">{event.timestamp}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Show More / Less Button */}
                {tracking.events?.length > 3 && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="w-full mt-2 py-3 text-[10px] text-gray-500 hover:text-white font-black uppercase tracking-widest border border-white/5 hover:border-white/20 rounded-[8px] transition-all"
                    >
                        {expanded ? '▲ Hide Sequence' : `▼ View ${tracking.events.length - 3} More Events`}
                    </button>
                )}
            </div>

            {/* Refresh Button */}
            <div className="px-6 pb-6">
                <button
                    onClick={fetchTracking}
                    className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 hover:text-white rounded-[8px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                    🔄 Refresh Tracking
                </button>
            </div>
        </div>
    );
}
