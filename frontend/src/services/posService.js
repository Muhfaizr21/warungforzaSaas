import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const posService = {
    searchProducts: async (query) => {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/admin/pos/products?q=${query}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    createOrder: async (orderData) => {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/admin/pos/orders`, orderData, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    checkStatus: async (orderId) => {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/admin/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    generateQRCodes: async () => {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/admin/pos/generate-qr`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    }
};
