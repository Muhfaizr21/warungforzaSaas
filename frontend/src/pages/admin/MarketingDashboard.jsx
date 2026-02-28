import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import { adminService } from '../../services/adminService';
import {
    HiOutlineSpeakerphone,
    HiOutlineMail,
    HiOutlineHeart,
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineCheck,
    HiOutlineX,
    HiOutlinePaperAirplane,
    HiOutlineBell,
    HiOutlineTag,
    HiOutlineCalendar,
    HiOutlineUsers,
    HiOutlineRefresh,
    HiOutlineShoppingBag
} from 'react-icons/hi';

const MarketingModal = React.memo(({ show, type, onCancel, onSubmit, initialData }) => {
    const [localData, setLocalData] = useState(initialData || {});

    useEffect(() => {
        setLocalData(initialData || {});
    }, [initialData, show]);

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(localData);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="glass-card rounded-3xl w-full max-w-lg shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                    <h3 className="text-white font-bold text-xl tracking-tight italic normal-case">
                        {type === 'announcement' ? 'Kirim Pengumuman' : 'Luncurkan Kampanye'}
                    </h3>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-all"><HiOutlineX className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {type === 'announcement' ? (
                        <>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Judul Kreatif</label>
                                <input type="text" value={localData.title || ''} onChange={(e) => setLocalData({ ...localData, title: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50" placeholder="Judul narasi..." required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Klasifikasi</label>
                                <select value={localData.category || 'INFO'} onChange={(e) => setLocalData({ ...localData, category: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none appearance-none">
                                    <option value="INFO" className="bg-slate-900">Informasi Umum</option>
                                    <option value="PROMO" className="bg-slate-900">Promo Pemasaran</option>
                                    <option value="DELAY" className="bg-slate-900">Penundaan Operasional</option>
                                    <option value="CANCEL" className="bg-slate-900">Pembatalan/Update Produksi</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Ilustrasi (Opsional)</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-full">
                                        <input
                                            type="file"
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    try {
                                                        const res = await adminService.uploadFile(file);
                                                        // Store as array of strings for future multi-image support
                                                        const imgs = localData.images ? (typeof localData.images === 'string' ? JSON.parse(localData.images) : localData.images) : [];
                                                        setLocalData({ ...localData, images: JSON.stringify([...imgs, res.url]) });
                                                    } catch (err) {
                                                        showToast.success("Upload failed");
                                                    }
                                                }
                                            }}
                                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-gray-400 focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                                        />
                                    </div>
                                </div>
                                {localData.images && (
                                    <div className="flex gap-2 mt-2 overflow-x-auto">
                                        {(typeof localData.images === 'string' ? JSON.parse(localData.images) : localData.images).map((img, i) => (
                                            <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 group">
                                                <img src={`http://localhost:5000${img}`} alt="" className="w-full h-full object-cover" />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const imgs = typeof localData.images === 'string' ? JSON.parse(localData.images) : localData.images;
                                                        const newImgs = imgs.filter((_, idx) => idx !== i);
                                                        setLocalData({ ...localData, images: JSON.stringify(newImgs) });
                                                    }}
                                                    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-bold text-xs"
                                                >
                                                    X
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Isi Konten</label>
                                <textarea value={localData.content || ''} onChange={(e) => setLocalData({ ...localData, content: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white h-32 focus:outline-none resize-none" placeholder="Detail elaborasi..." required />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nama Kampanye Internal</label>
                                <input type="text" value={localData.name || ''} onChange={(e) => setLocalData({ ...localData, name: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Judul Subjek Publik</label>
                                <input type="text" value={localData.subject || ''} onChange={(e) => setLocalData({ ...localData, subject: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50" required />
                            </div>
                            {/* Segmentation removed per user request - always comprehensive */}
                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Isi Konten</label>
                                <textarea value={localData.content || ''} onChange={(e) => setLocalData({ ...localData, content: e.target.value })} className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white h-32 focus:outline-none resize-none" placeholder="Konten newsletter..." required />
                            </div>
                        </>
                    )}
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20">
                        {localData.id ? 'SINKRONISASI UPDATE' : 'JALANKAN MISI'}
                    </button>
                </form>
            </div>
        </div>
    );
});

const MarketingDashboard = ({ tab = 'announcements' }) => {
    const [activeTab, setActiveTab] = useState(tab);
    const [announcements, setAnnouncements] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [subscribers, setSubscribers] = useState([]);
    const [wishlistData, setWishlistData] = useState({ overview: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [formData, setFormData] = useState({});

    useEffect(() => {
        setActiveTab(tab);
    }, [tab]);

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'announcements') {
                const res = await adminService.getAnnouncements();
                setAnnouncements(res.data || []);
            } else if (activeTab === 'newsletter') {
                const [campaignsRes, subsRes] = await Promise.all([
                    adminService.getNewsletterCampaigns(),
                    adminService.getNewsletterSubscribers()
                ]);
                setCampaigns(campaignsRes.data || []);
                setSubscribers(subsRes.data || []);
            } else if (activeTab === 'wishlist') {
                const res = await adminService.getWishlistOverview();
                setWishlistData(res.data || { overview: [], total: 0 });
            }
        } catch (error) {
            console.error('Failed to load marketing data', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (type, data = {}) => {
        setModalType(type);
        setFormData(data);
        setShowModal(true);
    };

    const handleModalSubmit = async (data) => {
        try {
            if (modalType === 'announcement') {
                if (data.id) {
                    await adminService.updateAnnouncement(data.id, data);
                } else {
                    await adminService.createAnnouncement(data);
                }
            } else if (modalType === 'campaign') {
                await adminService.createNewsletterCampaign(data);
            }
            setShowModal(false);
            loadData();
        } catch (error) {
            console.error('Failed to save', error);
            showToast.error('Gagal menyimpan: ' + (error.response?.data?.error || error.message));
        }
    };

    const handlePublish = async (id) => {
        if (!confirm('Publish announcement ini?')) return;
        try {
            await adminService.publishAnnouncement(id);
            loadData();
        } catch (error) {
            showToast.error('Gagal publish');
        }
    };

    const handleBroadcast = async (id) => {
        if (!confirm('Broadcast announcement ke semua customer?')) return;
        try {
            await adminService.broadcastAnnouncement(id);
            showToast.success('Broadcast berhasil dijadwalkan!');
        } catch (error) {
            showToast.error('Gagal broadcast');
        }
    };

    const handleDeleteAnnouncement = async (id) => {
        if (!confirm('Hapus announcement ini secara permanen?')) return;
        try {
            await adminService.deleteAnnouncement(id);
            loadData();
        } catch (error) {
            console.error('Failed to delete', error);
            showToast.error('Gagal menghapus announcement');
        }
    };

    const handleSendCampaign = async (id) => {
        if (!confirm('Kirim newsletter campaign ini ke semua user?')) return;
        try {
            await adminService.sendNewsletterCampaign(id);
            showToast.success('Campaign berhasil dikirim!');
            loadData();
        } catch (error) {
            showToast.error('Gagal mengirim campaign');
        }
    };

    const handleTriggerRestock = async (productId) => {
        if (!confirm('Kirim notifikasi restock ke semua yang wishlist produk ini?')) return;
        try {
            const res = await adminService.triggerRestockNotification(productId);
            showToast.success(`Berhasil kirim ${res.sent_count} notifikasi!`);
        } catch (error) {
            showToast.error('Gagal kirim notifikasi');
        }
    };

    const handleSyncSubscribers = async () => {
        if (!confirm('Sinkronisasi dan perbarui ulang daftar pelanggan aktif dari seluruh data pendaftar? (menghapus potensi data palsu)')) return;
        try {
            setLoading(true);
            const res = await adminService.syncNewsletterSubscribers();
            if (res) {
                showToast.success(`Synchronization complete! Total Subscribers: ${res.total_synced}`);
                loadData();
            }
        } catch (error) {
            console.error('Sync failed', error);
            showToast.error('Failed to sync subscribers');
            setLoading(false);
        }
    };

    const TabButton = ({ name, label, icon: Icon, count }) => (
        <button
            onClick={() => setActiveTab(name)}
            className={`flex items-center gap-3 px-8 py-5 font-bold text-xs uppercase tracking-[0.2em] transition-all relative ${activeTab === name
                ? 'text-blue-400'
                : 'text-gray-500 hover:text-white'
                }`}
        >
            <Icon className="w-5 h-5" />
            {label}
            {count !== undefined && count > 0 && (
                <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded-lg border border-blue-500/20">{count}</span>
            )}
            {activeTab === name && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transform animate-in fade-in slide-in-from-bottom-1 duration-500"></div>
            )}
        </button>
    );

    const AnnouncementsTab = () => {
        const stats = {
            total: announcements.length,
            published: announcements.filter(a => a.status === 'published').length,
            draft: announcements.filter(a => a.status === 'draft').length
        };

        return (
            <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-2xl"><HiOutlineSpeakerphone className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums">{stats.total}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Update</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl"><HiOutlineCheck className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums">{stats.published}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Tayang / Terbit</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-white/5 text-gray-400 rounded-2xl"><HiOutlinePencil className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums">{stats.draft}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Draf</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white tracking-tight italic normal-case">Pengumuman Publik</h3>
                    <button
                        onClick={() => openModal('announcement')}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        <HiOutlinePlus className="w-5 h-5" />
                        Buat Update
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {announcements.map((ann) => (
                        <div key={ann.id} className="glass-card rounded-3xl p-8 hover:border-blue-500/30 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    <span className={`flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-wider ${ann.category === 'PROMO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                        ann.category === 'DELAY' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                            ann.category === 'CANCEL' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                                                'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                        }`}>
                                        <HiOutlineTag className="w-3.5 h-3.5" />
                                        {ann.category}
                                    </span>
                                    <span className={`text-[10px] px-3 py-1.5 rounded-xl font-black uppercase tracking-widest ${ann.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                                        {ann.status}
                                    </span>
                                </div>
                                <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal('announcement', ann)} className="text-blue-400 hover:text-white"><HiOutlinePencil className="w-5 h-5" /></button>
                                    <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-rose-400 hover:text-white"><HiOutlineTrash className="w-5 h-5" /></button>
                                </div>
                            </div>
                            <h4 className="text-white font-bold text-xl mb-4 italic normal-case line-clamp-1">{ann.title}</h4>
                            <p className="text-gray-500 text-sm leading-relaxed mb-8 line-clamp-2 italic normal-case">{ann.content}</p>

                            <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                                <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <HiOutlineCalendar className="w-4 h-4" />
                                    {new Date(ann.created_at).toLocaleDateString()}
                                </span>
                                <div className="flex gap-3">
                                    {ann.status === 'draft' && (
                                        <button onClick={() => handlePublish(ann.id)} className="text-emerald-400 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                            <HiOutlineCheck /> TERBITKAN SEKARANG
                                        </button>
                                    )}
                                    {ann.status === 'published' && (
                                        <button onClick={() => handleBroadcast(ann.id)} className="text-blue-400 text-[10px] font-black uppercase tracking-widest hover:underline flex items-center gap-1">
                                            <HiOutlinePaperAirplane /> SIARKAN NODE
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const NewsletterTab = () => {
        const stats = {
            subscribers: subscribers.length,
            sent: campaigns.filter(c => c.status === 'sent').length,
            drafts: campaigns.filter(c => c.status === 'draft').length
        };

        return (
            <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl"><HiOutlineUsers className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums flex items-center gap-3">
                                {stats.subscribers}
                                <button
                                    onClick={handleSyncSubscribers}
                                    className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                    title="Sinkronisasi Data Real Pelanggan"
                                >
                                    <HiOutlineRefresh className="w-4 h-4" />
                                </button>
                            </p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Pelanggan Aktif</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl"><HiOutlinePaperAirplane className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums">{stats.sent}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Kampanye Terkirim</p>
                        </div>
                    </div>
                    <div className="glass-card p-6 rounded-3xl flex items-center gap-4">
                        <div className="p-3 bg-white/5 text-gray-400 rounded-2xl"><HiOutlinePencil className="w-6 h-6" /></div>
                        <div>
                            <p className="text-2xl font-black text-white tabular-nums">{stats.drafts}</p>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Draf</p>
                        </div>
                    </div>
                </div>

                {/* Campaigns - full width now */}
                <div className="glass-card rounded-3xl overflow-hidden flex flex-col lg:col-span-2">
                    <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                        <h3 className="text-white font-bold italic normal-case">Kampanye Pengiriman</h3>
                        <button
                            onClick={() => openModal('campaign')}
                            className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                        >
                            <HiOutlinePlus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {campaigns.map((camp) => (
                            <div key={camp.id} className="bg-white/5 rounded-2xl p-6 border border-white/5 hover:border-blue-500/20 transition-all group">
                                <div className="flex justify-between items-start mb-4">
                                    <h4 className="text-white font-bold text-sm italic normal-case">{camp.name}</h4>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-lg font-black uppercase tracking-widest ${camp.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                        {camp.status}
                                    </span>
                                </div>
                                <p className="text-gray-500 text-xs mb-6 italic normal-case line-clamp-1">{camp.subject}</p>
                                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                        <HiOutlineMail className="w-4 h-4" />
                                        JANGKAUAN: {camp.sent_count || 0} NODE
                                    </span>
                                    {camp.status === 'draft' && (
                                        <button onClick={() => handleSendCampaign(camp.id)} className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-white transition-all flex items-center gap-2">
                                            KIRIM <HiOutlinePaperAirplane className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const WishlistTab = () => (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-bold text-white italic normal-case">Niat Inventaris</h3>
                    <p className="text-gray-500 text-sm italic normal-case mt-1">Pelacakan permintaan pasar berdasarkan wishlist pelanggan</p>
                </div>
                <div className="glass-card px-8 py-5 rounded-3xl flex items-center gap-4">
                    <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl"><HiOutlineHeart className="w-6 h-6" /></div>
                    <div>
                        <p className="text-3xl font-black text-white tabular-nums">{wishlistData.total || 0}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Minat Global</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(wishlistData.overview || []).map((item) => (
                    <div key={item.product_id} className="glass-card rounded-3xl p-6 hover:border-blue-500/30 transition-all group overflow-hidden flex flex-col">
                        <div className="flex items-start gap-5 mb-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/5 overflow-hidden border border-white/10 flex-shrink-0">
                                {item.product?.images?.[0] ? (
                                    <img src={item.product.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center"><HiOutlineShoppingBag className="w-8 h-8 text-gray-700" /></div>
                                )}
                            </div>
                            <div className="flex-grow min-w-0">
                                <h4 className="text-white font-bold text-base italic normal-case line-clamp-2 h-10 mb-2">{item.product_name || 'Legacy Product'}</h4>
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.stock > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {item.stock > 0 ? `STOK: ${item.stock}` : 'STOK HABIS'}
                                </div>
                            </div>
                        </div>

                        {/* Interested Users Section */}
                        <div className="mb-6">
                            <p className="text-[8px] text-gray-500 font-black uppercase tracking-[0.2em] mb-3">Entitas yang Berminat</p>
                            <div className="flex flex-wrap gap-2">
                                {item.users?.slice(0, 5).map((u, i) => (
                                    <div key={i} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/5" title={u.email}>
                                        <div className="w-4 h-4 rounded-full bg-blue-500/20 flex items-center justify-center text-[8px] font-bold text-blue-400 uppercase">
                                            {u.username?.[0]}
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold truncate max-w-[80px]">{u.full_name || u.username}</span>
                                    </div>
                                ))}
                                {item.wishlist_count > 5 && (
                                    <span className="text-[10px] text-gray-600 font-bold flex items-center px-2 py-1">
                                        +{item.wishlist_count - 5} lainnya
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto pt-6 border-t border-white/5">
                            <div>
                                <p className="text-2xl font-black text-white tabular-nums">{item.wishlist_count}</p>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">DAFTAR KEINGINAN</p>
                            </div>
                            {item.stock > 0 && (
                                <button
                                    onClick={() => handleTriggerRestock(item.product_id)}
                                    className="p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
                                    title="Notify All Interested Users"
                                >
                                    <HiOutlineBell className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <div className="w-10 h-10 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest animate-pulse">Menyelaraskan Node Pemasaran...</p>
        </div>
    );

    return (
        <div className="min-h-full">
            <div className="sticky top-0 z-20 glass-card mx-8 mt-8 p-1 rounded-3xl flex border-white/5 overflow-hidden">
                <TabButton name="announcements" label="Pengumuman" icon={HiOutlineSpeakerphone} count={announcements.length} />
                <TabButton name="newsletter" label="Newsletter" icon={HiOutlineMail} count={campaigns.length} />
                <TabButton name="wishlist" label="Wishlist" icon={HiOutlineHeart} count={wishlistData.overview?.length} />
            </div>

            <div className="pb-8">
                {activeTab === 'announcements' && <AnnouncementsTab />}
                {activeTab === 'newsletter' && <NewsletterTab />}
                {activeTab === 'wishlist' && <WishlistTab />}
            </div>

            <MarketingModal
                show={showModal}
                type={modalType}
                initialData={formData}
                onCancel={() => setShowModal(false)}
                onSubmit={handleModalSubmit}
            />
        </div>
    );
};

export default MarketingDashboard;
