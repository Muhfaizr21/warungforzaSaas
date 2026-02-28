import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    HiCreditCard, HiQrcode, HiOfficeBuilding, HiClock,
    HiCheckCircle, HiClipboardCopy, HiArrowLeft, HiRefresh,
    HiExclamationCircle, HiShieldCheck,
    HiLightningBolt, HiLockClosed, HiChevronDown
} from 'react-icons/hi';
import { customerService } from '../services/customerService';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';

const PaymentPage = () => {
    const { invoiceId } = useParams();
    const navigate = useNavigate();
    const { formatPrice, currency } = useCurrency();

    const [invoice, setInvoice] = useState(null);
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedMethod, setSelectedMethod] = useState(null);
    const [selectedBank, setSelectedBank] = useState(null);
    const [paymentData, setPaymentData] = useState(null);
    const [storeSettings, setStoreSettings] = useState({ enable_bank_transfer: false, bank_account: '' });
    const [processingPayment, setProcessingPayment] = useState(false);
    const [copied, setCopied] = useState(false);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [walletConfirmOpen, setWalletConfirmOpen] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [walletBalance, setWalletBalance] = useState(0);

    // Payment Methods
    const basePaymentMethods = [
        {
            id: 'va',
            name: 'Virtual Account',
            icon: HiOfficeBuilding,
            description: 'Transfer via ATM, Mobile, Internet Banking',
            banks: [
                { id: 'bca', name: 'BCA', logo: '🏦' },
                { id: 'mandiri', name: 'Mandiri', logo: '🏪' },
                { id: 'bri', name: 'BRI', logo: '🏢' },
                { id: 'niaga', name: 'Niaga', logo: '💠' },
            ]
        },
        {
            id: 'cc',
            name: 'Credit Card',
            icon: HiCreditCard,
            description: 'Visa, Mastercard, JCB'
        },
        {
            id: 'qris',
            name: 'QRIS',
            icon: HiQrcode,
            description: 'Scan QR via e-wallet / mobile banking'
        },

    ];

    const [paymentMethods, setPaymentMethods] = useState(basePaymentMethods);
    const [savedCards, setSavedCards] = useState([]);
    const [selectedCard, setSelectedCard] = useState('new'); // 'new' or token_id
    const [installmentTerm, setInstallmentTerm] = useState(0);
    const [saveCard, setSaveCard] = useState(true);

    // CC Direct Form States
    const [ccStep, setCcStep] = useState(0); // 0: not started, 1: show form, 2: submitting
    const [ccMerchantRef, setCcMerchantRef] = useState('');
    const [ccSessionToken, setCcSessionToken] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCVV, setCardCVV] = useState('');

    const detectCardType = (number) => {
        const n = number.replace(/\s/g, '');
        if (/^4/.test(n)) return 'VISA';
        if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return 'MASTERCARD';
        if (/^35/.test(n)) return 'JCB';
        if (/^3[47]/.test(n)) return 'AMEX';
        return '';
    };

    const formatCardNumber = (val) => {
        const v = val.replace(/\D/g, '').slice(0, 16);
        return v.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    const formatExpiry = (val) => {
        const v = val.replace(/\D/g, '').slice(0, 4);
        if (v.length >= 3) return v.slice(0, 2) + '/' + v.slice(2);
        return v;
    };



    useEffect(() => {
        fetchInvoiceDetails();
        fetchSavedCards();
    }, [invoiceId, currency]);

    const fetchSavedCards = async () => {
        try {
            const res = await customerService.getSavedCards();
            setSavedCards(res.data || []);
        } catch (error) {
        }
    };

    const fetchInvoiceDetails = async () => {
        try {
            setLoading(true);
            const response = await customerService.getInvoiceDetails(invoiceId);
            setInvoice(response.invoice);
            setOrder(response.order);
            setStoreSettings({
                enable_bank_transfer: response.enable_bank_transfer,
                bank_account: response.bank_account
            });

            const walletRes = await customerService.getWalletBalance();
            setWalletBalance(walletRes.balance);

            let methods = [...basePaymentMethods];

            let isInternational = false;
            if (response.order) {
                const shipCountry = (response.order.shipping_country || '').toUpperCase();
                const billCountry = (response.order.billing_country || '').toUpperCase();
                if ((shipCountry && shipCountry !== 'ID' && shipCountry !== 'INDONESIA') ||
                    (!shipCountry && billCountry && billCountry !== 'ID' && billCountry !== 'INDONESIA')) {
                    isInternational = true;
                }
            }

            if (isInternational) {
                methods = methods.filter(m => m.id === 'cc');
            } else {
                if (response.enable_bank_transfer) {
                    methods.push({
                        id: 'manual',
                        name: 'Manual Bank Transfer',
                        icon: HiOfficeBuilding,
                        description: 'Manual confirmation by admin (1-24 hours)',
                        bank_info: response.bank_account
                    });
                }
            }

            if (response.invoice.type !== 'topup' && !isInternational) {
                const walletMethod = {
                    id: 'wallet',
                    name: 'Forza Wallet',
                    icon: HiShieldCheck,
                    description: `Balance: ${formatPrice(walletRes.balance)}`,
                    isWallet: true
                };
                setPaymentMethods([walletMethod, ...methods]);
            } else {
                setPaymentMethods(methods);
            }
        } catch (err) {
            setError('Failed to load invoice details');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectMethod = (method) => {
        setSelectedMethod(method);
        setSelectedBank(null);
        setPaymentData(null);
        setError(null);
    };

    const handleSelectBank = (bank) => {
        setSelectedBank(bank);
    };

    const handleGeneratePayment = async () => {
        if (!selectedMethod) return;
        setProcessingPayment(true);
        setError(null);

        try {
            if (selectedMethod.id === 'wallet') {
                if (walletBalance < invoice.amount) {
                    setAlertConfig({
                        isOpen: true,
                        title: 'Insufficient Balance',
                        message: 'Forza Wallet balance is insufficient for this transaction.',
                        type: 'error'
                    });
                    setProcessingPayment(false);
                    return;
                }
                setProcessingPayment(false);
                return;
            }

            if (selectedMethod.id === 'manual') {
                setPaymentData({
                    method: 'manual',
                    bank_info: storeSettings.bank_account,
                    amount: invoice.amount,
                    reference: invoice.invoice_number
                });
                setProcessingPayment(false);
                return;
            }

            const response = await customerService.generatePaymentCode(invoiceId, {
                method: selectedMethod.id,
                bank: selectedBank?.id,
                installment_term: installmentTerm,
                card_token: selectedCard !== 'new' ? selectedCard : '',
                save_card: saveCard
            });

            // CC Direct 2-step flow: show card form
            if (response.cc_direct && selectedMethod.id === 'cc') {
                setCcMerchantRef(response.merchant_ref_no || response.reference || '');
                setCcSessionToken(response.session_token || '');
                setCcStep(1);
                setProcessingPayment(false);
                return;
            }

            // Handle redirect-only responses (CC form, etc.)
            if (response.redirect_url && !response.va_number && !response.va_list && !response.qr_code && !response.cc_form_url && !response.session_token) {
                window.location.href = response.redirect_url;
                return;
            }

            setPaymentData(response);
        } catch (err) {
            const responseData = err.response?.data;
            const errorCode = responseData?.code;
            let errorMessage = responseData?.message || responseData?.error || err.message || 'An error occurred during transaction processing.';

            if (errorCode === 'PL013') errorMessage = 'Transaction amount is below the minimum limit for this method.';
            if (errorCode === 'PL005') errorMessage = 'Credit Card rejected by issuing bank (Do Not Honor).';
            if (errorCode === 'PL001') errorMessage = 'Incomplete payment credentials.';

            if (installmentTerm > 0 && (errorMessage.includes('installment') || errorMessage.includes('amount'))) {
                errorMessage = 'Installment transaction failed. Ensure minimum requirement (Rp 500,000) and card support.';
            }

            setAlertConfig({
                isOpen: true,
                title: 'Transaction Failed',
                message: errorMessage,
                type: 'error'
            });
            setError(errorMessage);
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleSubmitCreditCard = async () => {
        const cleanNumber = cardNumber.replace(/\s/g, '');
        if (cleanNumber.length < 13 || cleanNumber.length > 19) {
            setError('Nomor kartu kredit tidak valid');
            return;
        }
        const parts = cardExpiry.split('/');
        if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
            setError('Format tanggal kadaluarsa tidak valid (MM/YY)');
            return;
        }
        if (cardCVV.length < 3) {
            setError('CVV tidak valid');
            return;
        }

        setCcStep(2);
        setError(null);

        try {
            const expMonth = parts[0];
            const expYear = '20' + parts[1]; // Convert YY to YYYY

            const response = await customerService.submitCreditCard(invoiceId, {
                card_number: cleanNumber,
                exp_month: expMonth,
                exp_year: expYear,
                cvv: cardCVV,
                merchant_ref_no: ccMerchantRef,
                session_token: ccSessionToken
            });

            // Redirect to 3DS page for bank OTP verification
            if (response.redirect_url || response.cc_3ds_url) {
                window.location.href = response.redirect_url || response.cc_3ds_url;
                return;
            }

            // If no redirect, show payment data
            setPaymentData(response);
        } catch (err) {
            const errorMessage = err.response?.data?.error || err.message || 'Failed to process credit card.';
            setAlertConfig({
                isOpen: true,
                title: 'Credit Card Rejected',
                message: errorMessage,
                type: 'error'
            });
            setError(errorMessage);
            setCcStep(1); // Go back to form
        }
    };

    const processWalletPayment = async () => {
        setProcessingPayment(true);
        try {
            await customerService.payInvoiceWithWallet(invoiceId);
            navigate(`/payment/callback?status=success&order=${order?.order_number || ''}`);
        } catch (err) {
            setError('Failed to process wallet transaction: ' + (err.response?.data?.error || err.message));
            setProcessingPayment(false);
        }
    };

    const handleCopyCode = (code) => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCheckStatus = async (isManual = false) => {
        if (!isManual && checkingStatus) return;
        setCheckingStatus(true);
        try {
            const response = await customerService.checkPaymentStatus(invoiceId);
            if (response.status === 'paid') {
                if (invoice?.type === 'topup') {
                    navigate('/wallet', { state: { message: 'Top up wallet berhasil!' } });
                } else {
                    navigate(`/payment/callback?status=success&order=${order?.order_number || ''}`);
                }
            } else if (isManual) {
                setAlertConfig({
                    isOpen: true,
                    title: 'Pending Confirmation',
                    message: 'Payment has not been detected yet. Please wait a moment.',
                    type: 'info'
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setCheckingStatus(false);
        }
    };

    // Auto-poll
    useEffect(() => {
        let interval;
        if (paymentData && !invoice?.paid_at) {
            interval = setInterval(() => handleCheckStatus(false), 5000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [paymentData, invoice]);

    // --- RENDER ---

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-rose-600/30 border-t-rose-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (error && !invoice) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
                    <HiExclamationCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-white mb-2">Error</h2>
                    <p className="text-gray-400 mb-4 text-sm">{error}</p>
                    <button onClick={() => navigate(-1)} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm transition-all">
                        Return
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0a0a0a] min-h-screen pt-16 pb-16">
            <div className="max-w-5xl mx-auto px-4 sm:px-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <button
                            onClick={() => order ? navigate(`/order/${order.order_number}`) : navigate(-1)}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-3 text-xs uppercase tracking-widest group"
                        >
                            <HiArrowLeft className="group-hover:-translate-x-1 transition-transform" /> Back
                        </button>
                        <h1 className="text-3xl font-black text-white tracking-tight">
                            Checkout
                        </h1>
                        <p className="text-gray-500 mt-1 text-sm">
                            Invoice #{invoice?.invoice_number}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Total</p>
                            <p className="text-xl font-black text-rose-600">{formatPrice(invoice?.amount)}</p>
                        </div>
                        <HiLockClosed className="w-5 h-5 text-gray-600" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left: Methods */}
                    <div className="lg:col-span-8 space-y-6">
                        {!paymentData ? (
                            <>
                                {/* Method Selection */}
                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">
                                        Select Payment Protocol
                                    </h3>

                                    <div className="space-y-2">
                                        {paymentMethods.map((method) => (
                                            <div key={method.id}>
                                                <button
                                                    onClick={() => handleSelectMethod(method)}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${selectedMethod?.id === method.id
                                                        ? 'bg-rose-600/10 border-rose-600/30'
                                                        : 'bg-transparent border-white/5 hover:border-white/15'
                                                        }`}
                                                >
                                                    <div className={`p-2.5 rounded-lg ${selectedMethod?.id === method.id ? 'bg-rose-600/20 text-rose-400' : 'bg-white/5 text-gray-400'}`}>
                                                        <method.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="text-left flex-1">
                                                        <p className="font-semibold text-white text-sm">{method.name}</p>
                                                        <p className="text-xs text-gray-500">{method.description}</p>
                                                    </div>
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedMethod?.id === method.id ? 'border-rose-600 bg-rose-600' : 'border-gray-700'}`}>
                                                        {selectedMethod?.id === method.id && <HiCheckCircle className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                </button>

                                                {/* Bank Selection */}
                                                {selectedMethod?.id === method.id && method.banks && (
                                                    <div className="mt-2 ml-14 grid grid-cols-3 sm:grid-cols-5 gap-2">
                                                        {method.banks.map((bank) => (
                                                            <button
                                                                key={bank.id}
                                                                onClick={() => handleSelectBank(bank)}
                                                                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${selectedBank?.id === bank.id
                                                                    ? 'bg-rose-600/10 border-rose-600/30'
                                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                                                    }`}
                                                            >
                                                                <span className="text-xl">{bank.logo}</span>
                                                                <span className="text-[10px] text-gray-400 mt-1">{bank.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Wallet Selection */}
                                                {selectedMethod?.id === method.id && method.wallets && (
                                                    <div className="mt-2 ml-14 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                        {(method.wallets || []).map((wallet) => (
                                                            <button
                                                                key={wallet.id}
                                                                onClick={() => handleSelectBank(wallet)}
                                                                className={`flex flex-col items-center p-3 rounded-lg border text-center transition-all ${selectedBank?.id === wallet.id
                                                                    ? 'bg-rose-600/10 border-rose-600/30'
                                                                    : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                                                                    }`}
                                                            >
                                                                <span className="text-xl">{wallet.logo}</span>
                                                                <span className="text-[10px] text-gray-400 mt-1">{wallet.name}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Credit Card / Installment Options */}
                                                {selectedMethod?.id === 'cc' && method.id === 'cc' && (
                                                    <div className="mt-4 ml-14 bg-white/5 rounded-xl p-4 border border-white/10 space-y-4">
                                                        {/* 1. Saved Cards */}
                                                        {savedCards.length > 0 && (
                                                            <div>
                                                                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Saved Cards</p>
                                                                <div className="space-y-2">
                                                                    {savedCards.map(card => (
                                                                        <button
                                                                            key={card.id}
                                                                            onClick={() => setSelectedCard(card.card_token)}
                                                                            className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${selectedCard === card.card_token
                                                                                ? 'bg-rose-600/20 border-rose-600/50'
                                                                                : 'bg-black/20 border-white/5 hover:border-white/20'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="bg-white/10 p-1.5 rounded">
                                                                                    <HiCreditCard className="w-4 h-4 text-white" />
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-sm font-bold text-white uppercase">{card.bank_id}</p>
                                                                                    <p className="text-xs text-gray-400 font-mono">•••• {card.card_digit}</p>
                                                                                </div>
                                                                            </div>
                                                                            {selectedCard === card.card_token && <HiCheckCircle className="w-5 h-5 text-rose-600" />}
                                                                        </button>
                                                                    ))}

                                                                    <button
                                                                        onClick={() => setSelectedCard('new')}
                                                                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${selectedCard === 'new'
                                                                            ? 'bg-rose-600/20 border-rose-600/50'
                                                                            : 'bg-black/20 border-white/5 hover:border-white/20'
                                                                            }`}
                                                                    >
                                                                        <span className="text-sm font-medium text-gray-300 ml-1">Add New Credit Card</span>
                                                                        {selectedCard === 'new' && <HiCheckCircle className="w-5 h-5 text-rose-600" />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* 2. Installment Options */}
                                                        {invoice && invoice.amount >= 500000 && (
                                                            <div>
                                                                <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wider">Installment Options</p>
                                                                <div className="relative">
                                                                    <select
                                                                        value={installmentTerm}
                                                                        onChange={(e) => setInstallmentTerm(Number(e.target.value))}
                                                                        className="w-full appearance-none bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-rose-600 outline-none"
                                                                    >
                                                                        <option value={0}>Full Payment (Rp {formatPrice(invoice.amount)})</option>
                                                                        <option value={3}>3 Months Installment 0% (~ {formatPrice(invoice.amount / 3)}/mo)</option>
                                                                        <option value={6}>6 Months Installment 0% (~ {formatPrice(invoice.amount / 6)}/mo)</option>
                                                                        <option value={12}>12 Months Installment 0% (~ {formatPrice(invoice.amount / 12)}/mo)</option>
                                                                    </select>
                                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                                                        <HiChevronDown className="w-4 h-4 text-gray-400" />
                                                                    </div>
                                                                </div>
                                                                <p className="text-[10px] text-gray-500 mt-2">*Installments are processed by the issuing bank.</p>
                                                            </div>
                                                        )}

                                                        {/* 3. Save Card Preference (Only for New Card) */}
                                                        {selectedCard === 'new' && (
                                                            <div className="flex items-center gap-3 pt-2">
                                                                <button
                                                                    onClick={() => setSaveCard(!saveCard)}
                                                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${saveCard ? 'bg-rose-600 border-rose-600' : 'bg-black/40 border-white/20'}`}
                                                                >
                                                                    {saveCard && <HiCheckCircle className="w-3.5 h-3.5 text-white" />}
                                                                </button>
                                                                <span className="text-xs text-gray-300">Save card for future transactions</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                                        <HiExclamationCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                {/* CC Direct Card Input Form */}
                                {ccStep >= 1 && (
                                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                                <HiCreditCard className="w-5 h-5 text-rose-500" />
                                                Credit Card Credentials
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${detectCardType(cardNumber) === 'VISA' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-600'}`}>VISA</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${detectCardType(cardNumber) === 'MASTERCARD' ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-600'}`}>MC</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${detectCardType(cardNumber) === 'JCB' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-600'}`}>JCB</span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${detectCardType(cardNumber) === 'AMEX' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-gray-600'}`}>AMEX</span>
                                            </div>
                                        </div>

                                        {/* Card Number */}
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Card Number</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={cardNumber}
                                                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                                    placeholder="4111 1111 1111 1111"
                                                    maxLength={19}
                                                    className="w-full bg-black/40 border border-white/10 focus:border-rose-600 rounded-xl px-4 py-3.5 text-white text-base font-mono tracking-widest outline-none transition-all placeholder:text-gray-700"
                                                    disabled={ccStep === 2}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    <HiLockClosed className="w-4 h-4 text-gray-600" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Expiry */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Expiration Date</label>
                                                <input
                                                    type="text"
                                                    value={cardExpiry}
                                                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                                    placeholder="MM/YY"
                                                    maxLength={5}
                                                    className="w-full bg-black/40 border border-white/10 focus:border-rose-600 rounded-xl px-4 py-3.5 text-white text-base font-mono tracking-widest outline-none transition-all placeholder:text-gray-700"
                                                    disabled={ccStep === 2}
                                                />
                                            </div>

                                            {/* CVV */}
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">CVV</label>
                                                <input
                                                    type="password"
                                                    value={cardCVV}
                                                    onChange={(e) => setCardCVV(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                                    placeholder="•••"
                                                    maxLength={4}
                                                    className="w-full bg-black/40 border border-white/10 focus:border-rose-600 rounded-xl px-4 py-3.5 text-white text-base font-mono tracking-widest outline-none transition-all placeholder:text-gray-700"
                                                    disabled={ccStep === 2}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 text-[10px] text-gray-500 pt-1">
                                            <HiShieldCheck className="w-3.5 h-3.5" />
                                            <span>Card data is AES-256 encrypted and never stored on our servers</span>
                                        </div>

                                        {/* Submit Card Button */}
                                        <button
                                            onClick={handleSubmitCreditCard}
                                            disabled={ccStep === 2 || !cardNumber || !cardExpiry || !cardCVV}
                                            className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${cardNumber && cardExpiry && cardCVV && ccStep !== 2
                                                ? 'bg-gradient-to-r from-rose-600 to-red-900 hover:from-rose-700 hover:to-red-950 text-white shadow-lg shadow-rose-600/20'
                                                : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                                                }`}
                                        >
                                            {ccStep === 2 ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Authenticating...</span>
                                                </div>
                                            ) : (
                                                <>Pay {formatPrice(invoice?.amount)} <HiLightningBolt className="w-4 h-4" /></>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* Pay Button (Hidden when CC form is shown) */}
                                {ccStep === 0 && (
                                    <button
                                        onClick={handleGeneratePayment}
                                        disabled={!selectedMethod || (selectedMethod.banks && !selectedBank) || (selectedMethod.wallets && !selectedBank) || processingPayment}
                                        className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${selectedMethod && (!selectedMethod.banks || selectedBank) && (!selectedMethod.wallets || selectedBank)
                                            ? 'bg-gradient-to-r from-rose-600 to-red-900 hover:from-rose-700 hover:to-red-950 text-white shadow-lg shadow-rose-600/20'
                                            : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
                                            }`}
                                    >
                                        {processingPayment ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>Initialize Protocol <HiLightningBolt className="w-4 h-4" /></>
                                        )}
                                    </button>
                                )}
                            </>
                        ) : (
                            /* === PAYMENT INSTRUCTIONS === */
                            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                                        <HiCheckCircle className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-white">Payment Instructions</h2>
                                        <p className="text-xs text-gray-500">Complete before timeout</p>
                                    </div>
                                </div>

                                {/* Manual Transfer Instruction */}
                                {paymentData.method === 'manual' && (
                                    <div className="bg-black/40 rounded-xl p-6 space-y-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="p-5 border border-white/10 rounded-2xl bg-white/[0.02]">
                                                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-3">Destination Account</p>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xl font-mono font-bold text-white tracking-widest leading-none whitespace-pre-wrap">{paymentData.bank_info || 'Bank BCA - 1234567890 a/n Toko'}</p>
                                                    <button onClick={() => handleCopyCode(paymentData.bank_info)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                                                        <HiClipboardCopy className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="p-5 border border-blue-500/20 rounded-2xl bg-blue-500/5">
                                                <div className="flex gap-4">
                                                    <HiExclamationCircle className="w-6 h-6 text-blue-400 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-sm font-bold text-white">Manual Verification Required</p>
                                                        <p className="text-xs text-blue-400/70 mt-1">Please ensure to upload your transaction receipt after transferring to proceed.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => navigate(`/order/${order?.order_number || ''}`)}
                                                className="w-full bg-white text-black py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-600 hover:text-white transition-all shadow-xl shadow-white/5"
                                            >
                                                I HAVE TRANSFERRED, UPLOAD PROOF →
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* VA Number (Single) */}
                                {paymentData.va_number && !paymentData.va_list && (
                                    <div className="bg-black/40 rounded-xl p-5">
                                        <p className="text-xs text-gray-500 mb-2">Virtual Account Number {paymentData.va_bank && `(${paymentData.va_bank})`}</p>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-2xl font-mono font-bold text-white tracking-wider">
                                                {paymentData.va_number}
                                            </p>
                                            <button
                                                onClick={() => handleCopyCode(paymentData.va_number)}
                                                className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                            >
                                                <HiClipboardCopy className="w-4 h-4" />
                                                {copied ? 'Copied' : 'Copy'}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {paymentData.va_list && paymentData.va_list.length > 0 && (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                                            {selectedBank ? `Transfer Instruction for ${selectedBank.name}` : 'Select Bank for Transfer'}
                                        </p>
                                        {(() => {
                                            const filtered = paymentData.va_list.filter(va => {
                                                if (!selectedBank) return true;
                                                const search = selectedBank.name.toLowerCase();
                                                const target = va.bank.toLowerCase();
                                                return target.includes(search) || search.includes(target);
                                            });
                                            const listToRender = filtered.length > 0 ? filtered : paymentData.va_list;

                                            return listToRender.map((va, idx) => (
                                                <div key={idx} className="bg-black/40 rounded-xl p-5 border border-white/5 hover:border-white/15 transition-all">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                                                                <HiOfficeBuilding className="w-5 h-5 text-rose-400" />
                                                            </div>
                                                            <div>
                                                                <p className="text-white font-bold text-sm">{va.bank}</p>
                                                                <p className="text-[10px] text-gray-500">Virtual Account</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between bg-black/30 rounded-lg px-4 py-3">
                                                        <p className="text-xl font-mono font-bold text-white tracking-wider">
                                                            {va.va}
                                                        </p>
                                                        <button
                                                            onClick={() => handleCopyCode(va.va)}
                                                            className={`px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
                                                        >
                                                            <HiClipboardCopy className="w-4 h-4" />
                                                            {copied ? 'Copied' : 'Copy'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ));
                                        })()}

                                        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                                            <div className="flex gap-3">
                                                <HiExclamationCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <p className="text-xs text-blue-300 font-semibold">Payment Guide</p>
                                                    <p className="text-[11px] text-blue-400/70 mt-1">1. Open Mobile Banking / ATM application<br />2. Select Transfer / Virtual Account menu<br />3. Input the VA number above<br />4. Make sure the amount matches<br />5. Confirm payment</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* QR Code */}
                                {paymentData.qr_code && (
                                    <div className="bg-black/40 rounded-xl p-5 text-center">
                                        <p className="text-xs text-gray-500 mb-3">Scan QR Code using e-Wallet or Mobile Banking</p>
                                        <div className="bg-white p-4 rounded-xl inline-block shadow-xl shadow-white/5">
                                            <img src={paymentData.qr_code} alt="QR" className="w-56 h-56" loading="lazy" />
                                        </div>
                                        <p className="text-[10px] text-gray-600 mt-3">Open GoPay, OVO, DANA, ShopeePay, or your mobile banking app to scan the QR code above.</p>
                                    </div>
                                )}

                                {/* CC Iframe */}
                                {(paymentData.cc_form_url || (paymentData.session_token && paymentData.method === 'cc')) && (
                                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl relative">
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600 to-red-900 z-10"></div>
                                        <iframe
                                            src={paymentData.cc_form_url || `https://secure2-staging.plink.co.id/payment/integration/creditcard/form?token=${paymentData.session_token}`}
                                            className="w-full h-[600px] border-0"
                                            title="Credit Card Payment"
                                        />
                                    </div>
                                )}

                                {/* CC Waiting State (Legacy / Fallback) */}
                                {paymentData.waiting_cc && !paymentData.cc_form_url && !paymentData.session_token && (
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 text-center">
                                        <div className="w-10 h-10 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3"></div>
                                        <h3 className="text-white font-bold mb-1">Awaiting Credit Card Authorization</h3>
                                        <p className="text-xs text-gray-400">
                                            The credit card form has been opened in a new tab.
                                            <br />This page will automatically update once the transaction is complete.
                                        </p>
                                        <button
                                            onClick={() => window.open(paymentData.redirect_url, '_blank')}
                                            className="mt-4 px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 text-xs font-bold transition-all"
                                        >
                                            Re-open CC Form →
                                        </button>
                                    </div>
                                )}

                                {/* Timer + Check */}
                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <div className="flex-1 w-full bg-amber-500/10 border border-amber-500/10 rounded-xl p-3 flex items-center gap-2 text-amber-500 text-xs">
                                        <HiClock className="w-4 h-4 flex-shrink-0" />
                                        <span>Timeout: {paymentData.expired_at || 'Max. 24 Hours'}</span>
                                    </div>
                                    <button
                                        onClick={() => handleCheckStatus(true)}
                                        disabled={checkingStatus}
                                        className="w-full sm:w-auto px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        {checkingStatus ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <><HiRefresh className="w-4 h-4" /> Verify Payment Completed</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Security badges - lightweight */}
                        <div className="flex items-center gap-5 pt-2 opacity-40">
                            <div className="flex items-center gap-1.5">
                                <HiLockClosed className="w-3 h-3 text-gray-500" />
                                <span className="text-[9px] uppercase tracking-widest text-gray-500">SSL Encrypted</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <HiShieldCheck className="w-3 h-3 text-gray-500" />
                                <span className="text-[9px] uppercase tracking-widest text-gray-500">Secure</span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Summary */}
                    <div className="lg:col-span-4">
                        <div className="sticky top-28 bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Summary</h3>

                            <div className="space-y-3 mb-5">
                                {order?.items?.map((item, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/5 overflow-hidden flex-shrink-0">
                                            {item.product?.thumbnail ? (
                                                <img
                                                    src={item.product.thumbnail}
                                                    alt={item.product?.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">📦</div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-xs font-medium truncate">{item.product?.name}</p>
                                            <p className="text-gray-500 text-[10px]">{item.quantity}x</p>
                                        </div>
                                    </div>
                                )) || (
                                        <p className="text-gray-500 text-xs">Invoice #{invoice?.invoice_number}</p>
                                    )}
                            </div>

                            <div className="border-t border-white/5 pt-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Subtotal</span>
                                    <span className="text-gray-300">{formatPrice(invoice?.amount || 0)}</span>
                                </div>
                                <div className="flex justify-between text-base font-bold">
                                    <span className="text-white">Total</span>
                                    <span className="text-rose-600">{formatPrice(invoice?.amount || 0)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={walletConfirmOpen}
                onClose={() => setWalletConfirmOpen(false)}
                onConfirm={processWalletPayment}
                title="Authorization Required"
                message={`Deduct ${formatPrice(invoice?.amount || 0)} from Forza Wallet? Balance will be updated immediately.`}
                confirmText="Authorize Protocol"
                cancelText="Cancel"
                variant="success"
            />

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />
        </div >
    );
};

export default PaymentPage;
