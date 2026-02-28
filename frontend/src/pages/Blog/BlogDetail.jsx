import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import blogService from '../../services/blogService';
import { UPLOAD_BASE_URL } from '../../config/api';
import SEO from '../../components/SEO';
import Image from '../../components/Image';
import { sanitizeInput } from '../../utils/security';
import { HiOutlineArrowLeft, HiOutlineCalendar, HiOutlineShare, HiOutlineUser } from 'react-icons/hi';

const BlogDetail = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPost();
    }, [slug]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const res = await blogService.getBlogPost(slug);
            setPost(res);
        } catch (error) {
            console.error('Failed to load blog post', error);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: post.title,
                    text: post.excerpt || post.title,
                    url: window.location.href,
                });
            } catch (error) {
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-neon-pink border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (!post) return (
        <div className="min-h-screen bg-[#030303] flex flex-col items-center justify-center text-white">
            <h1 className="text-4xl font-black italic">404</h1>
            <p className="text-gray-500 uppercase tracking-widest mt-2">Transmission Lost</p>
            <button onClick={() => navigate('/blog')} className="mt-8 px-6 py-3 bg-neon-pink text-white font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-pink-600 transition-colors">
                Return to Base
            </button>
        </div>
    );

    const featuredImg = post.featured_image ? (post.featured_image.startsWith('http') || post.featured_image.startsWith('/images/') ? post.featured_image : `${UPLOAD_BASE_URL}${post.featured_image}`) : null;

    return (
        <div className="min-h-screen bg-[#030303] text-white pt-16 pb-20">
            <SEO
                title={post.title}
                description={post.meta_description || post.excerpt || post.content.substring(0, 160)}
                image={featuredImg}
                type="article"
            />

            <article className="max-w-4xl mx-auto px-6">
                <button
                    onClick={() => navigate('/blog')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                    <HiOutlineArrowLeft /> Back to News
                </button>

                <header className="mb-12 text-center">
                    <div className="text-neon-pink font-bold uppercase tracking-[0.2em] text-xs mb-4">
                        {post.tags ? post.tags.split(',').join(' • ') : 'Update'}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic leading-tight mb-6">
                        {post.title}
                    </h1>

                    <div className="flex items-center justify-center gap-6 text-gray-500 text-xs font-medium uppercase tracking-widest">
                        <div className="flex items-center gap-2">
                            <HiOutlineCalendar /> {post.created_at && post.created_at !== '0001-01-01T00:00:00Z' ? new Date(post.created_at).toLocaleDateString() : 'Recent'}
                        </div>
                        <div className="flex items-center gap-2">
                            <HiOutlineUser /> {post.author?.username || 'Admin'}
                        </div>
                    </div>
                </header>

                {featuredImg && (
                    <div className="mb-12 rounded-3xl overflow-hidden border border-white/5 relative aspect-video">
                        <Image
                            src={featuredImg}
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent opacity-50"></div>
                    </div>
                )}

                <div className="blog-content">
                    {/* Render content safely if HTML */}
                    <div dangerouslySetInnerHTML={{ __html: sanitizeInput(post.content) }} />
                </div>

                <div className="border-t border-white/10 mt-16 pt-12 flex justify-between items-center">
                    <div className="text-gray-500 text-xs uppercase tracking-widest font-bold">
                        Share Transmission
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={handleShare}
                            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-neon-pink hover:border-transparent transition-all"
                            title="Share this post"
                        >
                            <HiOutlineShare />
                        </button>
                    </div>
                </div>
            </article>
        </div>
    );
};

export default BlogDetail;
