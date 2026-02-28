import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineBell, HiCheck } from 'react-icons/hi';
import { notificationService } from '../services/notificationService';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const fetchNotifications = async () => {
        try {
            const res = await notificationService.getMyNotifications();
            setNotifications(res.data || []);
            setUnreadCount(res.unread || 0);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        try {
            await notificationService.markAsRead('all');
            setUnreadCount(0);
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error("Failed to mark all read", error);
        }
    };

    const handleItemClick = async (notif) => {
        if (!notif.is_read) {
            try {
                await notificationService.markAsRead(notif.id);
                setUnreadCount(prev => Math.max(0, prev - 1));
                setNotifications(notifications.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
            } catch (error) {
                console.error("Failed to mark read", error);
            }
        }

        // Navigate based on metadata
        try {
            const meta = JSON.parse(notif.metadata || '{}');
            if (meta.order_id) {
                navigate(`/order/${meta.order_id}`);
                setIsOpen(false);
            } else if (meta.product_id) {
                navigate(`/product/${meta.product_id}`); // Or direct to readystock with filter
                setIsOpen(false);
            }
        } catch (e) {
            // ignore
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-white hover:text-neon-cyan transition-colors group p-1"
            >
                <HiOutlineBell className={`w-6 h-6 ${isOpen ? 'text-neon-cyan' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-neon-red text-white text-[9px] font-black h-4 w-4 flex items-center justify-center rounded-full animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-4 w-80 md:w-96 bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-white font-black uppercase tracking-widest text-xs italic">Notifikasi Terkini</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] text-blue-400 hover:text-white font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                                <HiCheck /> Mark All Read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 text-xs italic">
                                No system activity detected.
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {notifications.map(notif => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleItemClick(notif)}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer group ${notif.is_read ? 'opacity-60' : 'bg-blue-500/5'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${notif.type === 'ORDER_UPDATE' ? 'text-blue-400 border-blue-500/30' :
                                                notif.type === 'RESTOCK_ALERT' ? 'text-emerald-400 border-emerald-500/30' :
                                                    'text-gray-400 border-gray-500/30'
                                                }`}>
                                                {notif.type.replace('_', ' ')}
                                            </span>
                                            <span className="text-[9px] text-gray-600 font-mono">
                                                {new Date(notif.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className={`text-sm font-bold mb-1 ${notif.is_read ? 'text-gray-400' : 'text-white'}`}>
                                            {notif.subject}
                                        </p>
                                        <div className="mt-2 text-[9px] text-neon-cyan opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest font-black">
                                            Access Data Module &rarr;
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
