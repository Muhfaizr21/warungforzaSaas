import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { HiArrowLeft, HiShieldCheck, HiScale, HiTruck, HiQuestionMarkCircle, HiShoppingBag } from 'react-icons/hi';
import SEO from '../components/SEO';

const StaticPage = () => {
    const location = useLocation();
    const slug = location.pathname.substring(1); // gets 'how-to-buy', 'shipping', etc.
    const navigate = useNavigate();
    const { theme } = useTheme();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [slug]);

    const contentMap = {
        'how-to-buy': {
            title: 'How to Buy',
            icon: <HiShoppingBag className="w-12 h-12 text-rose-600" />,
            subtitle: 'Navigating the Acquisition Protocol',
            sections: [
                {
                    title: '1. Select Your Specimen',
                    text: 'Browse our Ready Stock or Pre-Order catalog. Use filters to find specific brands, series, or scales.'
                },
                {
                    title: '2. Add to Stash',
                    text: 'View product details, technical specifications, and high-resolution media. Add your chosen items to your cart.'
                },
                {
                    title: '3. Secure Checkout',
                    text: 'Proceed to checkout. If you are a new collector, you will need to register an account for order synchronization.'
                },
                {
                    title: '4. Logistic Selection',
                    text: 'Choose your preferred delivery protocol. We offer domestic and international options with real-time tracking.'
                },
                {
                    title: '5. Final Allocation',
                    text: 'Complete payment using our secure gateways. Once verified, your specimen will undergo strict quality control before deployment.'
                }
            ]
        },
        'shipping': {
            title: 'Shipping Policy',
            icon: <HiTruck className="w-12 h-12 text-rose-600" />,
            subtitle: 'Logistics and Deployment Protocols',
            sections: [
                {
                    title: 'Domestic Transit',
                    text: 'We utilize premium couriers (JNE, SiCepat, J&T) for all domestic deployments. Standard estimated transit: 1-5 business days.'
                },
                {
                    title: 'International Deployment',
                    text: 'Global delivery via DHL Express or Sea Freight. Note that international shipments may be subject to import duties and taxes.'
                },
                {
                    title: 'Package Integrity',
                    text: 'All specimens are double-boxed with premium cushioning for maximum protection. Fragile statues are palletized for heavy-duty transit.'
                },
                {
                    title: 'Order Tracking',
                    text: 'Upon deployment, a tracking identifier will be operational in your Mission Dashboard.'
                }
            ]
        },
        'faq': {
            title: 'Frequently Asked Questions',
            icon: <HiQuestionMarkCircle className="w-12 h-12 text-rose-600" />,
            subtitle: 'Central Intelligence Database',
            sections: [
                {
                    title: 'What is a Pre-Order (PO)?',
                    text: 'A pre-order allows you to reserve high-demand specimens before their official release. Usually requires a deposit or full payment.'
                },
                {
                    title: 'Are products 100% original?',
                    text: 'Affirmative. We only deal in officially licensed artifacts. No bootlegs allowed in our facility.'
                },
                {
                    title: 'Can I cancel my order?',
                    text: 'Orders can only be cancelled within the grace period. Deposits for Pre-Orders are typically non-refundable as they secure your allocation with the manufacturer.'
                },
                {
                    title: 'Do you offer local pickup?',
                    text: 'Yes, specialized showroom pickup can be arranged for high-value statues via appointment.'
                }
            ]
        },
        'privacy': {
            title: 'Privacy Policy',
            icon: <HiShieldCheck className="w-12 h-12 text-rose-600" />,
            subtitle: 'Information Encryption Protocols',
            sections: [
                {
                    title: 'Data Collection',
                    text: 'We only collect essential data required for order fulfillment and account security.'
                },
                {
                    title: 'Security measures',
                    text: 'All sensitive transmissions are encrypted via industry-standard secure protocols.'
                },
                {
                    title: 'Third-party disclosure',
                    text: 'We never trade or sell your personal credentials to external entities, except for logistical partners required for fulfillment.'
                }
            ]
        },
        'terms': {
            title: 'Terms & Conditions',
            icon: <HiScale className="w-12 h-12 text-rose-600" />,
            subtitle: 'Operational Guidelines',
            sections: [
                {
                    title: 'Agreement of Service',
                    text: 'By accessing this facility, you agree to comply with all operational guidelines and legal compliance protocols.'
                },
                {
                    title: 'Product Availability',
                    text: 'Stock levels are updated in real-time, but rare discrepancies may occur. We reserve the right to prioritize allocations based on priority queues.'
                },
                {
                    title: 'Limitation of Liability',
                    text: 'Warung Forza Shop is not liable for secondary market fluctuations or delayed manufacturing schedules from international studios.'
                }
            ]
        }
    };

    const activeContent = contentMap[slug];

    if (!activeContent) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <div className="bg-[#030303] min-h-screen pb-20">
            <SEO title={`${activeContent.title} | Warung Forza Shop`} />

            {/* Header */}
            <div className="relative h-64 md:h-80 flex items-center overflow-hidden border-b border-white/5 pt-20">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent z-10"></div>
                <div
                    className="absolute inset-0 opacity-20 bg-cover bg-center"
                    style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1542332213-319ae2d358f0?q=80&w=2070&auto=format&fit=crop)' }}
                ></div>

                <div className="container relative z-20">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-6 transition-colors font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <HiArrowLeft size={16} />
                        <span>Return to Base</span>
                    </button>

                    <div className="flex items-center gap-6">
                        <div className="bg-white/5 p-4 rounded-sm border border-white/10">
                            {activeContent.icon}
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-5xl font-black text-rose-600 uppercase italic tracking-tighter">
                                {activeContent.title}
                            </h1>
                            <p className="text-gray-400 text-xs md:text-sm font-black uppercase tracking-[0.4em] mt-2">
                                {activeContent.subtitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mt-12 md:mt-16">
                <div className="max-w-4xl">
                    <div className="space-y-12">
                        {activeContent.sections.map((section, idx) => (
                            <div key={idx} className="group">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-4">
                                    <span className="w-1px h-6 bg-rose-600 group-hover:h-8 transition-all"></span>
                                    {section.title}
                                </h2>
                                <p className="text-gray-400 leading-relaxed text-sm md:text-base border-l border-white/5 pl-8 py-2">
                                    {section.text}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="mt-20 pt-10 border-t border-white/5 text-center md:text-left">
                        <p className="text-gray-600 text-xs mb-8 uppercase tracking-widest leading-relaxed">
                            Requires further clarification? Our tactical support team is operational during business cycles.
                        </p>
                        <button
                            onClick={() => navigate('/contact')}
                            className="bg-rose-600 hover:bg-white hover:text-black text-white font-black py-4 px-10 rounded-sm transition-all uppercase tracking-[0.2em] text-xs shadow-lg shadow-rose-600/20"
                        >
                            Open Communication Channel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StaticPage;
