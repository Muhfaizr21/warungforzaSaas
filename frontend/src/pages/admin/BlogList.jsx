import React, { useState, useEffect } from 'react';
import { showToast } from '../../utils/toast';
import { useNavigate } from 'react-router-dom';
import blogService from '../../services/blogService';
import { UPLOAD_BASE_URL } from '../../config/api';
import {
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineSearch,
    HiOutlineDocumentText,
    HiOutlineEye,
    HiOutlineTag
} from 'react-icons/hi';

import { usePermission } from '../../hooks/usePermission';

const BlogList = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermission();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        fetchPosts();
    }, [page, statusFilter]);

    const fetchPosts = async () => {
        setLoading(true);
        try {
            const res = await blogService.getBlogPosts({ page, limit: 10, status: statusFilter });
            setPosts(res.data || []);
            setTotalPages(Math.ceil((res.total || 0) / 10));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this post?')) return;
        try {
            await blogService.deleteBlogPost(id);
            fetchPosts();
        } catch (error) {
            showToast.error('Failed to delete');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <HiOutlineDocumentText /> Blog Posts
                </h1>
                {hasPermission('blog.create') && (
                    <button
                        onClick={() => navigate('/admin/blog/new')}
                        className="bg-neon-pink text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-pink-600 transition-colors"
                    >
                        <HiOutlinePlus /> Create Post
                    </button>
                )}
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex gap-4">
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-black/50 border border-white/10 text-white p-2 rounded-lg"
                >
                    <option value="">All Status</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                </select>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-black/50 text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Tags</th>
                            <th className="p-4">Date</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>
                        ) : posts.length === 0 ? (
                            <tr><td colSpan="5" className="p-8 text-center text-gray-400">No posts found</td></tr>
                        ) : (
                            posts.map(post => (
                                <tr key={post.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {post.featured_image && (
                                                <img
                                                    src={post.featured_image.startsWith('http') ? post.featured_image : `${UPLOAD_BASE_URL}${post.featured_image}`}
                                                    alt=""
                                                    className="w-10 h-10 rounded object-cover"
                                                />
                                            )}
                                            <div>
                                                <div className="text-white font-medium">{post.title}</div>
                                                <div className="text-xs text-gray-500">/{post.slug}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${post.status === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                                            }`}>
                                            {post.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {post.tags ? post.tags.split(',').map(t => (
                                            <span key={t} className="inline-block bg-white/10 px-1.5 py-0.5 rounded textxs mr-1">{t.trim()}</span>
                                        )) : '-'}
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm">
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/blog/${post.slug}`)}
                                                className="text-gray-400 hover:text-white p-2"
                                                title="View"
                                            >
                                                <HiOutlineEye size={18} />
                                            </button>
                                            {hasPermission('blog.edit') && (
                                                <button
                                                    onClick={() => navigate(`/admin/blog/edit/${post.id}`, { state: { post } })}
                                                    className="bg-blue-500/10 text-blue-400 p-2 rounded-lg hover:bg-blue-500 text-white transition-colors"
                                                    title="Edit"
                                                >
                                                    <HiOutlinePencil className="w-4 h-4" />
                                                </button>
                                            )}
                                            {hasPermission('blog.delete') && (
                                                <button
                                                    onClick={() => handleDelete(post.id)}
                                                    className="bg-rose-500/10 text-rose-400 p-2 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                                                    title="Delete"
                                                >
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-center mt-6 gap-2">
                <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-50 text-white"
                >
                    Prev
                </button>
                <span className="px-4 py-2 text-gray-400">Page {page} of {totalPages}</span>
                <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 bg-white/5 rounded-lg disabled:opacity-50 text-white"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default BlogList;
