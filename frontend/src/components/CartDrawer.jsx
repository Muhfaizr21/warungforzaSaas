import React, { useRef, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { HiX, HiTrash } from 'react-icons/hi';

const CartDrawer = () => {
    const {
        isCartOpen,
        setIsCartOpen,
        cartItems,
        removeFromCart,
        updateQuantity,
        cartTotal
    } = useCart();
    const { formatPrice } = useCurrency();

    const navigate = useNavigate();
    const drawerRef = useRef();

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (drawerRef.current && !drawerRef.current.contains(event.target)) {
                setIsCartOpen(false);
            }
        };

        if (isCartOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCartOpen, setIsCartOpen]);



    const getItemImage = (item) => {
        try {
            if (item.image) return item.image;
            if (Array.isArray(item.images)) return item.images[0] || '/placeholder.jpg';
            if (typeof item.images === 'string') {
                const parsed = JSON.parse(item.images);
                return Array.isArray(parsed) ? (parsed[0] || '/placeholder.jpg') : '/placeholder.jpg';
            }
            return '/placeholder.jpg';
        } catch (e) {
            return '/placeholder.jpg';
        }
    };

    if (!isCartOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setIsCartOpen(false)}></div>

            {/* Drawer */}
            <div
                ref={drawerRef}
                className="relative w-full max-w-md bg-[#0b0d17] border-l border-white/10 shadow-2xl h-full flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right"
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#161926]">
                    <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                        Your Stash <span className="text-neon-pink">({cartItems.length})</span>
                    </h2>
                    <button onClick={() => setIsCartOpen(false)} className="bg-white/5 hover:bg-white/10 p-2 rounded-full text-white transition-colors">
                        <HiX size={20} />
                    </button>
                </div>

                {/* Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {cartItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-center opacity-50">
                            <span className="text-6xl mb-4">🕸️</span>
                            <p className="text-sm uppercase font-bold tracking-widest">Your collection is empty</p>
                        </div>
                    ) : (
                        cartItems.map(item => (
                            <div key={item.id} className="flex gap-4 bg-white/5 p-4 rounded-sm border border-white/5 relative group">
                                <div className="w-20 h-20 bg-black rounded-sm overflow-hidden flex-shrink-0">
                                    <img
                                        src={getItemImage(item)}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.target.src = '/placeholder.jpg'}
                                    />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{item.name}</h4>
                                    <p className="text-[10px] text-neon-pink font-black uppercase tracking-wider mb-2">
                                        {item.brand || 'Unknown Brand'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <p className="text-gold font-bold text-sm">{formatPrice(item.price)}</p>

                                        <div className="flex items-center gap-3 bg-black/50 rounded-full px-2 py-1">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="text-gray-400 hover:text-white"
                                            >-</button>
                                            <span className="text-xs font-mono">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="text-gray-400 hover:text-white"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg scale-90 hover:scale-100"
                                >
                                    <HiTrash size={12} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 bg-[#161926] space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Total Valuation</span>
                        <span className="text-2xl font-black text-white italic">{formatPrice(cartTotal)}</span>
                    </div>
                    <button className="w-full bg-neon-pink hover:bg-neon-pink/90 text-white font-black py-4 uppercase tracking-[0.2em] skew-x-[-10deg] transition-all hover:skew-x-0 shadow-lg shadow-neon-pink/20">
                        Proceed to Checkout
                    </button>
                    <button onClick={() => navigate('/readystock')} className="w-full text-[10px] text-gray-500 font-bold uppercase tracking-widest hover:text-white text-center">
                        Continue Hunting
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CartDrawer;
