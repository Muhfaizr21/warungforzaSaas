import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { publicService } from '../services/publicService';

const CharacterSeriesSection = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchPO = async () => {
            try {
                const data = await publicService.getProducts({ product_type: 'po', status: 'active' });
                setProducts(data.data?.slice(0, 4) || []);
            } catch (error) {
                console.error("Failed to load character series PO", error);
            }
        };
        fetchPO();
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="py-16 bg-[#030303] relative border-t border-white/5">
            <div className="container flex flex-col lg:flex-row gap-12">

                {/* Intro Card */}
                <div className="lg:w-1/3">
                    <div className="relative h-full flex flex-col justify-center items-start rounded-sm overflow-hidden p-12 border border-white/5 bg-[#0a0a0b]">
                        {/* Atmospheric Glow */}
                        <div className="absolute -top-24 -left-24 w-64 h-64 bg-gold/10 blur-[100px] rounded-full opacity-50"></div>

                        <div className="relative z-10">
                            <span className="text-gold font-black uppercase tracking-[0.4em] text-[10px] mb-6 block opacity-60">Elite Archive</span>
                            <h2 className="text-white mb-8 cinematic-text text-3xl">
                                Legendary <br />
                                <span className="text-gold">Sagas</span>
                            </h2>
                            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium opacity-80">
                                Explore our diverse range of action figures from popular character series.
                                Limited pre-orders available for elite collectors seeking perfection.
                            </p>
                            <button
                                onClick={() => navigate('/preorder')}
                                className="group flex items-center gap-4 text-white hover:text-gold transition-all"
                            >
                                <span className="text-[10px] font-black uppercase tracking-[0.3em]">Explore Series</span>
                                <div className="w-8 h-px bg-white/20 group-hover:w-16 group-hover:bg-gold transition-all duration-500"></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="lg:w-2/3">
                    <div className="grid grid-cols-2 gap-4 md:gap-6">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CharacterSeriesSection;
