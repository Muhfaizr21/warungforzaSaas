import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Dropdown } from "../ui/Dropdown";
import { DropdownItem } from "../ui/DropdownItem";
import { HiOutlineBell } from "react-icons/hi";
import api, { adminService } from "../../../../services/adminService";
import { formatDistanceToNow } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    const fetchNotifications = async () => {
        try {
            const res = await adminService.getAdminNotifications();
            setNotifications(res.data || []);
            setUnreadCount(res.unread_count || 0);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchNotifications();

        // Polling every 60 seconds (optional, but good for real-time feel)
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleClick = () => {
        toggleDropdown();
    };

    const handleMarkAsRead = async (id, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        try {
            await adminService.markAdminNotificationAsRead(id);
            fetchNotifications(); // Refresh list
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    return (
        <div className="relative">
            <button
                className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={handleClick}
            >
                <span
                    className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${unreadCount === 0 ? "hidden" : "flex"}`}
                >
                    <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
                </span>
                <HiOutlineBell className="w-5 h-5 fill-current" />
            </button>
            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute -right-[240px] mt-[17px] flex h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900 sm:w-[361px] lg:right-0"
            >
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
                    <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-tighter italic">
                        Notifikasi
                    </h5>
                    <button
                        onClick={toggleDropdown}
                        className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                        <svg
                            className="fill-current"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>
                <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
                    {notifications.length === 0 ? (
                        <li className="px-4 py-8 text-center text-gray-500 text-sm dark:text-gray-400">
                            Tidak ada notifikasi baru.
                        </li>
                    ) : (
                        notifications.map((notif) => {
                            let link = "#";
                            let metadata = {};
                            try {
                                metadata = JSON.parse(notif.metadata);
                                if (metadata.order_id) link = `/admin/orders/${metadata.order_id}`;
                                if (metadata.product_id) link = `/admin/products/${metadata.product_id}`;
                            } catch (e) { }

                            return (
                                <li key={notif.id} className={notif.is_read ? "opacity-60 grayscale" : ""}>
                                    <Link
                                        to={link}
                                        onClick={() => !notif.is_read && handleMarkAsRead(notif.id)}
                                        className={`flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/5 ${!notif.is_read ? 'bg-rose-50/30 dark:bg-rose-900/10' : ''}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <span className="mb-1 block text-theme-sm text-gray-600 dark:text-gray-300">
                                                <span className="font-semibold text-gray-900 dark:text-white mr-1">
                                                    {notif.type.replace(/_/g, ' ')}:
                                                </span>
                                                {notif.subject}
                                            </span>
                                            <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-500 mt-1.5">
                                                <span>{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: localeID })}</span>
                                            </span>
                                        </div>
                                        {!notif.is_read && (
                                            <button
                                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                                title="Tandai sudah dibaca"
                                                className="self-center p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm transition-all z-10"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                        )}
                                    </Link>
                                </li>
                            );
                        })
                    )}
                </ul>
                <div className="mt-3 flex gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={(e) => handleMarkAsRead('all', e)}
                            className="flex-1 block px-2 py-2 text-xs font-medium text-center text-gray-600 bg-gray-100 border border-transparent rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                        >
                            Tandai Semua Dibaca
                        </button>
                    )}
                    <Link
                        to="/admin/inbox"
                        className="flex-1 block px-2 py-2 text-xs font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition"
                    >
                        Lihat Semua Notifikasi
                    </Link>
                </div>
            </Dropdown>
        </div>
    );
}
