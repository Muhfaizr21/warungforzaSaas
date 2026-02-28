import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// ── Icons ──────────────────────────────────────────────────────────────
const icons = {
    success: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    ),
    error: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
    ),
    warning: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
    ),
    info: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
};

const styles = {
    success: {
        bg: 'bg-emerald-950/95',
        border: 'border-emerald-500/30',
        icon: 'bg-emerald-500/20 text-emerald-400',
        bar: 'bg-emerald-500',
        title: 'text-emerald-400',
    },
    error: {
        bg: 'bg-red-950/95',
        border: 'border-red-500/30',
        icon: 'bg-red-500/20 text-red-400',
        bar: 'bg-red-500',
        title: 'text-red-400',
    },
    warning: {
        bg: 'bg-amber-950/95',
        border: 'border-amber-500/30',
        icon: 'bg-amber-500/20 text-amber-400',
        bar: 'bg-amber-500',
        title: 'text-amber-400',
    },
    info: {
        bg: 'bg-blue-950/95',
        border: 'border-blue-500/30',
        icon: 'bg-blue-500/20 text-blue-400',
        bar: 'bg-blue-500',
        title: 'text-blue-400',
    },
};

// ── Single Toast ───────────────────────────────────────────────────────
const Toast = ({ toast, onRemove }) => {
    const [exiting, setExiting] = React.useState(false);
    const s = styles[toast.type] || styles.info;

    const handleClose = () => {
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 300);
    };

    React.useEffect(() => {
        if (toast.duration > 0) {
            const t = setTimeout(handleClose, toast.duration);
            return () => clearTimeout(t);
        }
    }, [toast.id]);

    return (
        <div
            className={`relative flex items-start gap-3 p-4 rounded-lg border backdrop-blur-xl shadow-2xl
                ${s.bg} ${s.border}
                overflow-hidden min-w-[300px] max-w-[420px] w-full
                transition-all duration-300
                ${exiting ? 'opacity-0 translate-x-16 scale-95' : 'opacity-100 translate-x-0 scale-100'}
            `}
            style={{ animation: exiting ? 'none' : 'toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
        >
            {/* Icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${s.icon}`}>
                {icons[toast.type]}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-0.5">
                {toast.title && (
                    <p className={`text-xs font-black uppercase tracking-widest mb-0.5 ${s.title}`}>
                        {toast.title}
                    </p>
                )}
                <p className="text-sm text-gray-300 leading-relaxed break-words">
                    {toast.message}
                </p>
            </div>

            {/* Close button */}
            <button
                onClick={handleClose}
                className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition-colors mt-0.5"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>

            {/* Progress bar */}
            {toast.duration > 0 && (
                <div
                    className={`absolute bottom-0 left-0 h-0.5 ${s.bar} origin-left`}
                    style={{
                        animation: `toastProgress ${toast.duration}ms linear forwards`,
                    }}
                />
            )}
        </div>
    );
};

// ── Toast Container ────────────────────────────────────────────────────
const ToastContainer = ({ toasts, onRemove }) => {
    return createPortal(
        <>
            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(100%) scale(0.9); }
                    to   { opacity: 1; transform: translateX(0) scale(1); }
                }
                @keyframes toastProgress {
                    from { transform: scaleX(1); }
                    to   { transform: scaleX(0); }
                }
            `}</style>
            <div
                className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
                aria-live="polite"
                aria-atomic="false"
            >
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast toast={toast} onRemove={onRemove} />
                    </div>
                ))}
            </div>
        </>,
        document.body
    );
};

// ── Context ────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

let idCounter = 0;

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const remove = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const add = useCallback((message, type = 'info', options = {}) => {
        const id = ++idCounter;
        const toast = {
            id,
            message: typeof message === 'string' ? message : String(message),
            type,
            title: options.title || null,
            duration: options.duration ?? 4000,
        };
        setToasts(prev => {
            // Max 5 toasts at once
            const next = prev.length >= 5 ? prev.slice(-4) : prev;
            return [...next, toast];
        });
        return id;
    }, []);

    // Convenience methods
    const toast = {
        success: (msg, opts) => add(msg, 'success', { title: 'Berhasil', ...opts }),
        error: (msg, opts) => add(msg, 'error', { title: 'Gagal', ...opts }),
        warning: (msg, opts) => add(msg, 'warning', { title: 'Peringatan', ...opts }),
        info: (msg, opts) => add(msg, 'info', { title: 'Info', ...opts }),
        show: (msg, type, opts) => add(msg, type, opts),
    };

    // Expose globally so legacy code can use window.__toast without importing
    React.useEffect(() => {
        window.__toast = toast;
        return () => { delete window.__toast; };
    }, [add]);

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onRemove={remove} />
        </ToastContext.Provider>
    );
};

// ── Hook ───────────────────────────────────────────────────────────────
export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
