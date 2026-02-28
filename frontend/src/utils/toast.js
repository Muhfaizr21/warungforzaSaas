/**
 * Global toast helper — use inside event handlers without needing useToast() hook.
 * Works anywhere in the app after ToastProvider is mounted.
 *
 * Usage (in admin files that have many alert() calls):
 *   import { showToast } from '../utils/toast';
 *   showToast.success('Berhasil!');
 *   showToast.error('Gagal: ' + err.message);
 */
const proxy = (type) => (msg, opts) => {
    if (window.__toast) {
        window.__toast[type](msg, opts);
    } else {
        // Graceful fallback during SSR / before mount
        console.warn('[Toast]', type, msg);
    }
};

export const showToast = {
    success: proxy('success'),
    error: proxy('error'),
    warning: proxy('warning'),
    info: proxy('info'),
};
