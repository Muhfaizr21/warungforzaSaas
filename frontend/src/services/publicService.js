import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const BASE_URL = API_BASE_URL;

export const publicService = {
    getProducts: async (params) => {
        try {
            const response = await axios.get(`${BASE_URL}/products`, { params });
            return response.data;
        } catch (error) {
            console.error("Error fetching products", error);
            throw error;
        }
    },

    getProductById: async (id) => {
        try {
            const response = await axios.get(`${BASE_URL}/products/${id}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching product detail", error);
            throw error;
        }
    },

    getRelatedProducts: async (id) => {
        try {
            const response = await axios.get(`${BASE_URL}/products/${id}/related`);
            return response.data;
        } catch (error) {
            console.error("Error fetching related products", error);
            return { data: [] }; // Return empty array on error
        }
    },

    getCategories: async () => {
        const response = await axios.get(`${BASE_URL}/categories/public`);
        return response.data.data;
    },

    getBrands: async () => {
        const response = await axios.get(`${BASE_URL}/brands/public`);
        return response.data.data;
    },

    getSeries: async () => {
        const response = await axios.get(`${BASE_URL}/series/public`);
        return response.data.data;
    },

    getCharacters: async () => {
        const response = await axios.get(`${BASE_URL}/characters/public`);
        return response.data.data;
    },

    getGenres: async () => {
        const response = await axios.get(`${BASE_URL}/genres/public`);
        return response.data.data;
    },

    getScales: async () => {
        const response = await axios.get(`${BASE_URL}/scales/public`);
        return response.data.data;
    },

    getMaterials: async () => {
        const response = await axios.get(`${BASE_URL}/materials/public`);
        return response.data.data;
    },

    getEditionTypes: async () => {
        const response = await axios.get(`${BASE_URL}/edition-types/public`);
        return response.data.data;
    },

    getLatestBlogPosts: async () => {
        try {
            const response = await axios.get(`${BASE_URL}/blog/latest`);
            return response.data;
        } catch (error) {
            console.error("Error fetching latest blog posts", error);
            return [];
        }
    },

    getIntlShippingOptions: async (params) => {
        const response = await axios.get(`${BASE_URL}/shipping/intl-options`, { params });
        return response.data;
    },

    getUpsellProducts: async (id) => {
        try {
            const response = await axios.get(`${BASE_URL}/products/${id}/upsells`);
            return response.data;
        } catch (error) {
            console.error('Error fetching upsell products', error);
            return { data: [] };
        }
    },
};
