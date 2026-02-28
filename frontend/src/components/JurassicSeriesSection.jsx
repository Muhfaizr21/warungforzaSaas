import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../services/publicService';
import { UPLOAD_BASE_URL } from '../config/api';
import { useTheme } from '../context/ThemeContext';
import Image from './Image';

const JurassicSeriesSection = () => {
    const navigate = useNavigate();
    const { theme } = useTheme();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchJurassic = async () => {
            try {
                // Using 'series' filter instead of 'category'
                const data = await publicService.getProducts({ series: 'jurassic-series' });
                setProducts(data.data?.slice(0, 2) || []);
            } catch (error) {
                console.error("Failed to load Jurassic series", error);
            }
        };
        fetchJurassic();
    }, []);

    const getProductImage = (product) => {
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
        return '/images/dino.jpg'; // Theme-appropriate fallback for this section
    };

    return (
        <section className="py-16 bg-[#030303]">
            <div className="container">
                <div className="relative bg-[#0a0a0b] border border-white/5 rounded-[12px] overflow-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 min-h-[500px]">

                        {/* Text Content */}
                        <div className="p-6 md:p-16 flex flex-col justify-center items-start z-10 relative">
                            <span
                                className="font-black uppercase tracking-widest text-[10px] mb-4"
                                style={{ color: theme?.theme_section_label_color || '#d4af37' }}
                            >
                                {theme?.theme_jurassic_label || 'The Lost World Collection'}
                            </span>
                            <h2
                                className="leading-tight mb-6 uppercase text-2xl md:text-3xl font-black"
                                dangerouslySetInnerHTML={{ __html: theme?.theme_jurassic_title || 'Explore Our <br /> Jurassic Series <br /> Prime Figures!' }}
                                style={{ color: theme?.theme_section_heading_color || '#ffffff', fontFamily: theme?.theme_font_heading }}
                            />
                            <p
                                className="max-w-md mb-8 leading-relaxed text-[15px] font-medium"
                                style={{ color: theme?.theme_section_subtext_color || '#9ca3af', fontFamily: theme?.theme_font_primary }}
                            >
                                {theme?.theme_jurassic_desc || 'Unleash the prehistoric adventure with our premium Jurassic series collections. Masterfully crafted statues for the true enthusiast.'}
                            </p>
                            <button
                                onClick={() => navigate('/readystock?category=jurassic-series')}
                                className="btn-neon !h-[48px]"
                                style={{
                                    backgroundColor: theme?.theme_btn_primary_bg,
                                    color: theme?.theme_btn_primary_text,
                                    borderRadius: theme?.theme_btn_radius
                                }}
                            >
                                {theme?.theme_jurassic_btn || 'Get Yours Now'}
                            </button>
                        </div>

                        {/* Image Showcase */}
                        <div className="relative h-full min-h-[300px] md:min-h-[400px]">
                            {/* Background Image / Texture */}
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-overlay"
                                style={{ backgroundImage: `url('${(theme?.theme_jurassic_bg?.startsWith('/') && !theme.theme_jurassic_bg.startsWith('/images/')) ? UPLOAD_BASE_URL + theme.theme_jurassic_bg : theme?.theme_jurassic_bg}')` }}
                            ></div>

                            {/* Product Images Collage */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                {(() => {
                                    const raw1 = theme?.theme_jurassic_img1 || (products[0] ? getProductImage(products[0]) : null);
                                    const raw2 = theme?.theme_jurassic_img2 || (products[1] ? getProductImage(products[1]) : null);

                                    if (!raw1 && !raw2) {
                                        return <div className="text-gray-600 font-bold uppercase tracking-widest">No Dinosaurs Found</div>;
                                    }

                                    const img1 = raw1 ? (raw1.startsWith('/') && !raw1.startsWith('/images/') ? UPLOAD_BASE_URL + raw1 : raw1) : null;
                                    const img2 = raw2 ? (raw2.startsWith('/') && !raw2.startsWith('/images/') ? UPLOAD_BASE_URL + raw2 : raw2) : null;

                                    return (
                                        <>
                                            {img1 && (
                                                <div className="absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/50 transition-transform hover:scale-105 duration-700 w-56 md:w-[380px] aspect-[4/3] z-20 translate-x-[-15%] translate-y-[5%] rotate-[-6deg]">
                                                    <img src={img1} alt="Showcase 1" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            {img2 && (
                                                <div className="absolute overflow-hidden rounded-2xl shadow-2xl shadow-black/50 transition-transform hover:scale-105 duration-700 w-56 md:w-[380px] aspect-[4/3] z-10 translate-x-[15%] translate-y-[-10%] rotate-[6deg] opacity-80 backdrop-grayscale">
                                                    <img src={img2} alt="Showcase 2" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default JurassicSeriesSection;
