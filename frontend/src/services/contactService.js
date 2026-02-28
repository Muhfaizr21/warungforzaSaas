import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// Interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

const submitMessage = async (data) => {
    // data: { name, email, message }
    const response = await api.post('/contact', data);
    return response.data;
};

const getAdminMessages = async (params) => {
    // params: { page, limit, status }
    const response = await api.get('/admin/messages', { params });
    return response.data;
};

const markAsRead = async (id) => {
    const response = await api.put(`/admin/messages/${id}/read`);
    return response.data;
};

const deleteMessage = async (id) => {
    const response = await api.delete(`/admin/messages/${id}`);
    return response.data;
};

export default {
    submitMessage,
    getAdminMessages,
    markAsRead,
    deleteMessage
};
