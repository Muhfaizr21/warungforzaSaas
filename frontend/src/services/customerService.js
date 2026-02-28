import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const API_URL = API_BASE_URL;

// ✅ FIX: Use a shared axios instance with 401 interceptor
// Previously used raw axios without interceptor — token expiry caused silent failures
const customerApi = axios.create({
    baseURL: API_BASE_URL,
});

// Attach token automatically to all customer requests
customerApi.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Track redirect state to prevent loops
let isRedirectingFromCustomer = false;

// Handle 401 - redirect to login with next param
customerApi.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            if (!isRedirectingFromCustomer && !window.location.pathname.includes('/login')) {
                isRedirectingFromCustomer = true;
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                const nextPath = window.location.pathname + window.location.search;
                window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
                setTimeout(() => { isRedirectingFromCustomer = false; }, 2000);
            }
        }
        if (!error.response) {
            error.message = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
        }
        return Promise.reject(error);
    }
);

// Legacy helper for backward compatibility (kept for any direct usage)
const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const customerService = {
    // Orders
    getOrders: async () => {
        const response = await customerApi.get('/customer/orders');
        return response.data;
    },
    getOrderDetail: async (id) => {
        const response = await customerApi.get(`/customer/orders/${id}`);
        return response.data;
    },
    checkout: async (orderData) => {
        const response = await customerApi.post('/customer/checkout', orderData);
        return response.data;
    },
    getShippingOptions: async (totalWeight, address = {}, subtotal = 0) => {
        const payload = {
            total_weight: totalWeight,
            country: address.country,
            state: address.state,
            city: address.city,
            postal_code: address.postal_code || '',
            subtotal: subtotal
        };
        const response = await customerApi.post('/customer/checkout/shipping-options', payload);
        return response.data;
    },

    confirmReceived: async (id) => {
        const response = await customerApi.post(`/customer/orders/${id}/confirm`, {});
        return response.data;
    },
    confirmDelivery: async (id) => {
        const response = await customerApi.post(`/customer/orders/${id}/confirm-delivery`, {});
        return response.data;
    },

    // Stock Reservation (Anti-Overselling)
    checkStockAvailability: async (items) => {
        const response = await customerApi.post('/customer/checkout/check-availability', { items });
        return response.data;
    },
    reserveStock: async (productId, quantity) => {
        const response = await customerApi.post('/customer/checkout/reserve', {
            product_id: productId,
            quantity: quantity
        });
        return response.data;
    },
    getReservationStatus: async (orderId = null, productId = null) => {
        const params = new URLSearchParams();
        if (orderId) params.append('order_id', orderId);
        if (productId) params.append('product_id', productId);
        const response = await customerApi.get(`/customer/checkout/reservation-status?${params}`);
        return response.data;
    },

    // Wishlist
    getWishlist: async () => {
        const response = await customerApi.get('/customer/wishlist');
        return response.data;
    },
    addToWishlist: async (productId) => {
        const response = await customerApi.post('/customer/wishlist', { product_id: productId });
        return response.data;
    },
    removeFromWishlist: async (id) => {
        const response = await customerApi.delete(`/customer/wishlist/${id}`);
        return response.data;
    },
    joinWaitlist: async (productId) => {
        const response = await customerApi.post(`/customer/waitlist/${productId}`, {});
        return response.data;
    },

    // Invoices & Payments
    submitPaymentProof: async (invoiceId, proofData) => {
        const response = await customerApi.post(`/customer/invoices/${invoiceId}/pay`, proofData);
        return response.data;
    },
    getInvoicePDFData: async (orderId, invoiceId) => {
        const response = await customerApi.get(`/customer/orders/${orderId}/invoices/${invoiceId}/pdf`);
        return response.data;
    },
    getInvoicePaymentLink: async (invoiceId) => {
        const response = await customerApi.get(`/customer/invoices/${invoiceId}/payment-link`);
        return response.data;
    },

    // Custom Payment Page APIs
    getInvoiceDetails: async (invoiceId) => {
        const response = await customerApi.get(`/customer/payment/${invoiceId}/details`);
        return response.data;
    },
    generatePaymentCode: async (invoiceId, paymentData) => {
        const response = await customerApi.post(`/customer/payment/${invoiceId}/generate`, paymentData);
        return response.data;
    },
    submitCreditCard: async (invoiceId, cardData) => {
        const response = await customerApi.post(`/customer/payment/${invoiceId}/submit-card`, cardData);
        return response.data;
    },
    validateVoucher: async (code, cartTotal, productIds = []) => {
        const response = await customerApi.post('/customer/vouchers/validate',
            { code, cart_total: cartTotal, product_ids: productIds }
        );
        return response.data;
    },
    getSavedCards: async () => {
        const response = await customerApi.get('/customer/payment/cards');
        return response.data;
    },
    checkPaymentStatus: async (invoiceId) => {
        const response = await customerApi.get(`/customer/payment/${invoiceId}/status`);
        return response.data;
    },

    // Profile
    getProfile: async () => {
        const response = await customerApi.get('/customer/profile');
        return response.data;
    },
    updateProfile: async (profileData) => {
        const response = await customerApi.put('/customer/profile', profileData);
        return response.data;
    },

    // Wallet
    getWalletBalance: async () => {
        const response = await customerApi.get('/customer/wallet');
        return response.data;
    },
    topUpWallet: async (amount) => {
        const response = await customerApi.post('/customer/wallet/topup', { amount });
        return response.data;
    },
    payInvoiceWithWallet: async (invoiceId) => {
        const response = await customerApi.post(`/customer/invoices/${invoiceId}/pay-wallet`, {});
        return response.data;
    },

    // Public (no auth required)
    getPublicSettings: async () => {
        const response = await axios.get(`${API_URL}/settings/public`);
        return response.data;
    }
};

