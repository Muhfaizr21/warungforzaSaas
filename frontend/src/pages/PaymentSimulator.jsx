import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { HiCheckCircle, HiXCircle, HiClock, HiCreditCard, HiShieldCheck, HiArrowLeft, HiDuplicate, HiInformationCircle } from 'react-icons/hi';

const PaymentSimulator = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();

    const orderNumber = searchParams.get('order');
    const invoiceNumber = searchParams.get('invoice');
    const amount = parseFloat(searchParams.get('amount') || '0');

    const [paymentStatus, setPaymentStatus] = useState('pending'); // pending, showing_va, processing, success, failed
    const [selectedMethod, setSelectedMethod] = useState('');
    const [countdown, setCountdown] = useState(300);
    const [vaNumber, setVaNumber] = useState('');

    const paymentMethods = [
        { id: 'va_bca', name: 'BCA Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Bank_Central_Asia.svg' },
        { id: 'va_bni', name: 'BNI Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/en/2/27/BankNegaraIndonesia_logo.svg' },
        { id: 'va_mandiri', name: 'Mandiri Virtual Account', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/ad/Bank_Mandiri_logo_2016.svg' },
        { id: 'qris', name: 'QRIS / GPN', icon: 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Logo_QRIS.svg' },
        { id: 'gopay', name: 'GoPay', icon: 'https://upload.wikimedia.org/wikipedia/commons/8/86/Gopay_logo.svg' },
        { id: 'ovo', name: 'OVO Cash', icon: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg' },
        { id: 'dana', name: 'DANA Wallet', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg' },
    ];

    useEffect(() => {
        if (paymentStatus === 'pending' || paymentStatus === 'showing_va') {
            if (countdown > 0) {
                const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [countdown, paymentStatus]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };



    const handleConfirmSelection = () => {
        if (!selectedMethod) {
            alert('Silakan pilih metode pembayaran');
            return;
        }
        // Generate a random-ish VA based on method
        const prefix = selectedMethod.includes('bca') ? '80777' :
            selectedMethod.includes('bni') ? '988' : '100';
        setVaNumber(prefix + Math.random().toString().slice(2, 12));
        setPaymentStatus('showing_va');
    };

    const handleSimulationPayment = async () => {
        setPaymentStatus('processing');
        await new Promise(resolve => setTimeout(resolve, 3000));

        const isSuccess = Math.random() > 0.05;

        if (isSuccess) {
            try {
                // Trigger Webhook
                await axios.post(`${API_BASE_URL}/webhooks/prismalink`, {
                    transaction_id: `SIM-${Date.now()}`,
                    order_id: invoiceNumber,
                    status: 'success',
                    amount: amount,
                    signature: 'SIMULATED', // Backend should skip verification in dev or handle this
                    payment_type: selectedMethod
                });

                setPaymentStatus('success');
                setTimeout(() => {
                    navigate(`/payment/callback?order=${orderNumber || invoiceNumber}&status=success`);
                }, 2500);
            } catch (error) {
                console.error("Webhook trigger failed", error);
                setPaymentStatus('failed'); // Treat webhook failure as payment failure for now
            }
        } else {
            setPaymentStatus('failed');
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-600/5 blur-[120px] rounded-full -mr-48 -mt-48"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -ml-48 -mb-48"></div>

            <div className="max-w-lg w-full relative z-10">
                <div className="flex items-center justify-between mb-8 px-2">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors">
                        <HiArrowLeft /> Back
                    </button>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-black uppercase tracking-widest">
                        <HiShieldCheck className="text-xs" /> Sandbox Mode
                    </div>
                </div>

                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                    <div className="bg-gradient-to-r from-rose-600/20 to-transparent p-8 border-b border-white/5">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2 font-mono italic">Prismalink Simulator</h2>
                                <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                                    Secure <span className="text-rose-600">Mastergate</span>
                                </h1>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-1">Expires In</p>
                                <div className={`inline-flex items-center gap-2 font-mono font-bold text-lg ${countdown < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                                    <HiClock /> {formatTime(countdown)}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Transaction Bar */}
                        <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Amount to Pay</span>
                                <span className="text-2xl font-black text-white italic">{formatPrice(amount)}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-gray-600">
                                <span>Ref: {orderNumber}</span>
                                <span>Inv: {invoiceNumber}</span>
                            </div>
                        </div>

                        {/* Status Views */}
                        {paymentStatus === 'pending' && (
                            <div className="space-y-6">
                                <h3 className="text-gray-300 text-[10px] font-black uppercase tracking-widest ml-1 italic">Choose Gateway</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {paymentMethods.map(method => (
                                        <button
                                            key={method.id}
                                            onClick={() => setSelectedMethod(method.id)}
                                            className={`group relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${selectedMethod === method.id
                                                ? 'border-rose-600 bg-rose-600/10 shadow-[0_0_20px_rgba(225,29,72,0.1)]'
                                                : 'border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                                                }`}
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center bg-white rounded-md p-1.5 overflow-hidden shadow-inner">
                                                <img src={method.icon} alt={method.name} className="max-w-full max-h-full object-contain" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '🏦' }} />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-wider ${selectedMethod === method.id ? 'text-white' : 'text-gray-500'}`}>
                                                {method.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleConfirmSelection}
                                    disabled={!selectedMethod}
                                    className="w-full mt-8 py-5 bg-white text-black hover:bg-rose-600 hover:text-white disabled:bg-white/10 disabled:text-white/20 rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] transition-all duration-300 shadow-2xl"
                                >
                                    Proceed to Payment
                                </button>
                            </div>
                        )}

                        {paymentStatus === 'showing_va' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h3 className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6 italic">Virtual Account Number</h3>
                                    <div className="bg-white/5 rounded-2xl p-8 border border-white/5 relative group cursor-pointer" onClick={() => { navigator.clipboard.writeText(vaNumber); alert('VA Copied') }}>
                                        <div className="text-3xl font-black text-white tracking-[0.2em] font-mono mb-2">{vaNumber}</div>
                                        <div className="text-rose-600 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                            <HiDuplicate /> Click to Copy
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/[0.02] rounded-xl p-5 border border-white/5">
                                    <div className="flex items-start gap-4 text-gray-500">
                                        <HiInformationCircle className="text-blue-500 text-lg flex-shrink-0" />
                                        <p className="text-[10px] uppercase font-black tracking-widest leading-relaxed">
                                            Please transfer the exact amount of <span className="text-white italic">{formatPrice(amount)}</span> to the address above.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSimulationPayment}
                                    className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.4em] transition-all duration-300 shadow-[0_10px_40px_-10px_rgba(225,29,72,0.4)]"
                                >
                                    I Have Transferred
                                </button>
                                <button
                                    onClick={() => setPaymentStatus('pending')}
                                    className="w-full text-gray-600 hover:text-white text-[9px] font-black uppercase tracking-widest transition-colors"
                                >
                                    Change Method
                                </button>
                            </div>
                        )}

                        {paymentStatus === 'processing' && (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 border-4 border-rose-600/20 border-t-rose-600 rounded-full animate-spin mx-auto mb-10"></div>
                                <h3 className="text-white font-black uppercase tracking-[0.3em] text-lg mb-2 italic">Verifying Network</h3>
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest animate-pulse">Syncing with Prismalink Settlement Nodes...</p>
                            </div>
                        )}

                        {paymentStatus === 'success' && (
                            <div className="text-center py-16 animate-in fade-in zoom-in duration-700">
                                <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-emerald-500/30">
                                    <HiCheckCircle className="w-16 h-16 text-emerald-500" />
                                </div>
                                <h3 className="text-white font-black uppercase tracking-[0.3em] text-2xl mb-4 italic">Settlement Finalized</h3>
                                <p className="text-gray-500 text-[9px] font-black uppercase tracking-[0.3em]">Transaction ID: PLN-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-center gap-8 opacity-20 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-2.5" alt="Visa" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-5" alt="Mastercard" />
                    <div className="h-4 w-px bg-white/20"></div>
                    <span className="text-[7px] font-black text-white italic tracking-[0.3em]">AES-256 ENCRYPTION ACTIVE</span>
                </div>
            </div>
        </div>
    );
};

export default PaymentSimulator;

