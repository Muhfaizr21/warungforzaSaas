import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { HiCheckCircle, HiShoppingBag, HiCreditCard, HiHome, HiSparkles } from 'react-icons/hi';
import confetti from 'canvas-confetti';

const CheckoutSuccess = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderId = searchParams.get('order');
    const orderNumber = searchParams.get('orderNumber');
    const invoiceId = searchParams.get('invoice');
    const total = searchParams.get('total');

    const { formatPrice } = useCurrency();

    const [showContent, setShowContent] = useState(false);
    const [showButtons, setShowButtons] = useState(false);

    useEffect(() => {
        // Trigger confetti animation
        const duration = 3000;
        const end = Date.now() + duration;

        const colors = ['#e11d48', '#be123c', '#ffffff', '#000000'];

        (function frame() {
            confetti({
                particleCount: 3,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: colors
            });
            confetti({
                particleCount: 3,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: colors
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());

        // Staggered animations
        setTimeout(() => setShowContent(true), 300);
        setTimeout(() => setShowButtons(true), 800);
    }, []);



    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center p-4 overflow-hidden">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-900/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-rose-600/10 to-red-900/10 rounded-full blur-3xl animate-spin" style={{ animationDuration: '20s' }}></div>
            </div>

            <div className="relative max-w-lg w-full text-center">
                {/* Success Icon with Glow Animation */}
                <div className={`transform transition-all duration-700 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                    <div className="relative inline-block mb-8">
                        {/* Outer Glow Ring */}
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-red-900 rounded-full blur-xl opacity-50 animate-ping"></div>
                        <div className="absolute inset-0 bg-gradient-to-r from-rose-600 to-red-900 rounded-full blur-lg opacity-30 scale-150"></div>

                        {/* Icon Container */}
                        <div className="relative bg-gradient-to-r from-rose-600 to-red-900 p-6 rounded-full shadow-2xl shadow-rose-600/50">
                            <HiCheckCircle className="w-20 h-20 text-white animate-bounce" />
                        </div>

                        {/* Sparkles */}
                        <HiSparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400 animate-pulse" />
                        <HiSparkles className="absolute -bottom-1 -left-3 w-6 h-6 text-rose-400 animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                </div>

                {/* Main Content */}
                <div className={`transform transition-all duration-700 delay-200 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                        TRANSMISSION <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-900">SUCCESSFUL</span>
                    </h1>

                    <p className="text-gray-400 text-lg mb-8">
                        Your requisition has been logged. Processing will commence upon payment authentication.
                    </p>

                    {/* Order Info Card */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
                        {orderNumber && (
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                                <span className="text-gray-500 text-sm">Order Number</span>
                                <span className="font-mono text-white font-bold text-lg">{orderNumber}</span>
                            </div>
                        )}
                        {total && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Amount Due</span>
                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-red-900">
                                    {formatPrice(total)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Status Timeline */}
                    <div className="flex items-center justify-center gap-4 mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-green-400 text-sm font-medium">Logged</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse"></div>
                            <span className="text-yellow-400 text-sm font-medium">Awaiting Funds</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-700"></div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                            <span className="text-gray-500 text-sm font-medium">Dispatched</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={`space-y-4 transform transition-all duration-700 delay-500 ${showButtons ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    {invoiceId && (
                        <Link
                            to={`/payment/${invoiceId}`}
                            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-rose-600 to-red-900 hover:from-rose-700 hover:to-red-950 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-rose-600/30 hover:shadow-rose-600/50 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <HiCreditCard className="w-6 h-6" />
                            Proceed to Payment
                        </Link>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            to={orderId ? `/order/${orderId}` : '/dashboard'}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all"
                        >
                            <HiShoppingBag className="w-5 h-5" />
                            View Manifest
                        </Link>
                        <Link
                            to="/"
                            className="flex items-center justify-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white rounded-xl font-medium transition-all"
                        >
                            <HiHome className="w-5 h-5" />
                            Return to Base
                        </Link>
                    </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-gray-600 text-sm">
                    A confirmation transmission has been dispatched to your verified channel.
                </p>
            </div>
        </div>
    );
};

export default CheckoutSuccess;
