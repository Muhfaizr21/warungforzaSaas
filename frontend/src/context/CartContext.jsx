import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../config/api';

const CartContext = createContext(undefined);

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load cart from local storage on init
    useEffect(() => {
        try {
            const savedCart = localStorage.getItem('forza_cart');
            if (savedCart && savedCart !== '[]') {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    // Sanitize each item
                    const sanitized = parsed.map(item => {
                        // Only keep primitive values
                        return {
                            id: item.id || 0,
                            name: String(item.name || ''),
                            price: Number(item.price || 0),
                            sku: String(item.sku || ''),
                            stock: Number(item.stock || 0),
                            weight: Number(item.weight || 0),
                            product_type: String(item.product_type || 'ready'),
                            quantity: Number(item.quantity || 1),
                            // Ensure brand is always a string
                            brand: String(
                                item.brand?.name ||
                                item.Brand?.name ||
                                (typeof item.brand === 'string' ? item.brand : 'Unknown Brand')
                            ),
                            // Handle images safely
                            images: item.images || [],
                            image: item.image || ''
                        };
                    });
                    setCartItems(sanitized);
                }
            }
        } catch (e) {
            console.error("Failed to load cart:", e);
            localStorage.removeItem('forza_cart');
        } finally {
            setIsInitialized(true);
        }
    }, []);

    // Save cart to local storage AND Sync to Backend (Debounced)
    useEffect(() => {
        if (isInitialized) {
            // 1. Local Persistence
            try {
                localStorage.setItem('forza_cart', JSON.stringify(cartItems));
            } catch (e) {
                console.error("Failed to save cart:", e);
            }

            // 2. Backend Sync (Abandoned Cart Analytics)
            const syncTimer = setTimeout(async () => {
                try {
                    // Get Session ID
                    let sessionId = localStorage.getItem('app_session_id');
                    if (!sessionId) {
                        sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                        localStorage.setItem('app_session_id', sessionId);
                    }

                    // Calculate Total
                    const total = cartItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

                    // Send to Backend
                    const token = localStorage.getItem('token');
                    const headers = {
                        'Content-Type': 'application/json'
                    };
                    if (token) headers['Authorization'] = `Bearer ${token}`;

                    await fetch(`${API_BASE_URL}/sync-cart`, {
                        method: 'POST',
                        headers: headers,
                        body: JSON.stringify({
                            items: cartItems,
                            total: total,
                            session_id: sessionId
                        })
                    });
                } catch (err) {
                    console.warn("Cart sync failed (non-critical):", err);
                }
            }, 2000); // Debounce 2s

            return () => clearTimeout(syncTimer);
        }
    }, [cartItems, isInitialized]);

    // Conflict Modal State
    const [conflictState, setConflictState] = useState({
        isOpen: false,
        currentType: '',
        newType: '',
        pendingProduct: null
    });

    const addToCart = (product, quantity = 1) => {
        if (!product || !product.id) {
            console.error("Invalid product");
            return;
        }

        // Sanitize product data
        const sanitizedProduct = {
            id: Number(product.id),
            name: String(product.name || ''),
            price: Number(product.price || 0),
            sku: String(product.sku || ''),
            stock: Number(product.stock || 0),
            weight: Number(product.weight || 0),
            product_type: String(product.product_type || 'ready'),
            brand: String(
                product.Brand?.name ||
                product.brand?.name ||
                (typeof product.brand === 'string' ? product.brand : 'Unknown Brand')
            ),
            images: product.images || [],
            image: product.image || ''
        };

        // Check for mixed cart types
        if (cartItems.length > 0) {
            const currentType = cartItems[0].product_type === 'po' ? 'po' : 'ready';
            const newType = product.product_type === 'po' ? 'po' : 'ready';

            if (currentType !== newType) {
                // Trigger Custom Modal instead of Alert
                setConflictState({
                    isOpen: true,
                    currentType: currentType,
                    newType: newType,
                    pendingProduct: { ...sanitizedProduct, quantity: Number(quantity) }
                });
                return;
            }
        }

        // Add item if no conflict
        setCartItems(prev => {
            const existing = prev.find(item => item.id === sanitizedProduct.id);
            if (existing) {
                return prev.map(item =>
                    item.id === sanitizedProduct.id
                        ? { ...item, quantity: item.quantity + Number(quantity) }
                        : item
                );
            }
            return [...prev, { ...sanitizedProduct, quantity: Number(quantity) }];
        });

        setIsCartOpen(true);
    };

    const resolveConflict = (action) => {
        if (action === 'clear_and_add') {
            const { pendingProduct } = conflictState;
            setCartItems([pendingProduct]);
            setIsCartOpen(true);
        }
        // Always close
        setConflictState({ isOpen: false, currentType: '', newType: '', pendingProduct: null });
    };

    const removeFromCart = (productId) => {
        setCartItems(prev => prev.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, newQuantity) => {
        const qty = Number(newQuantity);
        if (qty < 1) return;
        setCartItems(prev => prev.map(item =>
            item.id === productId ? { ...item, quantity: qty } : item
        ));
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartTotal = cartItems.reduce((total, item) => {
        return total + (Number(item.price) * Number(item.quantity));
    }, 0);

    const cartCount = cartItems.reduce((count, item) => {
        return count + Number(item.quantity);
    }, 0);

    const value = {
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen
    };

    return (
        <CartContext.Provider value={value}>
            {children}

            {/* GLOBAL CONFLICT MODAL */}
            {conflictState.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fadeIn"
                        onClick={() => resolveConflict('cancel')}
                    ></div>

                    {/* Modal Content */}
                    <div className="relative bg-[#0a0a0b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-slideUp">
                        {/* Status Bar */}
                        <div className="h-1 w-full bg-gradient-to-r from-rose-600 via-red-500 to-rose-900"></div>

                        <div className="p-8">
                            {/* Icon */}
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 mx-auto border border-rose-500/20">
                                <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>

                            <h3 className="text-2xl font-black text-center text-white mb-2 uppercase tracking-wide">
                                Product Category Conflict
                            </h3>
                            <p className="text-gray-400 text-center text-sm leading-relaxed mb-8">
                                <span className="text-white font-bold">{conflictState.currentType === 'po' ? 'Pre-Order' : 'Ready Stock'}</span> artifacts cannot be combined with <span className="text-white font-bold">{conflictState.newType === 'po' ? 'Pre-Order' : 'Ready Stock'}</span> artifacts in the same cart session.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => resolveConflict('clear_and_add')}
                                    className="w-full py-4 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 group"
                                >
                                    <span>Purge Cart & Add Artifact</span>
                                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>

                                <button
                                    onClick={() => resolveConflict('cancel')}
                                    className="w-full py-4 bg-transparent text-white/50 font-bold text-xs uppercase tracking-widest rounded-lg hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </CartContext.Provider>
    );
};
