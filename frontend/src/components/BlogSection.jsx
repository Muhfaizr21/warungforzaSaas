import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../services/publicService';
import { UPLOAD_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';
import Image from './Image';

const BlogSection = () => {
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();
    const { t } = useLanguage();

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const data = await publicService.getLatestBlogPosts();
                if (data && Array.isArray(data)) {
                    setPosts(data.slice(0, 3));
                }
            } catch (error) {
                console.error("Failed to fetch blog posts", error);
            }
        };
        fetchPosts();
    }, []);

    if (posts.length === 0) return null;

    return (
        <section className="py-16 border-t" style={{ backgroundColor: 'var(--blog-section-bg)', borderColor: 'var(--section-divider)' }}>
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--section-label-color)' }}>• {t('blog.latestUpdates')}</p>
                        <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2" style={{ color: 'var(--section-heading-color)', fontFamily: 'var(--font-heading)' }}>
                            {t('blog.latestNews').split(' ')[0]} <span style={{ color: 'var(--accent)' }}>{t('blog.latestNews').split(' ').slice(1).join(' ')}</span>
                        </h2>
                        <p className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'var(--section-subtext-color)' }}>{t('blog.updatesFromCommandCenter')}</p>
                    </div>
                    <button onClick={() => navigate('/blog')} className="btn-secondary !h-[40px] !px-6">
                        {t('blog.exploreBlog')}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                    {posts.map(post => (
                        <div
                            key={post.id}
                            className="overflow-hidden group cursor-pointer transition-all duration-300"
                            style={{
                                backgroundColor: 'var(--blog-card-bg)',
                                border: '1px solid var(--blog-card-border)',
                                borderRadius: 'var(--blog-card-radius)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--blog-card-hover-border)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--blog-card-border)'}
                            onClick={() => navigate(`/blog/${post.slug}`)}
                        >
                            <div className="aspect-[4/3] md:h-64 overflow-hidden relative">
                                <Image
                                    src={post.featured_image ? (post.featured_image.startsWith('http') || post.featured_image.startsWith('/images/') ? post.featured_image : `${UPLOAD_BASE_URL}${post.featured_image}`) : '/placeholder.jpg'}
                                    alt={post.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                            </div>
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                                        style={{ color: 'var(--blog-tag-color)', backgroundColor: 'var(--blog-tag-bg)' }}>
                                        {post.tags?.split(',')[0] || 'News'}
                                    </span>
                                    <span className="text-xs" style={{ color: 'var(--blog-date-color)' }}>•</span>
                                    <span className="text-xs" style={{ color: 'var(--blog-date-color)' }}>
                                        {post.created_at && post.created_at !== '0001-01-01T00:00:00Z' ? new Date(post.created_at).toLocaleDateString() : 'Recent'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold mb-3 line-clamp-2 transition-colors"
                                    style={{ color: 'var(--blog-title-color)', fontFamily: 'var(--font-heading)' }}
                                    onMouseEnter={e => e.currentTarget.style.color = 'var(--blog-title-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'var(--blog-title-color)'}
                                >
                                    {post.title}
                                </h3>
                                <p className="text-sm line-clamp-3 mb-4" style={{ color: 'var(--blog-text-color)' }}>{post.excerpt}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default BlogSection;
