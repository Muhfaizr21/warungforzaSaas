import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductCard from './ProductCard';
import { publicService } from '../services/publicService';

const ReadyStockSection = () => {
    const [products, setProducts] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchReadyStock = async () => {
            try {
                const data = await publicService.getProducts({ product_type: 'ready', status: 'active' });
                setProducts(data.data?.slice(0, 4) || []);
            } catch (error) {
                console.error("Failed to load ready stock", error);
            }
        };
        fetchReadyStock();
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="py-16 bg-black border-t border-white/5">
            <div className="container">
                <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                    <div className="text-left">
                        <span className="text-gold font-black uppercase tracking-[0.3em] text-[9px] mb-2 block opacity-60">Acquisition Depot</span>
                        <h2 className="text-white mb-4 cinematic-text text-2xl">
                            Ready <span className="text-gold">Stock</span>
                        </h2>
                        <div className="w-12 h-px bg-gold/30 mb-4"></div>
                        <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] max-w-md">
                            Immediate availability from our Jakarta warehouse
                        </p>
                    </div>
                    <button
                        onClick={() => navigate('/readystock')}
                        className="btn-secondary !h-[40px] !px-6"
                    >
                        View All
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map(product => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ReadyStockSection;
