import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { HiCheckCircle, HiXCircle, HiClock, HiHome, HiClipboardList, HiRefresh } from 'react-icons/hi';

const PaymentCallback = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderNumber = searchParams.get('order');
    const status = searchParams.get('status');
    const pgid = searchParams.get('pgid');
    const plinkRef = searchParams.get('ref');

    const [countdown, setCountdown] = useState(15);

    const isSuccess = status === 'success' || status === 'paid' || status === 'SETLD';
    const isFailed = status === 'failed' || status === 'REJEC';
    const isPending = !isSuccess && !isFailed;

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            navigate('/dashboard');
        }
    }, [countdown, navigate]);

    // Status Configuration
    const statusConfig = {
        success: {
            icon: HiCheckCircle,
            iconColor: 'text-emerald-400',
            bgGlow: 'bg-emerald-500/20',
            title: 'Transmission Authorized',
            subtitle: 'Transaction successful. Your funds have been successfully acquired.',
            cardBg: 'from-emerald-500/10 to-teal-500/10',
            borderColor: 'border-emerald-500/30'
        },
        failed: {
            icon: HiXCircle,
            iconColor: 'text-rose-400',
            bgGlow: 'bg-rose-500/20',
            title: 'Authorization Failed',
            subtitle: 'Transaction rejected. Please verify your credentials and reattempt.',
            cardBg: 'from-rose-500/10 to-red-500/10',
            borderColor: 'border-rose-500/30'
        },
        pending: {
            icon: HiClock,
            iconColor: 'text-amber-400',
            bgGlow: 'bg-amber-500/20',
            title: 'Awaiting Authorization',
            subtitle: 'Transaction pending. Status will be synchronized momentarily.',
            cardBg: 'from-amber-500/10 to-orange-500/10',
            borderColor: 'border-amber-500/30'
        }
    };

    const currentStatus = isSuccess ? 'success' : (isFailed ? 'failed' : 'pending');
    const config = statusConfig[currentStatus];
    const StatusIcon = config.icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-950 flex items-center justify-center p-4">
            {/* Animated Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-rose-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-red-900/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative max-w-lg w-full">
                {/* Main Card */}
                <div className={`bg-gradient-to-br ${config.cardBg} backdrop-blur-xl border ${config.borderColor} rounded-3xl p-8 shadow-2xl`}>

                    {/* Status Icon with Glow */}
                    <div className="flex justify-center mb-8">
                        <div className="relative">
                            <div className={`absolute inset-0 ${config.bgGlow} blur-3xl rounded-full scale-150`}></div>
                            <StatusIcon className={`relative w-28 h-28 ${config.iconColor} ${isSuccess ? 'animate-bounce' : ''}`} />
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className={`text-3xl font-bold text-center mb-3 ${config.iconColor}`}>
                        {config.title}
                    </h1>

                    {/* Subtitle */}
                    <p className="text-gray-400 text-center mb-8 leading-relaxed">
                        {config.subtitle}
                    </p>

                    {/* Transaction Details */}
                    <div className="bg-black/30 rounded-2xl p-6 mb-8 space-y-4">
                        {orderNumber && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Order ID</span>
                                <span className="font-mono text-white font-medium">{orderNumber}</span>
                            </div>
                        )}
                        {plinkRef && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 text-sm">Reference</span>
                                <span className="font-mono text-white text-sm">{plinkRef}</span>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Status</span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' :
                                isFailed ? 'bg-rose-500/20 text-rose-400' :
                                    'bg-amber-500/20 text-amber-400'
                                }`}>
                                {isSuccess ? 'Authorized' : isFailed ? 'Failed' : 'Pending'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm">Timestamp</span>
                            <span className="text-white text-sm">
                                {new Date().toLocaleString('en-US', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Auto Redirect Notice */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 text-center">
                        <div className="flex items-center justify-center gap-2">
                            <HiRefresh className="w-4 h-4 text-gray-400 animate-spin" />
                            <p className="text-gray-400 text-sm">
                                Rerouting to command center in <span className="text-rose-600 font-bold">{countdown}</span> seconds
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        <Link
                            to="/dashboard"
                            className="flex items-center justify-center gap-2 px-6 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-300 group"
                        >
                            <HiClipboardList className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Manifest</span>
                        </Link>
                        <Link
                            to="/"
                            className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-rose-600 to-red-900 hover:from-rose-700 hover:to-red-950 text-white rounded-xl transition-all duration-300 group"
                        >
                            <HiHome className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            <span className="font-medium">Home</span>
                        </Link>
                    </div>

                    {/* Retry Button for Failed */}
                    {isFailed && (
                        <button
                            onClick={() => navigate(-2)}
                            className="w-full mt-4 py-3 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <HiRefresh className="w-4 h-4" />
                            Reattempt Authorization
                        </button>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-gray-600 text-xs mt-6">
                    Powered by <span className="text-gray-500">Warung Forza</span> × <span className="text-gray-500">PrismaLink</span>
                </p>
            </div>
        </div>
    );
};

export default PaymentCallback;
