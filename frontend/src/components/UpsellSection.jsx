import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../services/publicService';
import { useCurrency } from '../context/CurrencyContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { UPLOAD_BASE_URL } from '../config/api';
import Image from './Image';

const UpsellSection = ({ productId, title = 'You May Also Like', subtitle = 'Complete your collection' }) => {
    const [upsells, setUpsells] = useState([]);
    const [loading, setLoading] = useState(true);
    const { formatPrice } = useCurrency();
    const { addToCart } = useCart();
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        if (!productId) return;
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await publicService.getUpsellProducts(productId);
                setUpsells(res.data || []);
            } catch {
                setUpsells([]);
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [productId]);

    if (loading || upsells.length === 0) return null;

    const getImage = (product) => {
        let imgs = [];
        if (Array.isArray(product.images)) {
            imgs = product.images;
        } else if (typeof product.images === 'string') {
            try { imgs = JSON.parse(product.images); } catch { imgs = []; }
        }
        return imgs[0] || null;
    };

    return (
        <section className="mt-16 mb-12">
            {/* Header */}
            <div className="flex items-end justify-between mb-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-600 mb-1">{subtitle}</p>
                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{title}</h3>
                </div>
                <div className="h-px flex-1 mx-8 bg-white/5" />
                <span className="text-xs text-gray-600 font-black uppercase tracking-widest">{upsells.length} item{upsells.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {upsells.map((product) => {
                    const img = getImage(product);
                    const available = product.available_stock ?? (product.stock - product.reserved_qty);
                    const isPO = product.product_type === 'po';
                    const isOutOfStock = !isPO && available <= 0;

                    return (
                        <div
                            key={product.id}
                            className="group relative bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden cursor-pointer hover:border-rose-500/30 hover:bg-white/[0.04] transition-all duration-300"
                            onClick={() => navigate(`/product/${product.id}`)}
                        >
                            {/* Image */}
                            <div className="relative aspect-square overflow-hidden bg-black/40">
                                {img ? (
                                    <Image
                                        src={img.startsWith('http') ? img : `${UPLOAD_BASE_URL}${img}`}
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-700 text-4xl">🎭</div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-2 left-2 flex flex-col gap-1">
                                    {isPO && (
                                        <span className="bg-purple-900/80 text-purple-300 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Pre-Order</span>
                                    )}
                                    {isOutOfStock && (
                                        <span className="bg-black/70 text-gray-400 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Sold Out</span>
                                    )}
                                    {product.is_exclusive && (
                                        <span className="bg-amber-900/80 text-amber-300 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Exclusive</span>
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3">
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest mb-1 truncate">
                                    {product.brand?.name || product.category?.name || '—'}
                                </p>
                                <h4 className="text-white text-xs font-bold leading-tight line-clamp-2 mb-2 group-hover:text-rose-400 transition-colors">
                                    {product.name}
                                </h4>
                                <p className="text-rose-500 font-black text-sm">{formatPrice(product.price)}</p>

                                {/* Quick Add Button */}
                                {!isOutOfStock && !isPO && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            addToCart({ ...product, quantity: 1 });
                                            toast.success('Added to cart!');
                                        }}
                                        className="mt-2 w-full py-1.5 text-[10px] font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors duration-200"
                                    >
                                        Add to Cart
                                    </button>
                                )}
                                {isPO && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); navigate(`/product/${product.id}`); }}
                                        className="mt-2 w-full py-1.5 text-[10px] font-black uppercase tracking-widest bg-purple-700 hover:bg-purple-600 text-white rounded transition-colors duration-200"
                                    >
                                        Pre-Order
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default UpsellSection;
