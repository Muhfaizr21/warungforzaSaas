import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const API_URL = API_BASE_URL;

const getMyNotifications = async () => {
    const token = localStorage.getItem('token');
    const response = await axios.get(`${API_URL}/customer/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

const markAsRead = async (id = 'all') => {
    const token = localStorage.getItem('token');
    const response = await axios.put(`${API_URL}/customer/notifications/read/${id}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
};

export const notificationService = {
    getMyNotifications,
    markAsRead
};
