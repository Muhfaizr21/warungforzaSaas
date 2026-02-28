import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { HiTrash, HiArrowLeft, HiClock, HiExclamationCircle, HiCheckCircle, HiLockClosed, HiOutlineExclamation } from 'react-icons/hi';
import { customerService } from '../services/customerService';
import ProfileAlert from '../components/ProfileAlert';
import Image from '../components/Image';
import { useCountries } from '../hooks/useCountries';
import { useLanguage } from '../context/LanguageContext';

const CartPage = () => {
    const { countries } = useCountries();
    const navigate = useNavigate();
    const { cartItems, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
    const { formatPrice } = useCurrency();
    const toast = useToast();
    const { t } = useLanguage();

    // Checkout state
    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'checking', 'reserving', 'reserved', 'processing'

    // Voucher state
    const [voucherCode, setVoucherCode] = useState('');
    const [voucherInput, setVoucherInput] = useState('');
    const [voucherDiscount, setVoucherDiscount] = useState(0);
    const [voucherFreeShipping, setVoucherFreeShipping] = useState(false);
    const [voucherMsg, setVoucherMsg] = useState({ text: '', type: '' });
    const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

    // Stock availability state
    const [stockStatus, setStockStatus] = useState(null);
    const [unavailableItems, setUnavailableItems] = useState([]);

    // Reservation state
    const [reservation, setReservation] = useState(null);
    const [reservationCountdown, setReservationCountdown] = useState(0);

    // Address confirmation modal
    const [showAddressModal, setShowAddressModal] = useState(false);

    // Shipping state
    const [shippingOptions, setShippingOptions] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [isShippingLoading, setIsShippingLoading] = useState(false);

    // Calculate total weight
    const totalWeight = cartItems.reduce((acc, item) => acc + ((item.weight || 0) * item.quantity), 0);

    // User Profile for Address
    const [userProfile, setUserProfile] = useState(null);
    const [userAddress, setUserAddress] = useState(null);
    const [profileLoaded, setProfileLoaded] = useState(false);

    // --- HELPER & DERIVED STATE ---
    const safeParseAddress = (data) => {
        if (data === null || data === undefined) return {};
        if (typeof data === 'object') return data;
        try {
            if (data === '[object Object]') return {};
            return JSON.parse(data);
        } catch (e) {
            return { main: String(data) };
        }
    };

    // Derived User Data
    const addrData = userProfile?.profile?.address ? safeParseAddress(userProfile.profile.address) : {};
    const mainAddr = addrData.main || '';
    const streetAddr = addrData.street || '';
    const postalCode = addrData.postal_code || '';

    const hasAddress = (mainAddr.trim().length > 5 || streetAddr.trim().length > 2) && postalCode.trim().length >= 4;
    const hasPhone = userProfile?.user?.phone && userProfile.user.phone.length > 5;
    const hasName = userProfile?.user?.full_name && userProfile.user.full_name.trim().length > 2;

    // Detect if international customer (non-Indonesia)
    const isInternationalCustomer = (() => {
        const cc = (addrData?.country || '').toUpperCase();
        return cc && cc !== 'ID' && cc !== 'INDONESIA';
    })();
    // ---------------------------

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const data = await customerService.getProfile();
                setUserProfile(data); // Store full data {user, profile}

                // Parse address if string from data.profile
                let addr = {};
                if (data.profile?.address) {
                    try {
                        addr = typeof data.profile.address === 'string'
                            ? JSON.parse(data.profile.address)
                            : data.profile.address;
                    } catch (e) {
                        // Fallback attempt to parse legacy string?
                        // For now assume structured or empty
                    }
                }
                setUserAddress(addr);
            } catch (error) {
                console.error("Failed to load profile for shipping", error);
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('token');
                    navigate('/login');
                    return;
                }
            } finally {
                setProfileLoaded(true);
            }
        };
        loadProfile();
    }, []);

    // Fetch shipping options whenever weight changes or address is loaded
    useEffect(() => {
        const fetchShipping = async () => {
            if (cartItems.length === 0) {
                setShippingOptions([]);
                setSelectedMethod(null);
                return;
            }

            // Need address for accurate calculation
            if (!userAddress) {
                setShippingOptions([]);
                return;
            }

            setIsShippingLoading(true);
            try {
                // Pass address and subtotal to service
                const options = await customerService.getShippingOptions(totalWeight, userAddress, cartTotal);

                // Filter logic: If domestic, show JNE/Standard. If International, show Air/Sea.
                // The backend now handles this logic based on country.
                setShippingOptions(options);

                // Auto select logic
                if (options.length > 0) {
                    // Try to keep selected method if still valid
                    const exists = options.find(o => o.method === selectedMethod?.method);
                    if (exists) {
                        setSelectedMethod(exists);
                    } else {
                        setSelectedMethod(options[0]);
                    }
                } else {
                    setSelectedMethod(null);
                }
            } catch (err) {
                console.error("Failed to load shipping options", err);
            } finally {
                setIsShippingLoading(false);
            }
        };

        // Debounce slightly
        const timer = setTimeout(fetchShipping, 500);
        return () => clearTimeout(timer);
    }, [totalWeight, cartItems.length, userAddress]);

    // Silent stock check for checkout flow (returns boolean)
    const checkStockSilent = async () => {
        if (cartItems.length === 0) return false;

        try {
            const items = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }));

            const result = await customerService.checkStockAvailability(items);
            setStockStatus(result);

            const unavailable = result.items?.filter(item => !item.is_available) || [];
            setUnavailableItems(unavailable);

            return result.all_available;
        } catch (error) {
            console.error('Stock check failed:', error);
            return false;
        }
    };

    // Manual stock check with toast feedback (for button)
    const checkAvailability = async () => {
        if (cartItems.length === 0) {
            toast.warning('Keranjang belanja kosong!');
            return;
        }

        try {
            setCheckoutStep('checking');
            const items = cartItems.map(item => ({
                product_id: item.id,
                quantity: item.quantity
            }));

            const result = await customerService.checkStockAvailability(items);
            setStockStatus(result);

            const unavailable = result.items?.filter(item => !item.is_available) || [];
            setUnavailableItems(unavailable);

            setCheckoutStep('cart');

            if (result.all_available) {
                toast.success('Semua item tersedia! Lanjutkan ke checkout.');
            } else {
                toast.warning('Beberapa item tidak tersedia atau stok terbatas.');
            }
        } catch (error) {
            console.error('Stock check failed:', error);
            toast.error('Gagal memverifikasi stok. Coba lagi.');
            setCheckoutStep('cart');
        }
    };

    // Countdown timer for reservation
    useEffect(() => {
        if (!reservation || reservationCountdown <= 0) return;

        const timer = setInterval(() => {
            setReservationCountdown(prev => {
                if (prev <= 1) {
                    // Reservation expired
                    setReservation(null);
                    setCheckoutStep('cart');
                    alert('⏰ Reservation expired! Stock has been released.');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [reservation, reservationCountdown]);

    // Format countdown time
    const formatCountdown = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle checkout button click - Show address confirmation
    const handleCheckout = async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        if (!hasAddress || !hasPhone || !hasName) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return; // Alert will be shown in UI
        }

        // Show address confirmation modal
        setShowAddressModal(true);
    };

    // Process checkout after address confirmation
    const processCheckout = async () => {

        if (cartItems.length === 0) return;

        setIsCheckingOut(true);

        try {
            // Step 1: Check stock availability (silent - no alerts)
            setCheckoutStep('checking');
            const isAvailable = await checkStockSilent();

            if (!isAvailable) {
                setIsCheckingOut(false);
                setCheckoutStep('cart');
                alert('❌ Some items are unavailable. Please check your cart.');
                return;
            }

            // Step 2: Create order directly (skip reservation for now)
            setCheckoutStep('processing');

            // Parse user profile for billing details
            const userName = userProfile?.user?.full_name || '';
            const nameParts = userName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            const phone = userProfile?.user?.phone || '';
            const email = userProfile?.user?.email || '';

            const orderData = {
                items: cartItems.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity
                })),

                // Billing Details (WooCommerce Standard)
                billing_first_name: firstName,
                billing_last_name: lastName,
                billing_company: '',
                billing_country: addrData.country || 'ID', // Normalize to ISO code, default 'ID'
                billing_address_1: addrData.street || addrData.main || '',
                billing_address_2: '',
                billing_city: addrData.city || '',
                billing_state: addrData.state || '',
                billing_postcode: addrData.postal_code || '',
                billing_phone: phone,
                billing_email: email,

                // Shipping Details (same as billing by default)
                ship_to_different: false,
                shipping_first_name: firstName,
                shipping_last_name: lastName,
                shipping_company: '',
                shipping_country: addrData.country || 'ID',
                shipping_address_1: addrData.street || addrData.main || '',
                shipping_address_2: '',
                shipping_city: addrData.city || '',
                shipping_state: addrData.state || '',
                shipping_postcode: addrData.postal_code || '',

                // Shipping & Payment Method
                shipping_method: selectedMethod?.name || 'Standard Shipping',
                shipping_cost: voucherFreeShipping ? 0 : (selectedMethod?.cost || 0),
                payment_method: 'bank_transfer',
                payment_method_title: 'Bank Transfer',
                coupon_code: voucherCode,
                discount_amount: voucherDiscount,

                // Legacy fields
                shipping_address: addrData.main || addrData.street || '',
                notes: ""
            };

            const result = await customerService.checkout(orderData);

            clearCart();
            setReservation(null);

            // Get invoice ID for payment
            const invoiceId = result.invoice?.id || result.invoices?.[0]?.id;
            const orderId = result.order?.id;
            const orderNumber = result.order?.order_number;
            const total = result.order?.total_amount;

            // Redirect directly to order detail page (skip success page)
            navigate(`/order/${orderId}`);

        } catch (error) {
            console.error('❌ Checkout failed:', error);
            toast.error(error.response?.data?.error || error.message || 'Checkout gagal. Coba lagi.');
            setCheckoutStep('cart');
        } finally {
            setIsCheckingOut(false);
        }
    };



    const getItemImage = (item) => {
        try {
            if (item.image) return item.image;
            if (Array.isArray(item.images)) return item.images[0] || '/placeholder.jpg';
            if (typeof item.images === 'string') {
                const parsed = JSON.parse(item.images);
                return Array.isArray(parsed) ? (parsed[0] || '/placeholder.jpg') : '/placeholder.jpg';
            }
            return '/placeholder.jpg';
        } catch (e) {
            return '/placeholder.jpg';
        }
    };

    const isItemUnavailable = (itemId) => {
        return unavailableItems.some(u => u.product_id === itemId);
    };

    const getItemAvailability = (itemId) => {
        return stockStatus?.items?.find(i => i.product_id === itemId);
    };

    // Calculate Profile Alert Content safely
    let profileAlertContent = null;

    if (profileLoaded && localStorage.getItem('token')) {
        if (!hasAddress) {
            profileAlertContent = (
                <div className="mb-12">
                    <ProfileAlert
                        type="danger"
                        message="Logistics Blocked: Incomplete Address or Postal Code"
                        submessage="Delivery protocols cannot be initialized without address coordinates and Postal Code. Please complete your location data before proceeding to checkout."
                        actionLabel="Complete Address"
                        actionLink="/profile"
                    />
                </div>
            );
        } else if (!hasPhone || !hasName) {
            profileAlertContent = (
                <div className="mb-12">
                    <ProfileAlert
                        type="warning"
                        message="Incomplete Identity Data"
                        submessage="Some of your profile parameters are uncalibrated. Please provide your Full Name and Phone Number for order synchronization."
                        actionLabel="Update Profile"
                        actionLink="/profile"
                    />
                </div>
            );
        }
    }

    const canCheckout = !isCheckingOut && unavailableItems.length === 0 && hasPhone && hasName && hasAddress;

    // Voucher Handlers
    const handleApplyVoucher = async () => {
        if (!voucherInput.trim()) return;
        setIsValidatingVoucher(true);
        setVoucherMsg({ text: '', type: '' });
        try {
            const token = localStorage.getItem('token');
            const productIds = cartItems.map(i => i.id);
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/customer/vouchers/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ code: voucherInput, cart_total: cartTotal, product_ids: productIds }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Invalid Voucher');
            setVoucherCode(voucherInput);
            setVoucherDiscount(data.discount_amount || 0);
            setVoucherFreeShipping(data.free_shipping || false);
            setVoucherMsg({ text: data.message || 'Voucher successfully applied!', type: 'success' });
        } catch (err) {
            setVoucherMsg({ text: err.message, type: 'error' });
            setVoucherDiscount(0);
            setVoucherFreeShipping(false);
        } finally {
            setIsValidatingVoucher(false);
        }
    };

    const handleRemoveVoucher = () => {
        setVoucherCode('');
        setVoucherInput('');
        setVoucherDiscount(0);
        setVoucherFreeShipping(false);
        setVoucherMsg({ text: '', type: '' });
    };

    return (
        <div className="bg-[#030303] min-h-screen pt-16 pb-20">
            {/* Reservation Banner */}
            {reservation && checkoutStep === 'reserved' && (
                <div className="fixed top-20 left-0 right-0 z-50 bg-gradient-to-r from-rose-600 to-red-900 py-3">
                    <div className="container flex items-center justify-center gap-4">
                        <HiLockClosed className="w-5 h-5 text-white animate-pulse" />
                        <span className="text-white font-bold text-sm">
                            Stock Reserved! Complete payment within
                        </span>
                        <span className="bg-black/30 px-3 py-1 rounded-full font-mono text-white font-bold">
                            {formatCountdown(reservationCountdown)}
                        </span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="relative h-32 md:h-48 flex items-center overflow-hidden mb-8 border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent"></div>
                <div className="container relative z-10 w-full">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-gray-500 hover:text-white mb-2 md:mb-4 transition-colors font-black uppercase tracking-[0.2em] text-[10px]"
                    >
                        <HiArrowLeft size={16} />
                        <span>Continue Shopping</span>
                    </button>
                    <h1 className="text-2xl md:text-3xl lg:text-4xl text-white uppercase italic">
                        {t('cart.yourStash')} <span className="text-rose-600">{t('cart.yourStashHighlight')}</span>
                    </h1>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">
                        {cartItems.length} {t('cart.specimens')} in Collection
                    </p>
                </div>
            </div>

            <div className="container">
                {/* Profile Completeness Alert */}
                {profileAlertContent}

                {/* Stock Warning */}
                {unavailableItems.length > 0 && (
                    <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <HiExclamationCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-red-500 font-bold mb-2">Some items are unavailable:</h3>
                                <ul className="text-sm text-red-400 space-y-1">
                                    {unavailableItems.map(item => (
                                        <li key={item.product_id}>
                                            • {cartItems.find(c => c.id === item.product_id)?.name} - {item.message}
                                            {item.available_stock > 0 && ` (Available: ${item.available_stock})`}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {cartItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                        <span className="text-8xl mb-8 opacity-20">🕸️</span>
                        <h2 className="text-2xl font-bold text-white mb-4 uppercase tracking-tight">{t('cart.empty')}</h2>
                        <p className="text-gray-500 mb-8 text-sm">{t('cart.emptyDesc')}</p>
                        <button
                            onClick={() => navigate('/readystock')}
                            className="bg-rose-600 hover:bg-white hover:text-black text-white font-black py-4 px-8 rounded-sm transition-all uppercase tracking-[0.2em] text-xs"
                        >
                            {t('cart.browseCatalog')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {cartItems.map(item => {
                                const availability = getItemAvailability(item.id);
                                const isUnavailable = isItemUnavailable(item.id);

                                return (
                                    <div
                                        key={item.id}
                                        className={`bg-white/5 border rounded-sm p-6 flex gap-6 group transition-all ${isUnavailable
                                            ? 'border-red-500/50 bg-red-500/5'
                                            : 'border-white/10 hover:border-rose-600/30'
                                            }`}
                                    >
                                        {/* Image */}
                                        <div className="w-32 h-32 bg-black rounded-sm overflow-hidden flex-shrink-0 relative">
                                            <Image
                                                src={getItemImage(item)}
                                                alt={item.name}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${isUnavailable ? 'opacity-50 grayscale' : 'group-hover:scale-110'
                                                    }`}
                                            />
                                            {isUnavailable && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                                                    <span className="text-red-500 text-xs font-bold uppercase">Unavailable</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`text-lg font-bold transition-colors ${isUnavailable ? 'text-gray-500' : 'text-white group-hover:text-rose-600'
                                                        }`}>
                                                        {item.name}
                                                    </h3>
                                                    {availability?.is_available && (
                                                        <HiCheckCircle className="w-5 h-5 text-green-500" />
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">
                                                    {item.brand || 'Unknown Brand'}
                                                </p>
                                                <p className="text-sm text-gray-400">SKU: {item.sku}</p>
                                                {availability && !availability.is_available && (
                                                    <p className="text-xs text-red-400 mt-1">
                                                        {availability.message}
                                                        {availability.available_stock > 0 &&
                                                            ` • Available: ${availability.available_stock}`
                                                        }
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between mt-4">
                                                {/* Quantity */}
                                                <div className="flex items-center gap-4 bg-black/50 rounded-full px-4 py-2">
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                        className="text-gray-400 hover:text-white font-bold text-lg"
                                                        disabled={isUnavailable}
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-white font-mono font-bold w-8 text-center">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                        className="text-gray-400 hover:text-white font-bold text-lg"
                                                        disabled={isUnavailable}
                                                    >
                                                        +
                                                    </button>
                                                </div>

                                                {/* Price */}
                                                <div className="text-right">
                                                    <p className={`text-2xl font-black italic ${isUnavailable ? 'text-gray-500' : 'text-rose-600'}`}>
                                                        {formatPrice(item.price * item.quantity)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {formatPrice(item.price)} each
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Remove Button */}
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="self-start bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white p-3 rounded-full transition-all"
                                        >
                                            <HiTrash size={18} />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* Clear Cart */}
                            <button
                                onClick={clearCart}
                                className="w-full text-xs text-gray-600 hover:text-red-500 uppercase tracking-widest py-4 border border-white/5 hover:border-red-500/30 rounded-sm transition-all"
                            >
                                {t('cart.clearAll')}
                            </button>
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/5 border border-white/10 rounded-sm p-8 sticky top-24">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight mb-6 border-b border-white/10 pb-4">
                                    {t('cart.orderSummary')}
                                </h2>

                                <div className="space-y-4 mb-8">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('cart.subtotal')}</span>
                                        <span className="text-white font-bold">{formatPrice(cartTotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">{t('cart.totalWeight')}</span>
                                        <span className="text-white font-bold">{totalWeight.toFixed(2)} kg</span>
                                    </div>

                                    {/* Shipping Selection */}
                                    <div className="pt-4 border-t border-white/5">
                                        {isInternationalCustomer && (
                                            <div className="mb-3 flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2">
                                                <span className="text-lg">✈️</span>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-400">International Shipping</p>
                                                    <p className="text-[8px] text-blue-300/60">DHL Express / Sea Freight</p>
                                                </div>
                                            </div>
                                        )}
                                        <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-3 block">
                                            {t('cart.selectShipping')}
                                        </label>

                                        {isShippingLoading ? (
                                            <div className="py-2 text-gray-500 text-[10px] animate-pulse uppercase tracking-widest">Initializing Protocol...</div>
                                        ) : (
                                            <div className="space-y-1 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                                {Array.isArray(shippingOptions) && shippingOptions.map(option => (
                                                    <button
                                                        key={option.id}
                                                        onClick={() => setSelectedMethod(option)}
                                                        className={`w-full text-left p-3 rounded-sm border transition-all flex justify-between items-center group ${selectedMethod?.id === option.id
                                                            ? 'border-rose-600 bg-rose-600/10'
                                                            : 'border-white/5 hover:border-white/20 bg-black/20'
                                                            }`}
                                                    >
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className={`text-[10px] font-black uppercase tracking-wider ${selectedMethod?.id === option.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                                                                {option.name}
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-gray-600 uppercase font-bold">
                                                                    {option.est_days}
                                                                </span>
                                                                <span className="text-[9px] text-rose-900/50 font-black uppercase tracking-tighter">
                                                                    {option.description.split('Weight:')[0]}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className={`font-mono text-[11px] font-black ${selectedMethod?.id === option.id ? 'text-rose-600' : 'text-gray-500'}`}>
                                                            +{formatPrice(option.cost)}
                                                        </p>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between text-sm pt-4">
                                        <span className="text-gray-400 uppercase tracking-widest text-[10px]">{t('cart.tax')}</span>
                                        <span className="text-white font-bold">{t('cart.included')}</span>
                                    </div>
                                </div>

                                {/* ── VOUCHER INPUT ── */}
                                <div className="mb-6 border-t border-white/5 pt-5">
                                    <label className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-black mb-2 block">{t('cart.voucherCode')}</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={voucherInput}
                                            onChange={e => setVoucherInput(e.target.value.toUpperCase())}
                                            onKeyDown={e => e.key === 'Enter' && handleApplyVoucher()}
                                            placeholder={t('cart.enterCode')}
                                            disabled={!!voucherCode}
                                            className="flex-1 bg-black/40 border border-white/10 rounded-sm px-3 py-2 text-white text-xs font-mono focus:border-rose-500 focus:outline-none uppercase placeholder:normal-case placeholder:text-gray-600 disabled:opacity-50"
                                        />
                                        {voucherCode ? (
                                            <button onClick={handleRemoveVoucher}
                                                className="px-3 py-2 bg-red-600/20 border border-red-500/30 text-red-400 text-xs rounded-sm hover:bg-red-600/30 transition-colors font-bold">
                                                ✕
                                            </button>
                                        ) : (
                                            <button onClick={handleApplyVoucher} disabled={isValidatingVoucher || !voucherInput}
                                                className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-sm disabled:opacity-50 transition-colors">
                                                {isValidatingVoucher ? '...' : t('cart.apply')}
                                            </button>
                                        )}
                                    </div>
                                    {voucherMsg.text && (
                                        <p className={`text-[10px] mt-1.5 font-medium ${voucherMsg.type === 'success' ? 'text-emerald-400' : 'text-red-400'
                                            }`}>{voucherMsg.text}</p>
                                    )}
                                </div>

                                <div className="border-t border-white/10 pt-6 mb-8">
                                    {voucherDiscount > 0 && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-emerald-400 uppercase tracking-widest font-black flex items-center gap-1">
                                                🏷️ Voucher Discount <span className="font-mono text-[9px] bg-emerald-500/10 px-1.5 py-0.5 rounded">{voucherCode}</span>
                                            </span>
                                            <span className="text-emerald-400 font-bold text-sm">-{formatPrice(voucherDiscount)}</span>
                                        </div>
                                    )}
                                    {voucherFreeShipping && (
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs text-sky-400 uppercase tracking-widest font-black">🚚 Free Shipping</span>
                                            <span className="text-sky-400 font-bold text-sm">-{formatPrice(selectedMethod?.cost || 0)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-xs text-gray-500 uppercase tracking-widest font-black">{t('cart.finalTotal')}</span>
                                        <span className="text-3xl font-black text-white italic">
                                            {formatPrice(Math.max(0, cartTotal + (voucherFreeShipping ? 0 : (selectedMethod?.cost || 0)) - voucherDiscount))}
                                        </span>
                                    </div>
                                </div>

                                {/* Checkout Status */}
                                {checkoutStep !== 'cart' && checkoutStep !== 'reserved' && (

                                    <div className="mb-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2">
                                            <HiClock className="w-5 h-5 text-blue-400 animate-spin" />
                                            <span className="text-blue-400 text-sm font-medium">
                                                {checkoutStep === 'checking' && 'Checking stock availability...'}
                                                {checkoutStep === 'reserving' && 'Reserving your items...'}
                                                {checkoutStep === 'processing' && 'Processing your order...'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {/* Reserved Timer */}
                                {reservation && reservationCountdown > 0 && (
                                    <div className="mb-4 bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <HiLockClosed className="w-5 h-5 text-green-400" />
                                                <span className="text-green-400 text-sm font-medium">
                                                    Stock Reserved
                                                </span>
                                            </div>
                                            <span className="font-mono text-green-400 font-bold">
                                                {formatCountdown(reservationCountdown)}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {profileLoaded && localStorage.getItem('token') && (
                                    <button
                                        onClick={handleCheckout}
                                        disabled={!canCheckout}
                                        className={`w-full btn-primary h-[54px] mb-4 ${!canCheckout
                                            ? '!bg-gray-600 !text-gray-400 !border-gray-600 cursor-not-allowed'
                                            : ''
                                            }`}
                                    >
                                        {isCheckingOut
                                            ? t('common.loading')
                                            : !canCheckout && unavailableItems.length > 0
                                                ? 'Remove Unavailable Specimens'
                                                : t('cart.checkout')
                                        }
                                    </button>
                                )}

                                {/* Check Availability Button */}
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        checkAvailability();
                                    }}
                                    className="w-full btn-secondary h-[48px] mb-3"
                                >
                                    {checkoutStep === 'checking' ? '⏳ Scanning Stock...' : '🔍 Verify Availability'}
                                </button>

                                <button
                                    onClick={() => navigate('/readystock')}
                                    className="w-full text-xs text-gray-500 hover:text-white uppercase tracking-widest py-3 transition-colors"
                                >
                                    Continue Hunting
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Address Confirmation Modal */}
            {showAddressModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-lg p-8 max-w-md w-full shadow-2xl transform animate-slideUp">
                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-red-900 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Confirm Coordinates</h3>
                                <p className="text-xs text-gray-500 uppercase tracking-widest">Shipping Address</p>
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                            <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Your Delivery Address:</p>
                            <div className="space-y-2 text-sm">
                                <p className="text-white font-bold">{userProfile?.user?.full_name || 'N/A'}</p>
                                <p className="text-gray-300">
                                    {(() => {
                                        const safeParseAddress = (data) => {
                                            if (!data) return {};
                                            if (typeof data === 'object') return data;
                                            try {
                                                if (data === '[object Object]') return {};
                                                return JSON.parse(data);
                                            } catch (e) {
                                                return { main: data };
                                            }
                                        };
                                        const addrData = safeParseAddress(userProfile?.profile?.address);
                                        return addrData.street || addrData.main || 'Address unavailable';
                                    })()}
                                </p>
                                <p className="text-gray-300">
                                    {(() => {
                                        const safeParseAddress = (data) => {
                                            if (!data) return {};
                                            if (typeof data === 'object') return data;
                                            try {
                                                if (data === '[object Object]') return {};
                                                return JSON.parse(data);
                                            } catch (e) {
                                                return { main: data };
                                            }
                                        };
                                        const addrData = safeParseAddress(userProfile?.profile?.address);
                                        const parts = [];
                                        if (addrData.city) parts.push(addrData.city);
                                        if (addrData.state) parts.push(addrData.state);
                                        if (addrData.postal_code) parts.push(addrData.postal_code);
                                        return parts.join(', ') || '';
                                    })()}
                                </p>
                                <p className="text-gray-300">
                                    {(() => {
                                        const safeParseAddress = (data) => {
                                            if (!data) return {};
                                            if (typeof data === 'object') return data;
                                            try {
                                                if (data === '[object Object]') return {};
                                                return JSON.parse(data);
                                            } catch (e) {
                                                return { main: data };
                                            }
                                        };
                                        const addrData = safeParseAddress(userProfile?.profile?.address);
                                        const c_code = addrData.country || 'ID';
                                        const countryObj = countries.find(c => c.code === c_code || c.name === c_code);
                                        return countryObj ? countryObj.name : c_code;
                                    })()}
                                </p>
                                <p className="text-blue-400 mt-3">📱 {userProfile?.user?.phone || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Warning */}
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                            <p className="text-yellow-400 text-xs flex items-start gap-2">
                                <HiOutlineExclamation className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Please ensure your delivery address is accurate. The package will be shipped to this location.</span>
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowAddressModal(false);
                                    navigate('/profile');
                                }}
                                disabled={isCheckingOut}
                                className={`flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-3 px-4 rounded-lg uppercase tracking-widest text-xs transition-all border border-white/20 ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Edit Address
                            </button>
                            <button
                                onClick={() => {
                                    processCheckout();
                                }}
                                disabled={isCheckingOut}
                                className={`flex-1 bg-gradient-to-r from-rose-600 to-red-900 hover:from-rose-600/80 hover:to-red-900/80 text-white font-black py-3 px-4 rounded-lg uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 ${isCheckingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {isCheckingOut ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        <span>Processing...</span>
                                    </>
                                ) : (
                                    '✓ Proceed'
                                )}
                            </button>
                        </div>

                        {/* Close button */}
                        <button
                            onClick={() => setShowAddressModal(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CartPage;
