import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const getBlogPosts = async (params) => {
    const response = await api.get('/admin/blog', { params });
    return response.data;
};

const getAdminBlogPost = async (id) => {
    const response = await api.get(`/admin/blog/${id}`);
    return response.data;
};

const getBlogPost = async (slug) => {
    const response = await api.get(`/blog/slug/${slug}`);
    return response.data;
};

const createBlogPost = async (data) => {
    const response = await api.post('/admin/blog', data);
    return response.data;
};

const updateBlogPost = async (id, data) => {
    const response = await api.put(`/admin/blog/${id}`, data);
    return response.data;
};

const deleteBlogPost = async (id) => {
    const response = await api.delete(`/admin/blog/${id}`);
    return response.data;
};

// Public
const getPublicBlogPosts = async (params) => {
    const response = await api.get('/blog', { params }); // Assuming public route is /api/blog
    return response.data;
};

const getLatestBlogPosts = async () => {
    const response = await api.get('/blog/latest');
    return response.data;
};

export default {
    getBlogPosts,
    getAdminBlogPost,
    getBlogPost,
    createBlogPost,
    updateBlogPost,
    deleteBlogPost,
    getPublicBlogPosts,
    getLatestBlogPosts,
};
