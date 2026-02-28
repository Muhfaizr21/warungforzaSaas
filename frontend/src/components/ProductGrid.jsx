import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Image from './Image';
import { API_BASE_URL, UPLOAD_BASE_URL } from '../config/api';

const ProductGrid = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const getProductImage = (product) => {
        try {
            let img = '/placeholder.jpg';
            if (product.image) img = product.image;
            else if (product.images) {
                const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                img = Array.isArray(imgs) && imgs[0] ? imgs[0] : '/placeholder.jpg';
            }

            if (img && !img.startsWith('http') && !img.startsWith('/images/')) {
                return `${UPLOAD_BASE_URL}${img}`;
            }
            return img;
        } catch (e) {
            return '/placeholder.jpg';
        }
    };

    useEffect(() => {
        fetch(`${API_BASE_URL}/products?is_featured=true`)
            .then(res => res.json())
            .then(data => {
                setProducts(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="flex flex-col justify-center items-center h-96 bg-black">
            <div className="w-12 h-12 border-2 border-neon-red border-t-transparent rounded-full animate-spin mb-4"></div>
            <span className="text-neon-red text-[10px] font-black uppercase tracking-[0.5em] animate-pulse">Syncing Vault...</span>
        </div>
    );

    return (
        <section className="py-32 px-4 sm:px-6 lg:px-8 bg-[#030303] relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }}></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-24 gap-8">
                    <div>
                        <h2 className="text-5xl font-display font-black text-white italic tracking-tighter mb-4"><span className="text-neon-red">NEW</span> EXTRACTIONS</h2>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em]">Legendary relics added to archives</p>
                    </div>
                    <button className="text-neon-red font-black text-[10px] uppercase tracking-[0.3em] border-b-2 border-neon-red/30 hover:border-neon-red transition-all pb-2 italic">Full Database Archives</button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-12">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="horror-card group cursor-pointer relative"
                            onClick={() => navigate(`/product/${product.id}`)}
                        >
                            {/* Product Image Overlay */}
                            <div className="absolute top-0 right-0 p-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[9px] font-black bg-neon-red text-white px-3 py-1 uppercase tracking-tighter">Verified</span>
                            </div>

                            {/* Product Image Area */}
                            <div className="relative aspect-[4/5] overflow-hidden bg-black/40 flex items-center justify-center p-8">
                                <img
                                    src={getProductImage(product)}
                                    alt={product.name}
                                    className="w-full h-full object-contain brightness-75 group-hover:brightness-110 group-hover:scale-110 transition-all duration-700 grayscale-[0.5] group-hover:grayscale-0"
                                    onError={(e) => e.target.src = '/placeholder.jpg'}
                                />
                                {/* Red glow behind active image */}
                                <div className="absolute inset-0 bg-neon-red/0 group-hover:bg-neon-red/5 transition-colors duration-700"></div>
                            </div>

                            {/* Product Info Area */}
                            <div className="p-8 relative border-t border-white/5 bg-black/20">
                                <div className="absolute -top-px left-0 w-8 h-px bg-neon-red group-hover:w-full transition-all duration-500"></div>

                                <p className="text-gray-600 text-[9px] font-black uppercase tracking-widest mb-3 italic">
                                    {product.Brand?.name || product.brand?.name || (typeof product.brand === 'string' ? product.brand : 'CLASSIFIED')}
                                </p>
                                <h3 className="text-white font-black text-base md:text-lg mb-6 leading-tight tracking-tight uppercase group-hover:text-neon-red transition-colors italic">{product.name}</h3>

                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <span className="text-gray-700 text-[8px] font-black uppercase">Market Value</span>
                                        <span className="text-2xl font-display font-black text-white italic tracking-tighter">${product.price}</span>
                                    </div>
                                    <button className="w-12 h-12 bg-white/5 border border-white/10 text-white flex items-center justify-center group-hover:bg-neon-red group-hover:border-neon-red transition-all duration-300">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ProductGrid;
