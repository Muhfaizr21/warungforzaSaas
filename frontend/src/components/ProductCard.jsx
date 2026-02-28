import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { UPLOAD_BASE_URL } from '../config/api';
import Image from './Image';

const parsePOConfig = (product) => {
    if (!product?.po_config) return null;
    try {
        const config = typeof product.po_config === 'string' ? JSON.parse(product.po_config) : product.po_config;
        return config;
    } catch { return null; }
};

const ProductCard = ({ product, variant = 'default' }) => {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { t } = useLanguage();

    const getProductImage = (product) => {
        try {
            if (!product) return '/placeholder.jpg';
            if (product.image) return product.image;
            if (product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                let firstImg = Array.isArray(imgs) && imgs[0] ? imgs[0] : null;
                if (firstImg) {
                    if (firstImg.startsWith('/') && !firstImg.startsWith('/images/')) {
                        return `${UPLOAD_BASE_URL}${firstImg}`;
                    }
                    return firstImg;
                }
            }
            return '/placeholder.jpg';
        } catch (e) {
            return '/placeholder.jpg';
        }
    };

    if (variant === 'compact') {
        return (
            <div className="group cursor-pointer min-w-[200px] snap-start" onClick={() => navigate(`/product/${product.id}`)}>
                <div className="relative aspect-[3/4] overflow-hidden rounded-sm mb-4" style={{ backgroundColor: 'var(--card-bg)' }}>
                    <Image
                        src={getProductImage(product)}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                    {product.status !== 'active' && (
                        <div className="absolute top-2 right-2 bg-black/80 text-white text-[8px] font-bold px-2 py-1 uppercase tracking-widest border border-white/10">
                            {product.status}
                        </div>
                    )}
                </div>
                <h3 className="font-bold text-sm mb-1 line-clamp-2 leading-tight transition-colors"
                    style={{ color: 'var(--card-title-color)', fontFamily: 'var(--font-primary)' }}>
                    {product.name}
                </h3>
                <p className="font-black text-lg italic tracking-tighter" style={{ color: 'var(--card-price-color)' }}>
                    {formatPrice(product.price)}
                </p>
                <button className="mt-3 w-full border text-[9px] font-black uppercase tracking-widest py-2 transition-all"
                    style={{ backgroundColor: 'var(--btn-secondary-bg)', color: 'var(--btn-secondary-text)', borderColor: 'var(--card-border)', borderRadius: 'var(--btn-radius)' }}>
                    {product.product_type === 'po' ? t('product.preOrderNow') : t('product.addToCart')}
                </button>
            </div>
        );
    }

    // Default 'card' style for grid
    const isOutOfStock = product.available_stock <= 0;

    return (
        <div
            className="group cursor-pointer relative flex flex-col h-full overflow-hidden transition-all duration-700 hover:-translate-y-2"
            style={{
                backgroundColor: 'var(--card-bg)',
                border: `1px solid ${isOutOfStock ? 'var(--card-border)' : 'var(--card-border)'}`,
                borderRadius: 'var(--card-radius)',
            }}
            onMouseEnter={e => { if (!isOutOfStock) e.currentTarget.style.borderColor = 'var(--card-hover-border)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
            onClick={() => navigate(`/product/${product.id}`)}
        >
            <div className="relative aspect-square overflow-hidden bg-black flex items-center justify-center">
                <Image
                    src={getProductImage(product)}
                    alt={product.name}
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-out opacity-80 group-hover:opacity-100 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
                />

                {/* Condition Badges */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                    {product.is_limited && (
                        <div className="text-white text-[8px] font-black px-3 py-1 uppercase tracking-[0.2em] rounded-sm shadow-2xl"
                            style={{ backgroundColor: 'var(--badge-error)' }}>
                            {t('product.limited')}
                        </div>
                    )}
                    {product.is_exclusive && (
                        <div className="text-white text-[8px] font-black px-3 py-1 uppercase tracking-[0.2em] rounded-sm shadow-2xl"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            {t('product.exclusive')}
                        </div>
                    )}
                    {product.product_type === 'po' && !isOutOfStock && (
                        <div className="text-white text-[8px] font-black px-3 py-1 uppercase tracking-[0.2em] rounded-sm shadow-2xl"
                            style={{ backgroundColor: 'var(--badge-info)' }}>
                            Pre-Order
                        </div>
                    )}
                </div>

                {isOutOfStock && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 backdrop-blur-sm">
                        <span className="text-gray-400 text-[12px] font-black px-6 py-2 uppercase tracking-[0.2em] border-2 border-gray-900 bg-gray-900/60 rotate-12">
                            {product.product_type === 'po' ? t('product.poClosed') : t('product.outOfStock')}
                        </span>
                    </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
            </div>

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex items-center gap-2 mb-3">
                    <span className="w-4 h-px opacity-50" style={{ backgroundColor: 'var(--accent)' }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.3em] block truncate"
                        style={{ color: 'var(--card-brand-color)' }}>
                        {product.brand?.name || 'Forza Premium'}
                    </span>
                </div>

                <h3 className="text-[13px] font-bold mb-6 line-clamp-2 leading-[1.6] transition-colors uppercase tracking-tight"
                    style={{ color: 'var(--card-title-color)', fontFamily: 'var(--font-heading)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--card-title-color)'}
                >
                    {product.name}
                </h3>

                <div className="mt-auto">
                    <div className="flex flex-col mb-4">
                        <span className="text-[8px] font-bold uppercase tracking-[0.3em] mb-1"
                            style={{ color: 'var(--text-muted)' }}>{t('product.price')}</span>
                        <p className="font-black text-xl italic tracking-tighter leading-none opacity-90"
                            style={{ color: 'var(--card-price-color)' }}>
                            {formatPrice(product.price)}
                        </p>
                    </div>

                    {/* PO Info Badges */}
                    {product.product_type === 'po' && (() => {
                        const poConfig = parsePOConfig(product);
                        return poConfig ? (
                            <div className="flex flex-wrap gap-1.5 mb-4">
                                {poConfig.eta && (
                                    <span className="text-[8px] px-2 py-1 rounded font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: 'var(--badge-info)' + '15', color: 'var(--badge-info)', border: `1px solid var(--badge-info)` + '30' }}>
                                        {t('product.eta')}: {new Date(poConfig.eta).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                                    </span>
                                )}
                                {poConfig.deposit_value > 0 && (
                                    <span className="text-[8px] px-2 py-1 rounded font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: 'var(--badge-warning)' + '15', color: 'var(--badge-warning)', border: `1px solid var(--badge-warning)` + '30' }}>
                                        {t('product.deposit')} {poConfig.deposit_type === 'percent' ? `${poConfig.deposit_value}%` : `Rp ${Number(poConfig.deposit_value).toLocaleString('id-ID')}`}
                                    </span>
                                )}
                            </div>
                        ) : null;
                    })()}

                    <button
                        className={`w-full h-[44px] text-white text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-500 border shadow-lg shadow-black/20`}
                        style={isOutOfStock ? {
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderColor: 'var(--card-border)',
                            color: 'var(--text-muted)',
                            borderRadius: 'var(--btn-radius)',
                        } : {
                            backgroundColor: 'var(--btn-secondary-bg)',
                            borderColor: 'var(--card-border)',
                            color: 'var(--btn-secondary-text)',
                            borderRadius: 'var(--btn-radius)',
                        }}
                        onMouseEnter={e => {
                            if (!isOutOfStock) {
                                e.currentTarget.style.backgroundColor = 'var(--btn-primary-bg)';
                                e.currentTarget.style.borderColor = 'var(--btn-primary-bg)';
                                e.currentTarget.style.color = 'var(--btn-primary-text)';
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isOutOfStock) {
                                e.currentTarget.style.backgroundColor = 'var(--btn-secondary-bg)';
                                e.currentTarget.style.borderColor = 'var(--card-border)';
                                e.currentTarget.style.color = 'var(--btn-secondary-text)';
                            }
                        }}
                    >
                        {isOutOfStock ? t('product.joinWaitlist') : (product.product_type === 'po' ? t('product.preOrderNow') : t('product.buyNow'))}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
