import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { publicService } from '../services/publicService';
import { customerService } from '../services/customerService';
import { HiHeart, HiOutlineHeart } from 'react-icons/hi';
import SEO from '../components/SEO';
import { UPLOAD_BASE_URL } from '../config/api';
import ConfirmationModal from '../components/ConfirmationModal';
import { sanitizeInput } from '../utils/security';
import Image from '../components/Image';
import { useLanguage } from '../context/LanguageContext';
import UpsellSection from '../components/UpsellSection';

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { formatPrice } = useCurrency();
    const toast = useToast();
    const { t } = useLanguage();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);
    const [activeTab, setActiveTab] = useState('description');
    const [preOrderType, setPreOrderType] = useState('deposit');
    const [quantity, setQuantity] = useState(1);
    const [images, setImages] = useState([]);
    const [isInWishlist, setIsInWishlist] = useState(false);
    const [wishlistLoading, setWishlistLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);

    // New State for Related Products
    const [relatedProducts, setRelatedProducts] = useState([]);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data = await publicService.getProductById(id);
                setProduct(data);

                // Fetch Related Products (Fase 2)
                const relatedData = await publicService.getRelatedProducts(id);
                if (relatedData && relatedData.data) {
                    setRelatedProducts(relatedData.data);
                }

                // Parse Images
                let parsedImages = [];
                if (data.images) {
                    if (typeof data.images === 'string') {
                        try {
                            if (data.images.startsWith('[')) {
                                parsedImages = JSON.parse(data.images);
                            } else {
                                parsedImages = data.images.split(',');
                            }
                        } catch (e) {
                            parsedImages = [data.images];
                        }
                    } else if (Array.isArray(data.images)) {
                        parsedImages = data.images;
                    }
                }
                setImages(parsedImages.length > 0 ? parsedImages.map(img => img.startsWith('http') ? img : `${UPLOAD_BASE_URL}${img}`) : ['/placeholder.jpg']);

            } catch (error) {
                console.error("Failed to load product", error);
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchProduct();
    }, [id]);

    const [waitlistLoading, setWaitlistLoading] = useState(false);

    const handleAddToCart = () => {
        if (!localStorage.getItem('token')) {
            setShowLoginModal(true);
            return;
        }
        addToCart(product, quantity);
    };

    const handleJoinWaitlist = async () => {
        if (!localStorage.getItem('token')) {
            setShowLoginModal(true);
            return;
        }
        setWaitlistLoading(true);
        try {
            const res = await customerService.joinWaitlist(product.id);
            toast.success(res.message || 'Berhasil bergabung ke waitlist!');
        } catch (error) {
            console.error('Waitlist error:', error);
            toast.error(error.response?.data?.error || 'Gagal bergabung ke waitlist. Coba lagi.');
        } finally {
            setWaitlistLoading(false);
        }
    };

    const handleToggleWishlist = async () => {
        if (!localStorage.getItem('token')) {
            setShowLoginModal(true);
            return;
        }

        setWishlistLoading(true);
        try {
            if (isInWishlist) {
                // Remove from wishlist
                const wishlists = await customerService.getWishlist();
                const wishlistItem = wishlists.find(w => w.product_id === parseInt(id));

                if (wishlistItem) {
                    await customerService.removeFromWishlist(wishlistItem.id);
                }
                setIsInWishlist(false);
            } else {
                // Add to wishlist
                await customerService.addToWishlist(parseInt(id));
                setIsInWishlist(true);
            }
        } catch (error) {
            console.error('Wishlist error:', error);
            toast.error('Gagal memperbarui wishlist');
        } finally {
            setWishlistLoading(false);
        }
    };

    // Check if product is in wishlist
    useEffect(() => {
        const checkWishlist = async () => {
            const token = localStorage.getItem('token');
            if (!token || !id) return;

            try {
                const wishlists = await customerService.getWishlist();
                const inWishlist = wishlists.some(w => w.product_id === parseInt(id));
                setIsInWishlist(inWishlist);
            } catch (error) {
                console.error('Failed to check wishlist:', error);
            }
        };

        checkWishlist();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-[#030303]">
            <div className="w-12 h-12 border-2 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-rose-600 text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">{t('common.loading')}</span>
        </div>
    );

    if (!product) return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center text-white">
            <div className="text-center">
                <h2 className="text-4xl font-bold mb-4 text-rose-600">Artifact Lost</h2>
                <p className="text-gray-400 mb-8">This item has been purged from the archives.</p>
                <Link to="/" className="text-white underline hover:text-rose-600">Return to Base</Link>
            </div>
        </div>
    );

    // Parse dimensions/custom fields if they are JSON strings
    let specs = [];
    if (product.scale) specs.push({ label: 'Scale', value: product.scale.name });
    if (product.material) specs.push({ label: 'Material', value: product.material.name });
    if (product.edition_type) specs.push({ label: 'Edition Type', value: product.edition_type.name });
    if (product.edition_size) specs.push({ label: 'Edition Size', value: product.edition_size });
    if (product.artist) specs.push({ label: 'Artist', value: product.artist });
    if (product.license_info) specs.push({ label: 'License', value: product.license_info });

    if (product.custom_fields) {
        try {
            const fields = typeof product.custom_fields === 'string' ? JSON.parse(product.custom_fields) : product.custom_fields;
            if (fields) {
                Object.entries(fields).forEach(([key, value]) => {
                    specs.push({ label: key, value: String(value) });
                });
            }
        } catch (e) { }
    }

    return (
        <div className="bg-[#030303] min-h-screen pt-16 pb-20">
            <SEO
                title={product.name}
                description={product.description?.substring(0, 160)}
                image={images[0]}
                product={product}
                type="product"
            />
            {/* Mini Hero Banner / Breadcrumbs */}
            <div className="relative h-48 flex items-center overflow-hidden mb-8 border-b border-white/5">
                {/* Use the product image as background blur */}
                <Image
                    src={images[0]}
                    className="absolute inset-0 w-full h-full object-cover opacity-10 filter blur-xl scale-110"
                    alt="bg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] to-transparent"></div>
                <div className="container relative z-10 w-full">
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] uppercase font-black tracking-widest mb-2">
                        <Link to="/" className="hover:text-rose-600">Home</Link>
                        <span>›</span>
                        <Link to="/readystock" className="hover:text-rose-600">Products</Link>
                        <span>›</span>
                        <span className="text-white line-clamp-1 max-w-[300px]">{product.name}</span>
                    </div>
                    <h1 className="text-white uppercase italic leading-none">
                        Product <span className="text-rose-600">Details</span>
                    </h1>
                </div>
            </div>

            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">

                    {/* Left: Gallery */}
                    <div className="space-y-6">
                        <div className="relative aspect-[3/4] bg-[#161926] rounded-sm overflow-hidden border border-white/5 group">
                            <Image
                                src={images[activeImage]}
                                alt={product.name}
                                className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                            />
                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={() => setActiveImage(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-rose-600 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setActiveImage(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-rose-600 text-white p-3 rounded-full transition-colors backdrop-blur-sm"
                                    >
                                        ›
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Thumbnails */}
                        {images.length > 1 && (
                            <div className="grid grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setActiveImage(idx)}
                                        className={`aspect-square rounded-sm overflow-hidden border-2 cursor-pointer transition-all ${activeImage === idx ? 'border-rose-600 opacity-100' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                    >
                                        <Image src={img} className="w-full h-full object-cover" alt="thumb" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Info */}
                    <div className="flex flex-col">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                            {product.name}
                        </h2>
                        {product.brand && (
                            <p className="text-rose-600 font-bold uppercase tracking-widest text-xs mb-4">{product.brand.name}</p>
                        )}

                        {/* Stock Availability Indicator */}
                        <div className="mb-6">
                            {product.product_type === 'ready' ? (
                                product.stock - (product.reserved_qty || 0) > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-green-500 text-xs font-bold uppercase tracking-widest">
                                            {t('product.inStock')} ({product.stock - (product.reserved_qty || 0)} available)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                                        <span className="text-red-500 text-xs font-bold uppercase tracking-widest">
                                            {t('product.outOfStock')}
                                        </span>
                                    </div>
                                )
                            ) : (
                                product.stock - (product.reserved_qty || 0) > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                        <span className="text-yellow-500 text-xs font-bold uppercase tracking-widest">
                                            Pre-Order Available ({product.stock - (product.reserved_qty || 0)} slots left)
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                                        <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">
                                            Pre-Order Full
                                        </span>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="text-3xl font-black text-rose-600 mb-8 border-b border-white/10 pb-8 flex items-end gap-2">
                            {formatPrice(product.price)}
                            <span className="text-sm text-gray-500 font-normal mb-1">/ unit</span>
                        </div>

                        {/* Pre Order Options */}
                        {product.product_type === 'po' && (
                            <div className="space-y-4 mb-8 bg-white/5 p-6 rounded-sm border border-white/5">
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-4">{t('product.poConfiguration')}</p>
                                <div className="grid grid-cols-1 gap-4">
                                    <div
                                        onClick={() => setPreOrderType('deposit')}
                                        className={`p-4 rounded-sm border cursor-pointer transition-all flex items-center gap-4 ${preOrderType === 'deposit' ? 'border-rose-600 bg-rose-600/10' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${preOrderType === 'deposit' ? 'border-rose-600' : 'border-gray-500'}`}>
                                            {preOrderType === 'deposit' && <div className="w-2 h-2 bg-rose-600 rounded-full"></div>}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Pay Deposit</p>
                                            <p className="text-rose-600 text-xs font-bold mt-1">
                                                Minimum Deposit: {(() => {
                                                    let deposit = 0;
                                                    if (product.po_config) {
                                                        try {
                                                            const config = typeof product.po_config === 'string' ? JSON.parse(product.po_config) : product.po_config;
                                                            if (config.deposit_type === 'percent') {
                                                                deposit = (product.price * (config.deposit_value || 0)) / 100;
                                                            } else {
                                                                deposit = config.deposit_value || 0;
                                                            }
                                                        } catch (e) { }
                                                    }
                                                    return formatPrice(deposit);
                                                })()}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setPreOrderType('full')}
                                        className={`p-4 rounded-sm border cursor-pointer transition-all flex items-center gap-4 ${preOrderType === 'full' ? 'border-rose-600 bg-rose-600/10' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${preOrderType === 'full' ? 'border-rose-600' : 'border-gray-500'}`}>
                                            {preOrderType === 'full' && <div className="w-2 h-2 bg-rose-600 rounded-full"></div>}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">Pay Full Amount</p>
                                            <p className="text-gray-400 text-xs mt-1">Secure your item completely now</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Add to Cart & Wishlist */}
                        <div className="flex gap-4 mb-10">
                            <div className="flex items-center bg-white/5 border border-white/10 rounded-[8px] overflow-hidden">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="px-5 py-3 hover:bg-white/10 text-white transition-colors font-bold"
                                >
                                    -
                                </button>
                                <span className="px-4 font-mono font-bold text-white w-12 text-center">{quantity}</span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="px-5 py-3 hover:bg-white/10 text-white transition-colors font-bold"
                                >
                                    +
                                </button>
                            </div>
                            {product.product_type !== 'po' && (product.stock - (product.reserved_qty || 0)) <= 0 ? (
                                <button
                                    onClick={handleJoinWaitlist}
                                    disabled={waitlistLoading}
                                    className="flex-grow btn-primary !h-[48px] !bg-gray-800 !text-white !border-gray-700 hover:!bg-gray-700 hover:!border-gray-500 hover:text-rose-500 uppercase tracking-widest font-black flex items-center justify-center transition-all"
                                >
                                    {waitlistLoading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        'Notify Me When Available'
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleAddToCart}
                                    className="flex-grow btn-primary !h-[48px]"
                                >
                                    {t('product.addToCart')}
                                </button>
                            )}
                            <button
                                onClick={handleToggleWishlist}
                                disabled={wishlistLoading}
                                className={`w-[48px] h-[48px] flex items-center justify-center rounded-[8px] transition-all border-2 ${isInWishlist
                                    ? 'bg-red-600 border-red-600 text-white'
                                    : 'bg-transparent border-white/20 text-white hover:border-red-600 hover:text-red-600'
                                    } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={isInWishlist ? t('product.removedFromWishlist') : t('product.addToWishlist')}
                            >
                                {isInWishlist ? <HiHeart size={20} /> : <HiOutlineHeart size={20} />}
                            </button>
                        </div>

                        {/* Categories */}
                        <div className="pt-8 border-t border-white/10">
                            <div className="space-y-2 text-xs">
                                {product.category && (
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 uppercase font-bold min-w-[80px]">{t('product.category')}:</span>
                                        <span className="text-white hover:text-rose-600 cursor-pointer transition-colors">{product.category.name}</span>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <span className="text-gray-500 uppercase font-bold min-w-[80px]">SKU:</span>
                                    <span className="text-white font-mono">{product.sku}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-gray-500 uppercase font-bold min-w-[80px]">{t('product.weight')}:</span>
                                    <span className="text-white">{product.weight} kg</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs System */}
                <div className="border-t border-white/10 pt-16">
                    <div className="flex gap-8 border-b border-white/10 mb-10 overflow-x-auto">
                        {[
                            { id: 'description', label: t('product.description') },
                            { id: 'info', label: t('product.specifications') },
                            { id: 'reviews', label: 'Reviews' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`pb-4 px-2 text-xs font-bold uppercase tracking-[0.2em] transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-rose-600' : 'text-gray-500 hover:text-white'}`}
                            >
                                {tab.label}
                                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-rose-600"></div>}
                            </button>
                        ))}
                    </div>

                    <div className="max-w-4xl min-h-[300px]">
                        {activeTab === 'description' && (
                            <div className="text-gray-300 leading-relaxed text-sm font-light tracking-wide">
                                <h3 className="text-white font-bold text-lg mb-6 uppercase tracking-wider font-display">Product Narrative</h3>
                                <div dangerouslySetInnerHTML={{ __html: sanitizeInput(product.description || "No description available for this artifact.") }}></div>
                            </div>
                        )}
                        {activeTab === 'info' && (
                            <div className="space-y-4">
                                <h3 className="text-white font-bold text-lg mb-6 uppercase tracking-wider font-display">Technical Specifications</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                                    {/* Core Specs */}
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-gray-500 uppercase font-bold text-xs">Weight</span>
                                        <span className="text-white font-mono">{product.weight} kg</span>
                                    </div>
                                    {(product.height || product.width || product.depth) && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Dimensions (H×W×D)</span>
                                            <span className="text-white font-mono">
                                                {product.height || '-'} × {product.width || '-'} × {product.depth || '-'} {product.dimension_unit || 'cm'}
                                            </span>
                                        </div>
                                    )}
                                    {product.scale && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Scale</span>
                                            <span className="text-white">{product.scale.name || product.scale}</span>
                                        </div>
                                    )}
                                    {product.material && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Material</span>
                                            <span className="text-white">{product.material.name || product.material}</span>
                                        </div>
                                    )}
                                    {product.edition_type && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Edition Type</span>
                                            <span className="text-white">{product.edition_type.name || product.edition_type}</span>
                                        </div>
                                    )}
                                    {product.edition_size && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Edition Size</span>
                                            <span className="text-white font-mono">{product.edition_size} pcs worldwide</span>
                                        </div>
                                    )}
                                    {product.edition_number && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Edition Number</span>
                                            <span className="text-white font-mono">{product.edition_number}</span>
                                        </div>
                                    )}
                                    {product.artist && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">Artist / Sculptor</span>
                                            <span className="text-white">{product.artist}</span>
                                        </div>
                                    )}
                                    {product.license_info && (
                                        <div className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-gray-500 uppercase font-bold text-xs">License</span>
                                            <span className="text-white text-right max-w-[200px]">{product.license_info}</span>
                                        </div>
                                    )}
                                    {/* Dynamic Custom Fields */}
                                    {(() => {
                                        let customFields = [];
                                        if (product.custom_fields) {
                                            try {
                                                const parsed = typeof product.custom_fields === 'string'
                                                    ? JSON.parse(product.custom_fields)
                                                    : product.custom_fields;
                                                if (parsed && typeof parsed === 'object') {
                                                    customFields = Object.entries(parsed);
                                                }
                                            } catch (e) { }
                                        }
                                        return customFields.map(([key, value], idx) => (
                                            <div key={idx} className="flex justify-between border-b border-white/5 pb-2">
                                                <span className="text-gray-500 uppercase font-bold text-xs">{key.replace(/_/g, ' ')}</span>
                                                <span className="text-white">{String(value)}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="text-center py-10">
                                <p className="text-gray-500 text-sm italic">No communications intercepted regarding this artifact yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Related Products Section (Fase 2) */}
            {relatedProducts.length > 0 && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-20 mb-20 border-t border-white/10 pt-16">
                    <h3 className="text-2xl font-bold text-white mb-8 uppercase tracking-widest border-l-4 border-rose-600 pl-4">Reconnaissance Data (Related)</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                        {relatedProducts.map((related) => {
                            // Quick parsing for related image
                            let relImg = '/placeholder.jpg';
                            if (related.images) {
                                if (typeof related.images === 'string') {
                                    try {
                                        const parsed = related.images.startsWith('[') ? JSON.parse(related.images) : related.images.split(',');
                                        if (parsed.length > 0) relImg = parsed[0].startsWith('http') ? parsed[0] : `${UPLOAD_BASE_URL}${parsed[0]}`;
                                    } catch (e) { }
                                } else if (Array.isArray(related.images) && related.images.length > 0) {
                                    relImg = related.images[0];
                                }
                            }

                            return (
                                <Link to={`/product/${related.id}`} key={related.id} className="group block mb-8">
                                    <div className="relative aspect-[3/4] overflow-hidden bg-[#161926] border border-white/5 mb-4 rounded-sm">
                                        <div className="absolute inset-0 bg-rose-600/10 opacity-0 group-hover:opacity-100 transition-opacity z-10"></div>
                                        <Image
                                            src={relImg}
                                            alt={related.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {/* Tag overlay */}
                                        <div className="absolute top-2 left-2 z-20">
                                            {related.product_type === 'po' && (
                                                <span className="bg-yellow-500 text-black text-[10px] font-black px-2 py-1 uppercase tracking-widest block">Pre-Order</span>
                                            )}
                                        </div>
                                    </div>
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wide group-hover:text-rose-600 transition-colors line-clamp-2 min-h-[40px] mb-2 font-display">
                                        {related.name}
                                    </h4>
                                    <p className="text-gray-400 font-mono text-xs">{formatPrice(related.price)}</p>
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}
            {/* Upsell / Cross-sell Section */}
            <div className="max-w-7xl mx-auto px-4">
                <UpsellSection productId={id} title="Customers Also Bought" subtitle="Expand Your Collection" />
            </div>

            {/* Login Confirmation Modal */}
            <ConfirmationModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onConfirm={() => navigate('/login')}
                title="Access Restricted"
                message="Authentication required to modify inventory or wishlist. Proceed to login to establish secure connection?"
                confirmText="Login"
                cancelText="Cancel"
            />
        </div>
    );
};

export default ProductDetail;
