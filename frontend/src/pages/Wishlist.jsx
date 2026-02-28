import React, { useState, useEffect } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import { HiTrash, HiShoppingCart, HiArrowLeft } from 'react-icons/hi';
import Image from '../components/Image';
import { UPLOAD_BASE_URL } from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const WishlistPage = () => {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();
    const [wishlists, setWishlists] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            const data = await customerService.getWishlist();
            setWishlists(data);
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const removeFromWishlist = async (wishlistId) => {
        try {
            await customerService.removeFromWishlist(wishlistId);
            setWishlists(prev => prev.filter(w => w.id !== wishlistId));
        } catch (error) {
            console.error('Failed to remove from wishlist:', error);
        }
    };

    const getProductImage = (product) => {
        try {
            if (!product) return '/placeholder.jpg';
            if (product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                let firstImg = Array.isArray(imgs) && imgs[0] ? imgs[0] : '/placeholder.jpg';
                if (firstImg && firstImg.startsWith('/') && !firstImg.startsWith('/images/')) {
                    return `${UPLOAD_BASE_URL}${firstImg}`;
                }
                return firstImg;
            }
            return '/placeholder.jpg';
        } catch (e) {
            return '/placeholder.jpg';
        }
    };



    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen bg-[#0b0d17]">
                <div className="w-12 h-12 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <span className="text-rose-600 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{t('common.loading')}</span>
            </div>
        );
    }

    return (
        <div className="bg-[#030303] min-h-screen pt-16 pb-20">
            {/* Header */}
            <div className="relative h-48 flex items-center overflow-hidden mb-8 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
                <div className="container relative z-10 w-full">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 transition-colors font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <HiArrowLeft size={16} />
                        <span>{t('common.back')}</span>
                    </button>
                    <h1 className="text-white uppercase italic">
                        Your <span className="text-rose-600">Wishlist</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
                        {wishlists.length} {t('wishlist.items')} Saved
                    </p>
                </div>
            </div>

            <div className="container">
                {wishlists.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <span className="text-8xl mb-8 opacity-20">❤️</span>
                        <h2 className="text-white uppercase italic mb-4">{t('wishlist.empty')}</h2>
                        <p className="text-gray-500 mb-8 text-sm">{t('wishlist.emptyDesc')}</p>
                        <button
                            onClick={() => navigate('/readystock')}
                            className="btn-primary"
                        >
                            {t('wishlist.browseProducts')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                        {wishlists.map(wishlist => (
                            <div key={wishlist.id} className="bg-white/5 border border-white/10 rounded-sm overflow-hidden group hover:border-red-600/30 transition-all">
                                {/* Product Image */}
                                <div
                                    className="relative aspect-square bg-black cursor-pointer"
                                    onClick={() => navigate(`/product/${wishlist.product_id}`)}
                                >
                                    <Image
                                        src={getProductImage(wishlist.product)}
                                        alt={wishlist.product?.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />

                                    {/* Stock Badge */}
                                    {(wishlist.product?.stock - (wishlist.product?.reserved_qty || 0)) <= 0 ? (
                                        <div className="absolute top-4 left-4 bg-gray-900 border border-gray-700 text-gray-400 text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                            {t('product.outOfStock')}
                                        </div>
                                    ) : wishlist.product?.product_type === 'po' ? (
                                        <div className="absolute top-4 left-4 bg-yellow-500 text-black text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                            Pre-Order
                                        </div>
                                    ) : (
                                        <div className="absolute top-4 left-4 bg-green-600 text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest">
                                            {t('product.inStock')}
                                        </div>
                                    )}
                                </div>

                                {/* Product Info */}
                                <div className="p-6">
                                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                                        {wishlist.product?.Brand?.name || 'Unknown Brand'}
                                    </p>
                                    <h3
                                        className="text-white font-bold text-sm mb-4 line-clamp-2 cursor-pointer hover:text-red-600 transition-colors"
                                        onClick={() => navigate(`/product/${wishlist.product_id}`)}
                                    >
                                        {wishlist.product?.name}
                                    </h3>

                                    <p className="text-2xl font-black text-white mb-6">
                                        {formatPrice(wishlist.product?.price || 0)}
                                    </p>

                                    {/* Notification Status */}
                                    {wishlist.notify_on_restock && (wishlist.product?.stock - (wishlist.product?.reserved_qty || 0)) <= 0 && (
                                        <div className="mb-4 p-3 bg-blue-600/20 border border-blue-600/30 rounded-sm">
                                            <p className="text-xs text-blue-400">
                                                🔔 You'll be notified when back in stock
                                            </p>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        {(wishlist.product?.stock - (wishlist.product?.reserved_qty || 0)) > 0 && (
                                            <button
                                                onClick={() => navigate(`/product/${wishlist.product_id}`)}
                                                className="flex-1 bg-rose-600 hover:bg-white hover:text-black text-white font-bold py-3 px-4 rounded-sm transition-all text-[10px] sm:text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                            >
                                                <HiShoppingCart size={16} />
                                                {wishlist.product?.product_type === 'po' ? 'Pre-Order' : t('wishlist.addToCart')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => removeFromWishlist(wishlist.id)}
                                            className="bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-sm transition-all"
                                            title="Remove from Wishlist"
                                        >
                                            <HiTrash size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WishlistPage;
