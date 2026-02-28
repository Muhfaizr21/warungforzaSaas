import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => Promise.reject(error));

// Track if we're already redirecting to prevent loops
let isRedirectingToLogin = false;

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // ✅ FIX: Prevent redirect loop if already on login page
            if (!isRedirectingToLogin && !window.location.pathname.includes('/login')) {
                isRedirectingToLogin = true;
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                // Save current path so user can return after login
                const nextPath = window.location.pathname + window.location.search;
                window.location.href = `/login?next=${encodeURIComponent(nextPath)}`;
                // Reset flag after short delay
                setTimeout(() => { isRedirectingToLogin = false; }, 2000);
            }
        }
        // ✅ FIX: Make network errors more informative
        if (!error.response) {
            error.message = 'Tidak dapat terhubung ke server. Periksa koneksi Anda.';
        }
        return Promise.reject(error);
    }
);

// ============================================
// ADMIN SERVICE - All Admin API Calls
// Base: /api/admin/*
// ============================================
export const adminService = {
    // ============================================
    // AUTH (Public)
    // ============================================
    login: async (credentials) => {
        const response = await api.post('/login', credentials);
        return response.data;
    },
    register: async (data) => {
        const response = await api.post('/register', data);
        return response.data;
    },

    // ============================================
    // UTILS
    // ============================================
    uploadFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/admin/upload', formData);
        return response.data; // { url: "/uploads/..." }
    },

    // ============================================
    // DASHBOARD
    // ============================================
    // ============================================
    getDashboardStats: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/stats?${params}`);
        return response.data;
    },
    getCustomerDemographics: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/customer-demographics?${params}`);
        return response.data;
    },
    getSalesTrend: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/sales-trend?${params}`);
        return response.data;
    },
    getMonthlySales: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/monthly-sales?${params}`);
        return response.data;
    },
    getTopProducts: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/top-products?${params}`);
        return response.data;
    },
    getOrderStatusDistribution: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/dashboard/order-distribution?${params}`);
        return response.data;
    },

    // ============================================
    // PRODUCTS
    // ============================================
    getProducts: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/products?${params}`);
        return response.data;
    },
    getProductStats: async () => {
        const response = await api.get('/admin/products/stats');
        return response.data;
    },
    getProduct: async (id) => {
        const response = await api.get(`/admin/products/${id}`);
        return response.data;
    },
    createProduct: async (data) => {
        const response = await api.post('/admin/products', data);
        return response.data;
    },
    updateProduct: async (id, data) => {
        const response = await api.put(`/admin/products/${id}`, data);
        return response.data;
    },
    deleteProduct: async (id) => {
        const response = await api.delete(`/admin/products/${id}`);
        return response.data;
    },
    markProductArrived: async (id, data = {}) => {
        const response = await api.post(`/admin/products/${id}/arrive`, data);
        return response.data;
    },
    // Upsell / Cross-sell
    getProductUpsells: async (id) => {
        const response = await api.get(`/admin/products/${id}/upsells`);
        return response.data;
    },
    setProductUpsells: async (id, data) => {
        const response = await api.put(`/admin/products/${id}/upsells`, data);
        return response.data;
    },
    // Low Stock
    getLowStockProducts: async () => {
        const response = await api.get('/admin/products/low-stock');
        return response.data;
    },
    sendLowStockAlert: async () => {
        const response = await api.post('/admin/products/low-stock/alert');
        return response.data;
    },

    // ============================================
    // CATEGORIES
    // ============================================
    getCategories: async () => {
        const response = await api.get('/admin/categories');
        return response.data;
    },
    getCategory: async (id) => {
        const response = await api.get(`/admin/categories/${id}`);
        return response.data;
    },
    createCategory: async (data) => {
        const response = await api.post('/admin/categories', data);
        return response.data;
    },
    updateCategory: async (id, data) => {
        const response = await api.put(`/admin/categories/${id}`, data);
        return response.data;
    },
    deleteCategory: async (id) => {
        const response = await api.delete(`/admin/categories/${id}`);
        return response.data;
    },

    // ============================================
    // BRANDS
    // ============================================
    getBrands: async () => {
        const response = await api.get('/admin/brands');
        return response.data;
    },
    createBrand: async (data) => {
        const response = await api.post('/admin/brands', data);
        return response.data;
    },
    updateBrand: async (id, data) => {
        const response = await api.put(`/admin/brands/${id}`, data);
        return response.data;
    },
    deleteBrand: async (id) => {
        const response = await api.delete(`/admin/brands/${id}`);
        return response.data;
    },

    // ============================================
    // CUSTOM FIELDS
    // ============================================
    getCustomFields: async () => {
        const response = await api.get('/admin/custom-fields');
        return response.data;
    },
    createCustomField: async (data) => {
        const response = await api.post('/admin/custom-fields', data);
        return response.data;
    },
    updateCustomField: async (id, data) => {
        const response = await api.put(`/admin/custom-fields/${id}`, data);
        return response.data;
    },
    deleteCustomField: async (id) => {
        const response = await api.delete(`/admin/custom-fields/${id}`);
        return response.data;
    },

    // ============================================
    // TAXONOMY EXTENSION (Series, Characters, Genres)
    // ============================================
    // Series
    getSeries: async () => {
        const response = await api.get('/admin/series');
        return response.data;
    },
    createSeries: async (data) => {
        const response = await api.post('/admin/series', data);
        return response.data;
    },
    updateSeries: async (id, data) => {
        const response = await api.put(`/admin/series/${id}`, data);
        return response.data;
    },
    deleteSeries: async (id) => {
        const response = await api.delete(`/admin/series/${id}`);
        return response.data;
    },

    // Characters
    getCharacters: async () => {
        const response = await api.get('/admin/characters');
        return response.data;
    },
    createCharacter: async (data) => {
        const response = await api.post('/admin/characters', data);
        return response.data;
    },
    updateCharacter: async (id, data) => {
        const response = await api.put(`/admin/characters/${id}`, data);
        return response.data;
    },
    deleteCharacter: async (id) => {
        const response = await api.delete(`/admin/characters/${id}`);
        return response.data;
    },

    // Genres
    getGenres: async () => {
        const response = await api.get('/admin/genres');
        return response.data;
    },
    createGenre: async (data) => {
        const response = await api.post('/admin/genres', data);
        return response.data;
    },
    updateGenre: async (id, data) => {
        const response = await api.put(`/admin/genres/${id}`, data);
        return response.data;
    },
    deleteGenre: async (id) => {
        const response = await api.delete(`/admin/genres/${id}`);
        return response.data;
    },

    // ============================================
    // TAXONOMY V2 (Scale, Material, Edition)
    // ============================================
    // Scale
    getScales: async () => {
        const response = await api.get('/admin/scales');
        return response.data;
    },
    createScale: async (data) => {
        const response = await api.post('/admin/scales', data);
        return response.data;
    },
    updateScale: async (id, data) => {
        const response = await api.put(`/admin/scales/${id}`, data);
        return response.data;
    },
    deleteScale: async (id) => {
        const response = await api.delete(`/admin/scales/${id}`);
        return response.data;
    },

    // Material
    getMaterials: async () => {
        const response = await api.get('/admin/materials');
        return response.data;
    },
    createMaterial: async (data) => {
        const response = await api.post('/admin/materials', data);
        return response.data;
    },
    deleteMaterial: async (id) => {
        const response = await api.delete(`/admin/materials/${id}`);
        return response.data;
    },
    updateMaterial: async (id, data) => {
        const response = await api.put(`/admin/materials/${id}`, data);
        return response.data;
    },

    // Edition Type
    getEditionTypes: async () => {
        const response = await api.get('/admin/edition-types');
        return response.data;
    },
    createEditionType: async (data) => {
        const response = await api.post('/admin/edition-types', data);
        return response.data;
    },
    deleteEditionType: async (id) => {
        const response = await api.delete(`/admin/edition-types/${id}`);
        return response.data;
    },
    updateEditionType: async (id, data) => {
        const response = await api.put(`/admin/edition-types/${id}`, data);
        return response.data;
    },

    // ============================================
    // ORDERS
    // ============================================
    getOrders: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/orders?${params}`);
        return response.data;
    },
    getOrderStats: async () => {
        const response = await api.get('/admin/orders/stats');
        return response.data;
    },
    checkExpiredPOs: async () => {
        const response = await api.post('/admin/orders/ghost-protocol');
        return response.data;
    },
    createOrder: async (data) => {
        const response = await api.post('/admin/orders', data);
        return response.data;
    },

    getOrder: async (id) => {
        const response = await api.get(`/admin/orders/${id}`);
        return response.data;
    },
    updateOrderStatus: async (id, data) => {
        const response = await api.put(`/admin/orders/${id}/status`, data);
        return response.data;
    },
    shipOrder: async (id, data) => {
        const response = await api.post(`/admin/orders/${id}/ship`, data);
        return response.data;
    },
    quickShip: async (data) => {
        const response = await api.post('/admin/orders/quick-ship', data);
        return response.data;
    },
    getActiveCouriers: async () => {
        const response = await api.get('/admin/orders/couriers-active');
        return response.data;
    },
    cancelOrder: async (id, data) => {
        const response = await api.post(`/admin/orders/${id}/cancel`, data);
        return response.data;
    },
    refundOrder: async (id, data) => {
        const response = await api.post(`/admin/orders/${id}/refund`, data);
        return response.data;
    },
    markOrderArrived: async (id) => {
        const response = await api.post(`/admin/orders/${id}/mark-arrived`);
        return response.data;
    },
    forceCancelPO: async (id) => {
        const response = await api.post(`/admin/orders/${id}/force-cancel`);
        return response.data;
    },
    openBalanceDue: async (id) => {
        const response = await api.post(`/admin/orders/${id}/open-balance`);
        return response.data;
    },
    addOrderNote: async (id, note) => {
        const response = await api.post(`/admin/orders/${id}/note`, { note });
        return response.data;
    },
    getOrderInvoices: async (id) => {
        const response = await api.get(`/admin/orders/${id}/invoices`);
        return response.data;
    },

    // ============================================
    // INVOICES
    // ============================================
    payInvoice: async (id) => {
        const response = await api.post(`/admin/invoices/${id}/pay`);
        return response.data;
    },

    // ============================================
    // SYSTEM USERS (Staff)
    // ============================================
    createSystemUser: async (data) => {
        const response = await api.post('/admin/system-users', data);
        return response.data;
    },
    getSystemUsers: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/system-users?${params}`);
        return response.data;
    },
    updateSystemUser: async (id, data) => {
        const response = await api.put(`/admin/system-users/${id}`, data);
        return response.data;
    },
    updateSystemUserRole: async (id, roleId) => {
        const response = await api.put(`/admin/system-users/${id}/role`, { role_id: roleId });
        return response.data;
    },
    deleteSystemUser: async (id) => {
        const response = await api.delete(`/admin/system-users/${id}`);
        return response.data;
    },

    // ============================================
    // CUSTOMERS
    // ============================================
    getCustomerStats: async () => {
        const response = await api.get('/admin/customers/stats');
        return response.data;
    },
    getCustomers: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/customers?${params}`);
        return response.data;
    },
    getCustomer: async (id) => {
        const response = await api.get(`/admin/customers/${id}`);
        return response.data;
    },
    updateCustomerNotes: async (id, notes) => {
        const response = await api.put(`/admin/customers/${id}/notes`, { notes });
        return response.data;
    },


    // ============================================
    // FINANCE - CHART OF ACCOUNTS (COA)
    // ============================================
    getCOAs: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/coa?${params}`);
        return response.data;
    },
    getCOA: async (id) => {
        const response = await api.get(`/admin/finance/coa/${id}`);
        return response.data;
    },
    getNextCOACode: async (type, parentId = null) => {
        const url = `/admin/finance/coa/next-code?type=${type}${parentId ? `&parent_id=${parentId}` : ''}`;
        const response = await api.get(url);
        return response.data;
    },
    createCOA: async (data) => {
        const response = await api.post('/admin/finance/coa', data);
        return response.data;
    },
    updateCOA: async (id, data) => {
        const response = await api.put(`/admin/finance/coa/${id}`, data);
        return response.data;
    },
    deleteCOA: async (id) => {
        const response = await api.delete(`/admin/finance/coa/${id}`);
        return response.data;
    },

    // ============================================
    // FINANCE - JOURNAL ENTRIES
    // ============================================
    getJournals: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/journals?${params}`);
        return response.data;
    },
    getJournal: async (id) => {
        const response = await api.get(`/admin/finance/journals/${id}`);
        return response.data;
    },
    createJournal: async (data) => {
        const response = await api.post('/admin/finance/journals', data);
        return response.data;
    },

    // ============================================
    // FINANCE - EXPENSES
    // ============================================
    getExpenses: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/expenses?${params}`);
        return response.data;
    },
    getExpense: async (id) => {
        const response = await api.get(`/admin/finance/expenses/${id}`);
        return response.data;
    },
    createExpense: async (data) => {
        const response = await api.post('/admin/finance/expenses', data);
        return response.data;
    },
    updateExpense: async (id, data) => {
        const response = await api.put(`/admin/finance/expenses/${id}`, data);
        return response.data;
    },
    deleteExpense: async (id) => {
        const response = await api.delete(`/admin/finance/expenses/${id}`);
        return response.data;
    },
    // Alias for backward compatibility
    recordExpense: async (data) => {
        const response = await api.post('/admin/finance/expenses', data);
        return response.data;
    },

    // ============================================
    // FINANCE - STATS & REPORTS
    // ============================================
    getFinanceStats: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/stats?${params}`);
        return response.data;
    },
    getCashFlowTrend: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/trend?${params}`);
        return response.data;
    },
    getProfitLossReport: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/finance/reports/pnl?${params}`);
        return response.data;
    },

    // ============================================
    // ANNOUNCEMENTS
    // ============================================
    getAnnouncements: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/announcements?${params}`);
        return response.data;
    },
    getAnnouncement: async (id) => {
        const response = await api.get(`/admin/announcements/${id}`);
        return response.data;
    },
    createAnnouncement: async (data) => {
        const response = await api.post('/admin/announcements', data);
        return response.data;
    },
    updateAnnouncement: async (id, data) => {
        const response = await api.put(`/admin/announcements/${id}`, data);
        return response.data;
    },
    deleteAnnouncement: async (id) => {
        const response = await api.delete(`/admin/announcements/${id}`);
        return response.data;
    },
    publishAnnouncement: async (id) => {
        const response = await api.post(`/admin/announcements/${id}/publish`);
        return response.data;
    },
    broadcastAnnouncement: async (id) => {
        const response = await api.post(`/admin/announcements/${id}/broadcast`);
        return response.data;
    },

    // ============================================
    // NEWSLETTER
    // ============================================
    getNewsletterSubscribers: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/newsletter/subscribers?${params}`);
        return response.data;
    },
    syncNewsletterSubscribers: async () => {
        const response = await api.post('/admin/newsletter/sync');
        return response.data;
    },
    getNewsletterCampaigns: async () => {
        const response = await api.get('/admin/newsletter/campaigns');
        return response.data;
    },
    getNewsletterCampaign: async (id) => {
        const response = await api.get(`/admin/newsletter/campaigns/${id}`);
        return response.data;
    },
    createNewsletterCampaign: async (data) => {
        const response = await api.post('/admin/newsletter/campaigns', data);
        return response.data;
    },
    sendNewsletterCampaign: async (id) => {
        const response = await api.post(`/admin/newsletter/campaigns/${id}/send`);
        return response.data;
    },

    // ============================================
    // WISHLIST
    // ============================================
    getWishlistOverview: async () => {
        const response = await api.get('/admin/wishlist/overview');
        return response.data;
    },
    triggerRestockNotification: async (productId) => {
        const response = await api.post(`/admin/wishlist/${productId}/notify`);
        return response.data;
    },

    // ============================================
    // SUPPLIERS
    // ============================================
    getSuppliers: async () => {
        const response = await api.get('/admin/suppliers');
        return response.data;
    },
    getSupplier: async (id) => {
        const response = await api.get(`/admin/suppliers/${id}`);
        return response.data;
    },
    createSupplier: async (data) => {
        const response = await api.post('/admin/suppliers', data);
        return response.data;
    },
    updateSupplier: async (id, data) => {
        const response = await api.put(`/admin/suppliers/${id}`, data);
        return response.data;
    },
    deleteSupplier: async (id) => {
        const response = await api.delete(`/admin/suppliers/${id}`);
        return response.data;
    },

    // ============================================
    // PROCUREMENT (Purchase Orders)
    // ============================================
    getPurchaseOrders: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/procurement/orders?${params}`);
        return response.data;
    },
    getPurchaseOrderStats: async () => {
        const response = await api.get('/admin/procurement/orders/stats');
        return response.data;
    },
    getPurchaseOrder: async (id) => {
        const response = await api.get(`/admin/procurement/orders/${id}`);
        return response.data;
    },
    createPurchaseOrder: async (data) => {
        const response = await api.post('/admin/procurement/orders', data);
        return response.data;
    },
    updatePurchaseOrder: async (id, data) => {
        const response = await api.put(`/admin/procurement/orders/${id}`, data);
        return response.data;
    },
    receivePurchaseOrder: async (id) => {
        const response = await api.post(`/admin/procurement/orders/${id}/receive`);
        return response.data;
    },
    deletePurchaseOrder: async (id) => {
        const response = await api.delete(`/admin/procurement/orders/${id}`);
        return response.data;
    },

    // ============================================
    // SETTINGS
    // ============================================
    getSettings: async () => {
        const response = await api.get('/admin/settings');
        return response.data;
    },
    updateSetting: async (data) => {
        const response = await api.post('/admin/settings', data);
        return response.data;
    },
    bulkUpdateSettings: async (settings) => {
        // settings: Array of { key, value }
        const response = await api.post('/admin/settings/bulk', settings);
        return response.data;
    },
    getShippingRates: async () => {
        const response = await api.get('/admin/settings/shipping');
        return response.data;
    },
    createShippingRate: async (data) => {
        const response = await api.post('/admin/settings/shipping', data);
        return response.data;
    },
    updateShippingRate: async (id, data) => {
        const response = await api.put(`/admin/settings/shipping/${id}`, data);
        return response.data;
    },
    deleteShippingRate: async (id) => {
        const response = await api.delete(`/admin/settings/shipping/${id}`);
        return response.data;
    },
    getCarriers: async () => {
        const response = await api.get('/admin/settings/carriers');
        return response.data;
    },
    syncCarriers: async () => {
        const response = await api.post('/admin/settings/carriers/sync');
        return response.data;
    },
    createCarrier: async (data) => {
        const response = await api.post('/admin/settings/carriers', data);
        return response.data;
    },
    updateCarrier: async (id, data) => {
        const response = await api.put(`/admin/settings/carriers/${id}`, data);
        return response.data;
    },
    updateCarrierService: async (id, serviceId, data) => {
        const response = await api.put(`/admin/settings/carriers/${id}/services/${serviceId}`, data);
        return response.data;
    },

    // ============================================
    // INTERNATIONAL SHIPPING (Zones & Methods)
    // ============================================
    getShippingZones: async () => {
        const response = await api.get('/admin/settings/intl/zones');
        return response.data;
    },
    createShippingZone: async (data) => {
        const response = await api.post('/admin/settings/intl/zones', data);
        return response.data;
    },
    updateShippingZone: async (id, data) => {
        const response = await api.put(`/admin/settings/intl/zones/${id}`, data);
        return response.data;
    },
    deleteShippingZone: async (id) => {
        const response = await api.delete(`/admin/settings/intl/zones/${id}`);
        return response.data;
    },
    createShippingMethod: async (data) => {
        const response = await api.post('/admin/settings/intl/methods', data);
        return response.data;
    },
    updateShippingMethod: async (id, data) => {
        const response = await api.put(`/admin/settings/intl/methods/${id}`, data);
        return response.data;
    },
    deleteShippingMethod: async (id) => {
        const response = await api.delete(`/admin/settings/intl/methods/${id}`);
        return response.data;
    },

    // ============================================
    // AUDIT LOGS
    // ============================================
    getAuditLogs: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/audit?${params}`);
        return response.data;
    },
    getAuditLogModules: async () => {
        const response = await api.get('/admin/audit/modules');
        return response.data;
    },
    // ============================================
    // CURRENCIES
    // ============================================
    getCurrencies: async () => {
        const response = await api.get('/admin/currencies');
        return response.data;
    },
    createCurrency: async (data) => {
        const response = await api.post('/admin/currencies', data);
        return response.data;
    },
    updateCurrency: async (code, data) => {
        const response = await api.put(`/admin/currencies/${code}`, data);
        return response.data;
    },
    deleteCurrency: async (code) => {
        const response = await api.delete(`/admin/currencies/${code}`);
        return response.data;
    },

    // ============================================
    // NOTIFICATIONS
    // ============================================
    getAdminNotifications: async () => {
        const response = await api.get('/admin/notifications');
        return response.data;
    },
    markAdminNotificationAsRead: async (id) => {
        const response = await api.put(`/admin/notifications/${id}/read`);
        return response.data;
    },

    // ============================================
    // EMAIL PREVIEW
    // ============================================
    getEmailPreview: async (type = 'payment', overrides = {}) => {
        const response = await api.post(`/admin/settings/email-preview`, {
            type,
            overrides
        }, {
            responseType: 'text',
        });
        return response.data; // returns raw HTML string
    },
};

export default api;
