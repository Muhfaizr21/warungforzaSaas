import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import blogService from '../../services/blogService';
import { UPLOAD_BASE_URL } from '../../config/api';
import SEO from '../../components/SEO';
import Image from '../../components/Image';
import { HiOutlineCalendar, HiOutlineUser, HiOutlineTag } from 'react-icons/hi';

const BlogIndex = () => {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchPosts();
    }, [page]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await blogService.getPublicBlogPosts({ page, limit: 9 });
            setPosts(res.data || []);
            setTotalPages(Math.ceil((res.total || 0) / 9));
        } catch (error) {
            console.error('Failed to load blog posts', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-16 pb-12 px-4 md:px-8">
            <SEO
                title="Transmission Logs"
                description="Latest news, product unveils, and field reports from the Forza Shop archives."
            />

            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl md:text-5xl font-black text-white italic uppercase tracking-tighter mb-4 text-center">
                    Forza <span className="text-neon-pink">News</span>
                </h1>
                <p className="text-gray-400 text-center uppercase tracking-widest text-sm mb-16">
                    Updates from the Command Center
                </p>

                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="animate-pulse">
                                <div className="h-64 bg-white/5 rounded-2xl mb-4"></div>
                                <div className="h-6 w-3/4 bg-white/5 rounded mb-2"></div>
                                <div className="h-4 w-1/2 bg-white/5 rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                            {posts.map(post => (
                                <div
                                    key={post.id}
                                    onClick={() => navigate(`/blog/${post.slug}`)}
                                    className="group cursor-pointer"
                                >
                                    <div className="relative overflow-hidden rounded-2xl mb-6 aspect-[4/3] bg-white/5 border border-white/5">
                                        {post.featured_image ? (
                                            <Image
                                                src={post.featured_image.startsWith('http') || post.featured_image.startsWith('/images/') ? post.featured_image : `${UPLOAD_BASE_URL}${post.featured_image}`}
                                                alt={post.title}
                                                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700 font-black text-4xl uppercase opacity-20">
                                                Forza
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>

                                        {/* Date Badge */}
                                        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur border border-white/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest text-white flex items-center gap-2">
                                            <HiOutlineCalendar />
                                            {post.created_at && post.created_at !== '0001-01-01T00:00:00Z' ? new Date(post.created_at).toLocaleDateString() : 'Recent'}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 text-xs text-neon-pink font-bold uppercase tracking-widest">
                                            {post.tags ? post.tags.split(',')[0] : 'News'}
                                        </div>
                                        <h3 className="text-2xl font-bold text-white group-hover:text-neon-pink transition-colors line-clamp-2">
                                            {post.title}
                                        </h3>
                                        <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">
                                            {post.excerpt || post.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...'}
                                        </p>
                                        <div className="pt-4 flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                                            Read Article <span className="text-neon-pink">→</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {posts.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                <p className="text-xl italic">No transmission received yet.</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center mt-16 gap-2">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-widest transition-all"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default BlogIndex;
