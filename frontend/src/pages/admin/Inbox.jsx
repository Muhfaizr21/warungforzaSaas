import React, { useState, useEffect } from 'react';
import contactService from '../../services/contactService';
import { HiOutlineTrash, HiOutlineMailOpen, HiOutlineMail } from 'react-icons/hi';

const Inbox = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        setLoading(true);
        try {
            const res = await contactService.getAdminMessages();
            setMessages(res.data);
        } catch (error) {
            console.error('Failed to load messages', error);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkAsRead = async (id, currentStatus) => {
        if (currentStatus === 'read') return;
        try {
            await contactService.markAsRead(id);
            setMessages(messages.map(msg => msg.id === id ? { ...msg, status: 'read' } : msg));
        } catch (error) {
            console.error('Failed to mark as read', error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this message?')) return;
        try {
            await contactService.deleteMessage(id);
            setMessages(messages.filter(msg => msg.id !== id));
        } catch (error) {
            console.error('Failed to delete message', error);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading inbox...</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <span className="w-1.5 h-8 bg-neon-pink rounded-full"></span>
                Kotak Masuk
            </h1>
            <p className="text-gray-400 mb-8 ml-5">Lihat pesan dari formulir kontak.</p>

            <div className="bg-[#161926] rounded-2xl border border-gray-800 overflow-hidden">
                <table className="w-full text-left text-gray-400">
                    <thead className="bg-black/40 text-gray-500 uppercase text-xs tracking-wider">
                        <tr>
                            <th className="p-6">Status</th>
                            <th className="p-6">Dari</th>
                            <th className="p-6">Pesan</th>
                            <th className="p-6">Tanggal</th>
                            <th className="p-6 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {messages.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">Tidak ada pesan masuk.</td>
                            </tr>
                        ) : (
                            messages.map((msg) => (
                                <tr
                                    key={msg.id}
                                    className={`hover:bg-white/5 transition-colors cursor-pointer ${msg.status === 'unread' ? 'bg-neon-pink/5' : ''}`}
                                    onClick={() => handleMarkAsRead(msg.id, msg.status)}
                                >
                                    <td className="p-6">
                                        {msg.status === 'unread' ? (
                                            <span className="flex items-center gap-2 text-neon-pink font-bold text-xs uppercase tracking-wider">
                                                <span className="w-2 h-2 rounded-full bg-neon-pink animate-pulse"></span>
                                                Baru
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 text-xs font-medium uppercase">Dibaca</span>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <div className="text-white font-bold">{msg.name}</div>
                                        <div className="text-xs">{msg.email}</div>
                                    </td>
                                    <td className="p-6 max-w-md">
                                        <p className="line-clamp-2 text-sm">{msg.message}</p>
                                    </td>
                                    <td className="p-6 text-xs font-mono">
                                        {new Date(msg.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-6 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                            className="text-gray-500 hover:text-red-500 transition-colors p-2"
                                            title="Hapus Pesan"
                                        >
                                            <HiOutlineTrash size={20} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Inbox;
