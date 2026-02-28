import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import blogService from '../../services/blogService';
import { adminService } from '../../services/adminService';
import { showToast } from '../../utils/toast';
import { UPLOAD_BASE_URL } from '../../config/api';
import {
    HiOutlineSave,
    HiOutlineX,
    HiOutlinePhotograph,
    HiOutlineDocumentText,
    HiOutlineTag
} from 'react-icons/hi';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const BlogForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { state } = useLocation();
    const isEdit = !!id;
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        featured_image: '',
        meta_description: '',
        status: 'draft',
        tags: ''
    });

    useEffect(() => {
        if (state && state.post) {
            setFormData({
                ...state.post,
                tags: state.post.tags || '',
                meta_description: state.post.meta_description || ''
            });
        } else if (isEdit) {
            fetchPost();
        }
    }, [state, isEdit, id]);

    const fetchPost = async () => {
        setLoading(true);
        try {
            const data = await blogService.getAdminBlogPost(id);
            setFormData({
                ...data,
                tags: data.tags || '',
                meta_description: data.meta_description || ''
            });
        } catch (error) {
            console.error('Fetch post failed:', error);
            showToast.error('Gagal mengambil data postingan');
            navigate('/admin/blog');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const res = await adminService.uploadFile(file);
            setFormData(prev => ({ ...prev, featured_image: res.url }));
        } catch (error) {
            console.error('Upload failed:', error);
            showToast.error('Gagal mengunggah gambar');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            showToast.warning('Judul dan Konten wajib diisi');
            return;
        }

        setSubmitting(true);
        try {
            if (isEdit) {
                await blogService.updateBlogPost(id, formData);
            } else {
                await blogService.createBlogPost(formData);
            }
            navigate('/admin/blog');
        } catch (error) {
            console.error('Save failed:', error);
            showToast.error('Gagal menyimpan postingan');
            setSubmitting(false);
        }
    };

    const quillModules = {
        toolbar: [
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike', 'blockquote'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image', 'video'],
            ['clean']
        ],
    };

    if (loading) {
        return (
            <div className="p-6 text-white bg-[#030303] min-h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-neon-pink border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium">Memuat Postingan...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <HiOutlineDocumentText className="text-neon-pink" />
                        {isEdit ? 'Edit Postingan' : 'Buat Postingan Baru'}
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">Kelola konten blog dan publikasikan ke audiens Anda.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/admin/blog')}
                        className="px-4 py-2 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
                    >
                        <HiOutlineX /> Batal
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-6 py-2 bg-neon-pink text-white rounded-xl flex items-center gap-2 hover:bg-pink-600 disabled:opacity-50 shadow-lg shadow-neon-pink/20 transition-all font-bold"
                    >
                        <HiOutlineSave /> {submitting ? 'Menyimpan...' : 'Simpan Postingan'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {/* Main Content Area */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Judul Postingan</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xl focus:border-neon-pink outline-none transition-all placeholder:text-gray-600"
                                placeholder="Masukkan judul yang menarik..."
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Konten</label>
                            <div className="bg-white rounded-xl text-black overflow-hidden border border-white/10">
                                <ReactQuill
                                    theme="snow"
                                    value={formData.content}
                                    onChange={(content) => setFormData(prev => ({ ...prev, content }))}
                                    modules={quillModules}
                                    style={{ height: '400px', marginBottom: '50px' }}
                                    placeholder="Tulis cerita menarik Anda di sini..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Slug URL (Opsional)</label>
                                <input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleChange}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-gray-300 text-sm font-mono focus:border-neon-pink outline-none transition-all"
                                    placeholder="judul-postingan-anda"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Tags (Pisahkan dengan koma)</label>
                                <div className="relative">
                                    <HiOutlineTag className="absolute left-3 top-3 text-gray-500" />
                                    <input
                                        type="text"
                                        name="tags"
                                        value={formData.tags}
                                        onChange={handleChange}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 p-3 text-white text-sm focus:border-neon-pink outline-none transition-all"
                                        placeholder="promo, tips, update"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Status & Settings Sidebar */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Status Publikasi</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-neon-pink outline-none appearance-none transition-all cursor-pointer"
                            >
                                <option value="draft">Draft (Disembunyikan)</option>
                                <option value="published">Diterbitkan (Publik)</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-gray-500 tracking-wider">Gambar Utama (Featured Image)</label>
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-4 text-center hover:border-neon-pink/40 transition-all relative group bg-black/20">
                                {formData.featured_image ? (
                                    <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl">
                                        <img
                                            src={formData.featured_image.startsWith('http') ? formData.featured_image : `${UPLOAD_BASE_URL}${formData.featured_image}`}
                                            alt="Featured"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, featured_image: '' }))}
                                                className="bg-rose-500 text-white p-2 rounded-full hover:bg-rose-600 transition-all font-bold text-xs px-4"
                                            >
                                                Hapus Gambar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block py-8">
                                        <div className="bg-white/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-neon-pink/10 transition-colors">
                                            <HiOutlinePhotograph className="w-6 h-6 text-gray-400 group-hover:text-neon-pink" />
                                        </div>
                                        <span className="text-xs text-gray-300 font-medium block">Klik untuk pilih gambar</span>
                                        <span className="text-[10px] text-gray-500 mt-1 block">Rekomendasi: 1280x720px</span>
                                        <input type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/10">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-neon-pink rounded-full"></span>
                                SEO & Metadata
                            </h3>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-gray-500">Meta Deskripsi</label>
                                <textarea
                                    name="meta_description"
                                    value={formData.meta_description}
                                    onChange={handleChange}
                                    className="w-full h-28 bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:border-neon-pink outline-none transition-all resize-none"
                                    placeholder="Ringkasan singkat untuk hasil pencarian Google (150-160 karakter)..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-neon-pink/10 to-transparent border border-neon-pink/20 rounded-2xl p-6 text-sm">
                        <p className="text-gray-300 italic">"Konten yang berkualitas adalah kunci dari kepercayaan pelanggan."</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogForm;
