import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { publicService } from '../services/publicService';

const MostPopularSection = () => {
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPopular = async () => {
            try {
                const data = await publicService.getProducts({ is_featured: true, status: 'active' });
                setProducts(data.data?.slice(0, 4) || []);
            } catch (error) {
                console.error("Failed to load featured products", error);
            }
        };
        fetchPopular();
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="py-16 bg-gradient-to-b from-[#1a0b14] to-[#030303] border-t border-white/5 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-neon-pink/5 blur-[100px] pointer-events-none"></div>

            <div className="container relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-6">
                    <div>
                        <h2 className="text-white italic tracking-tighter mb-2 uppercase text-2xl">
                            Most <span className="text-neon-pink">Popular</span>
                        </h2>
                        <p className="text-gray-500 text-xs font-black uppercase tracking-widest max-w-xl">
                            The most coveted pieces in the community right now
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/readystock')}
                        className="btn-secondary !h-[40px] !px-6"
                    >
                        Explore More
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default MostPopularSection;
