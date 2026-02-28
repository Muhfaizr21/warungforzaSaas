import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HiOutlineExternalLink, HiOutlinePhotograph, HiX } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';

const AnnouncementBar = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            // Fetch public announcements for 'customer' or 'all' target
            const res = await axios.get('http://localhost:5000/api/announcements?target=public');

            // Check if res.data is array or wrapped object
            const data = Array.isArray(res.data) ? res.data : (res.data.data || []);

            // Filter only published
            const active = data.filter(a => a.status === 'published');
            setAnnouncements(active);
        } catch (error) {
            console.error("Failed to fetch announcements", error);
        }
    };

    if (announcements.length === 0) return null;

    const currentCheck = announcements[currentIdx];

    return (
        <>
            {/* Top Bar Ticker */}
            <div className="bg-neon-pink text-black text-xs font-black uppercase tracking-widest py-2 px-4 relative overflow-hidden cursor-pointer hover:bg-white transition-colors"
                onClick={() => {
                    setSelectedAnnouncement(currentCheck);
                    setShowModal(true);
                }}
            >
                <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 animate-pulse">
                    <span className="bg-black text-neon-pink px-2 py-0.5 rounded text-[10px]">INFO</span>
                    <p className="truncate max-w-[80vw] md:max-w-none">
                        {currentCheck.title} — Click for details
                    </p>
                </div>
            </div>

            {/* Modal Detail */}
            {showModal && selectedAnnouncement && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowModal(false)}
                >
                    <div className="bg-[#111] border border-white/10 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative shadow-[0_0_50px_rgba(255,0,128,0.2)]"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white bg-black/50 p-2 rounded-full backdrop-blur transition-colors"
                        >
                            <HiX size={20} />
                        </button>

                        <div className="p-8">
                            <span className="text-neon-pink text-[10px] font-black uppercase tracking-[0.2em] border border-neon-pink/30 px-3 py-1 rounded-full mb-4 inline-block">
                                {selectedAnnouncement.category || 'Announcement'}
                            </span>

                            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-6">
                                {selectedAnnouncement.title}
                            </h2>

                            {/* Render Images if Any */}
                            {selectedAnnouncement.images && (() => {
                                try {
                                    const imgs = typeof selectedAnnouncement.images === 'string'
                                        ? JSON.parse(selectedAnnouncement.images)
                                        : selectedAnnouncement.images;

                                    if (Array.isArray(imgs) && imgs.length > 0) {
                                        return (
                                            <div className="mb-6 grid gap-4">
                                                {imgs.map((img, idx) => (
                                                    <img key={idx} src={`http://localhost:5000${img}`} alt="Announcement" className="w-full rounded-2xl border border-white/10" />
                                                ))}
                                            </div>
                                        );
                                    }
                                } catch (e) {
                                    return null;
                                }
                            })()}

                            <div className="prose prose-invert prose-sm max-w-none text-gray-300 font-light leading-relaxed whitespace-pre-line mb-8">
                                {selectedAnnouncement.content}
                            </div>

                            <div className="flex justify-end pt-6 border-t border-white/5">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="bg-white text-black px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default AnnouncementBar;
