import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    HiOutlineSearch,
    HiOutlineTrash,
    HiOutlinePlus,
    HiOutlineMinus,
    HiOutlineUser,
    HiOutlineCreditCard,
    HiOutlineCash,
    HiOutlineTag,
    HiOutlineCube,
    HiOutlineCheckCircle,
    HiOutlineQrcode,
    HiOutlineX,
    HiOutlineRefresh
} from 'react-icons/hi';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { posService } from '../../services/posService';
import AlertModal from '../../components/AlertModal';
import { showToast } from '../../utils/toast';

const POS = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [cart, setCart] = useState([]);
    const [customerInfo, setCustomerInfo] = useState({ name: 'Guest Customer', email: '' });
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [poPaymentType, setPoPaymentType] = useState('full'); // NEW: Option for PO
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [alertConfig, setAlertConfig] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [paymentModal, setPaymentModal] = useState({ isOpen: false, url: '', orderId: null });
    const [iframeLoading, setIframeLoading] = useState(true);
    const [manualLoading, setManualLoading] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [isGeneratingQR, setIsGeneratingQR] = useState(false);
    const [isProcessingBarcode, setIsProcessingBarcode] = useState(false);
    const [previewQR, setPreviewQR] = useState(null); // State for zooming QR
    const [toasts, setToasts] = useState([]); // Non-blocking notifications
    const searchInputRef = useRef(null);
    const qrScannerRef = useRef(null);
    const html5QrCodeRef = useRef(null);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
    };

    // Auto-Confirm Payment Polling
    useEffect(() => {
        let interval;
        if (paymentModal.isOpen && paymentModal.orderId) {
            interval = setInterval(async () => {
                try {
                    // Check order status
                    const res = await posService.checkStatus(paymentModal.orderId);
                    if (res.status === 'paid' || res.status === 'completed' || res.payment_status === 'paid') {
                        setPaymentModal({ isOpen: false, url: '', orderId: null });
                        setAlertConfig({
                            isOpen: true,
                            title: 'Pembayaran Berhasil',
                            message: `Transaksi QRIS otomatis terkonfirmasi! Order #${res.order_number}`,
                            type: 'success'
                        });

                        // Reset POS State
                        setCart([]);
                        setCustomerInfo({ name: 'Guest Customer', email: '' });
                        setSearchQuery('');
                        setPaymentMethod('CASH');
                    }
                } catch (e) {
                    console.error("Polling payment status...", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [paymentModal.isOpen, paymentModal.orderId]);

    const [initialProducts, setInitialProducts] = useState([]);
    const [activeCategory, setActiveCategory] = useState('all');

    // Initial Load
    useEffect(() => {
        const loadInitial = async () => {
            try {
                const data = await posService.searchProducts(''); // Load all/recent
                setInitialProducts(data || []);
            } catch (error) {
                console.error('Load initial products failed', error);
            }
        };
        loadInitial();
        if (searchInputRef.current) searchInputRef.current.focus();
    }, []);

    // Handle Search
    useEffect(() => {
        const delayDebounce = setTimeout(async () => {
            if (searchQuery.length >= 2) {
                setIsSearching(true);
                try {
                    const data = await posService.searchProducts(searchQuery);
                    setSearchResults(data || []);
                } catch (error) {
                    console.error('Search failed', error);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Auto-sync QR codes on mount to ensure all products have codes
    useEffect(() => {
        const syncQRs = async () => {
            try {
                await posService.generateQRCodes();
            } catch (err) {
                console.error("Auto-sync QR failed:", err);
            }
        };
        syncQRs();
    }, []);

    // Barcode Scanner / Rapid Input Handler
    const barcodeBuffer = useRef('');
    const lastKeyTime = useRef(0);
    const barcodeTimer = useRef(null);
    const lastProcessedRef = useRef({ code: '', time: 0 });

    const processBarcode = useCallback(async (inputCode) => {
        if (!inputCode || inputCode.length < 2 || isProcessingBarcode) return;

        // Pattern-based splitting for concatenated scans (e.g. "FZ-A-FZ-B")
        let codesToProcess = [inputCode.trim()];
        if (inputCode.includes('FZ-')) {
            // Split by FZ- and extract unique codes from this scan
            const matches = inputCode.split(/(?=FZ-)/).map(c => c.trim()).filter(c => c.length >= 3);
            if (matches.length > 1) {
                codesToProcess = [...new Set(matches)];
            }
        }

        setIsProcessingBarcode(true);
        setSearchQuery('');
        setSearchResults([]);

        try {
            for (const code of codesToProcess) {
                // De-bounce: Ignore exact same code if scanned within 1.0s (prevent rapid double scans)
                const now = Date.now();
                if (code === lastProcessedRef.current.code && (now - lastProcessedRef.current.time) < 1000) {
                    continue;
                }
                lastProcessedRef.current = { code, time: now };

                const data = await posService.searchProducts(code);
                const normalizedCode = code.toLowerCase();
                const exactMatch = data?.find(p =>
                    p.sku?.toLowerCase() === normalizedCode ||
                    p.qr_code?.toLowerCase() === normalizedCode
                );

                const productToAdd = exactMatch || (data && data.length > 0 ? data[0] : null);

                if (productToAdd) {
                    if (productToAdd.product_type === 'ready' && (productToAdd.stock - productToAdd.reserved_qty) <= 0) {
                        addToast(`${productToAdd.name} stok habis`, 'error');
                    } else {
                        addToCart(productToAdd);
                        addToast(`${productToAdd.name} ditambahkan`, 'success');
                    }
                } else {
                    addToast(`Kode "${code.substring(0, 15)}..." tidak terdaftar`, 'error');
                }
            }
        } catch (error) {
            console.error(error);
            addToast('Gagal mencari produk', 'error');
        } finally {
            setIsProcessingBarcode(false);
        }
    }, [cart, isProcessingBarcode]); // Re-create if cart changes (for addToCart dependency)

    // Stable reference to the processBarcode function to avoid re-binding the event listener
    const processBarcodeRef = useRef(processBarcode);
    useEffect(() => {
        processBarcodeRef.current = processBarcode;
    }, [processBarcode]);

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Clear any pending auto-trigger timer on every keypress
            if (barcodeTimer.current) clearTimeout(barcodeTimer.current);

            // Ignore specialized modifier keys alone
            if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;

            const target = e.target;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
            const isSearchInput = target === searchInputRef.current;

            const currentTime = Date.now();
            const timeDiff = currentTime - lastKeyTime.current;
            lastKeyTime.current = currentTime;

            // Scanner Heuristic: Pulse timing
            const threshold = 100;

            // Handle ENTER or TAB (Execution keys)
            if (e.key === 'Enter' || e.keyCode === 13 || e.key === 'Tab' || e.keyCode === 9) {
                const codeFromInput = isSearchInput ? target.value.trim() : '';
                const codeFromBuffer = barcodeBuffer.current.trim();

                let codeToProcess = '';
                if (isSearchInput && codeFromInput.length >= 2) {
                    codeToProcess = codeFromInput;
                    target.value = ''; // Clear DOM immediately
                } else if (codeFromBuffer.length >= 2) {
                    codeToProcess = codeFromBuffer;
                }

                if (codeToProcess) {
                    e.preventDefault();
                    setSearchQuery('');
                    barcodeBuffer.current = '';
                    setPreviewQR(null);
                    processBarcodeRef.current(codeToProcess);
                }

                barcodeBuffer.current = '';
                return;
            }

            // Handle character input
            if (e.key.length === 1) {
                if (timeDiff < threshold || !isInput) {
                    barcodeBuffer.current += e.key;
                } else {
                    barcodeBuffer.current = e.key;
                }

                // AUTO-TRIGGER LOGIC: If no more keys for 150ms, process what we have
                // This allows scanning without needing an "Enter" suffix
                barcodeTimer.current = setTimeout(() => {
                    const finalCode = barcodeBuffer.current.trim();
                    if (finalCode.length >= 3) {
                        // If it looks like a barcode scan (start with FZ- or long enough)
                        if (finalCode.includes('FZ-') || (!isInput && finalCode.length >= 4)) {
                            // Clear input if we are in it
                            if (isSearchInput) {
                                target.value = '';
                                setSearchQuery('');
                            }
                            const codeToProc = barcodeBuffer.current;
                            barcodeBuffer.current = '';
                            setPreviewQR(null); // Auto-close QR preview on scan
                            processBarcodeRef.current(codeToProc);
                        }
                    }
                }, 150);
            } else {
                // Control keys reset the buffer (except Shift)
                if (e.key !== 'Shift') barcodeBuffer.current = '';
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
            if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        };
    }, []); // Purely stable listener

    // QR Scanner handlers
    const handleQRScan = useCallback(async (decodedText) => {
        // Close scanner
        setShowQRScanner(false);

        // Search by QR code
        try {
            const data = await posService.searchProducts(decodedText);
            if (data && data.length > 0) {
                // Auto-add the first matched product to cart
                addToCart(data[0]);
                addToast(`${data[0].name} ditambahkan`, 'success');
            } else {
                setAlertConfig({
                    isOpen: true,
                    title: 'Tidak Ditemukan',
                    message: `Produk dengan QR "${decodedText}" tidak ditemukan`,
                    type: 'error'
                });
            }
        } catch (error) {
            setAlertConfig({
                isOpen: true,
                title: 'Error',
                message: 'Gagal mencari produk: ' + error.message,
                type: 'error'
            });
        }
    }, []);

    // Initialize QR Scanner when opened
    useEffect(() => {
        let html5QrCode = null;

        if (showQRScanner && qrScannerRef.current) {
            // Small delay to ensure the DOM element is ready
            const timer = setTimeout(() => {
                html5QrCode = new Html5Qrcode("qr-reader", {
                    // Use native BarcodeDetector API if available (much faster)
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    },
                    verbose: false
                });
                html5QrCodeRef.current = html5QrCode;

                html5QrCode.start(
                    { facingMode: "environment" },
                    {
                        fps: 20,
                        qrbox: function (viewfinderWidth, viewfinderHeight) {
                            // Dynamic qrbox: 70% of the smaller dimension
                            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
                            const qrboxSize = Math.floor(minDim * 0.7);
                            return { width: qrboxSize, height: qrboxSize };
                        },
                        disableFlip: false,
                    },
                    (decodedText) => {
                        // On successful scan
                        html5QrCode.stop().then(() => {
                            handleQRScan(decodedText);
                        }).catch(err => console.error("Stop error:", err));
                    },
                    (errorMessage) => {
                        // Silently handle scan errors (no QR in frame)
                    }
                ).catch(err => {
                    console.error("Camera start error:", err);
                    setShowQRScanner(false);
                    setAlertConfig({
                        isOpen: true,
                        title: 'Kamera Error',
                        message: 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan.',
                        type: 'error'
                    });
                });
            }, 200);

            return () => {
                clearTimeout(timer);
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(err => console.error("Cleanup stop error:", err));
                }
            };
        }
    }, [showQRScanner, handleQRScan]);

    const closeQRScanner = () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => {
                setShowQRScanner(false);
            }).catch(err => {
                console.error("Stop error:", err);
                setShowQRScanner(false);
            });
        } else {
            setShowQRScanner(false);
        }
    };

    const handleGenerateQR = async () => {
        setIsGeneratingQR(true);
        try {
            const result = await posService.generateQRCodes();
            setAlertConfig({
                isOpen: true,
                title: 'QR Code Generated',
                message: result.message || `${result.count} produk telah diberi QR code`,
                type: 'success'
            });
            // Reload products to get updated QR codes
            const data = await posService.searchProducts('');
            setInitialProducts(data || []);
        } catch (error) {
            setAlertConfig({
                isOpen: true,
                title: 'Error',
                message: 'Gagal generate QR: ' + (error.response?.data?.error || error.message),
                type: 'error'
            });
        } finally {
            setIsGeneratingQR(false);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            updateQuantity(product.id, 1);
        } else {
            // Inventory/Quota check
            const available = product.stock - product.reserved_qty;
            if (available <= 0) {
                setAlertConfig({
                    isOpen: true,
                    title: 'Stok Habis / Kuota Penuh',
                    message: `${product.name} telah habis atau limit batas slot.`,
                    type: 'error'
                });
                return;
            }

            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                reserved_qty: product.reserved_qty,
                product_type: product.product_type,
                quantity: 1,
                image: product.image,
                images: product.images
            }]);
        }
        setSearchQuery('');
        setSearchResults([]);
        setTimeout(() => {
            if (searchInputRef.current) searchInputRef.current.focus();
        }, 100);
    };

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.product_id === productId) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;

                // Inventory check for both ready stock & PO limits
                const available = item.stock - item.reserved_qty;
                if (newQty > available) {
                    setAlertConfig({ isOpen: true, title: 'Batas Stok/Kuota', message: `Hanya tersedia ${available} unit`, type: 'warning' });
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const removeFromCart = (productId) => setCart(cart.filter(item => item.product_id !== productId));

    const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;

        setIsProcessing(true);
        try {
            const orderData = {
                customer_name: customerInfo.name,
                customer_email: customerInfo.email,
                items: cart.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
                payment_method: paymentMethod,
                po_payment_type: poPaymentType,
                notes: `POS Direct Sale - ${new Date().toLocaleString()}`
            };

            const res = await posService.createOrder(orderData);

            if (res.payment_url) {
                // QRIS or PayLink -> Show Modal & Start Polling
                setIframeLoading(true);
                setPaymentModal({
                    isOpen: true,
                    url: res.payment_url,
                    orderId: res.id
                });
            } else {
                // Cash / Manual -> Immediate Success
                setAlertConfig({ isOpen: true, title: 'Sukses', message: `Invoice ${res.order_number} berhasil diterbitkan`, type: 'success' });

                // Reset immediately
                setCart([]);
                setCustomerInfo({ name: 'Guest Customer', email: '' });
                setSearchQuery('');
                setPaymentMethod('CASH');
            }
        } catch (error) {
            setAlertConfig({ isOpen: true, title: 'Error', message: error.response?.data?.error || 'Kegagalan sistem', type: 'error' });
        } finally {
            setIsProcessing(false);
        }
    };

    const formatPrice = (p) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p);

    const getProductImage = (product) => {
        try {
            const imgs = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
            return Array.isArray(imgs) ? imgs[0] : (product.image || '/placeholder.jpg');
        } catch (e) {
            return product.image || '/placeholder.jpg';
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Left Side: Product Discovery */}
            <div className="flex-grow flex flex-col gap-6 w-full lg:w-[65%]">
                {/* Search Header */}
                <div className="glass-card p-6 rounded-3xl border border-white/5 relative z-[60]">
                    <div className="flex gap-3">
                        <div className="relative flex-grow">
                            <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-6 h-6" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                autoComplete="off"
                                placeholder="Cari Produk, SKU, atau Scan QR Code..."
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white focus:outline-none focus:border-blue-500 text-lg transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* QR Scanner Button */}
                        <button
                            onClick={() => setShowQRScanner(true)}
                            className="px-5 py-4 bg-gradient-to-br from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-2xl transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 active:scale-95 flex items-center gap-2 group"
                            title="Scan QR Code Produk"
                        >
                            <HiOutlineQrcode className="w-6 h-6 group-hover:animate-pulse" />
                            <span className="hidden sm:inline text-sm font-bold uppercase tracking-wider">Scan</span>
                        </button>

                        {/* Generate QR Codes Button */}
                        <button
                            onClick={handleGenerateQR}
                            disabled={isGeneratingQR}
                            className="px-4 py-4 bg-white/5 border border-white/10 hover:bg-emerald-600/20 hover:border-emerald-500/30 text-gray-400 hover:text-emerald-400 rounded-2xl transition-all flex items-center gap-2 disabled:opacity-50"
                            title="Generate QR Code untuk semua produk"
                        >
                            <HiOutlineRefresh className={`w-5 h-5 ${isGeneratingQR ? 'animate-spin' : ''}`} />
                            <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">Gen QR</span>
                        </button>
                    </div>

                    {/* Search Results Dropdown */}
                    {searchResults.length > 0 && searchQuery.length >= 2 && (
                        <div className="absolute left-0 right-0 top-full mt-2 bg-[#0B0F1A] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden backdrop-blur-3xl ring-1 ring-white/10">
                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                                {searchResults.map(product => {
                                    const available = product.stock - product.reserved_qty;
                                    const isOutOfStock = product.product_type === 'ready' && available <= 0;

                                    return (
                                        <div
                                            key={product.id}
                                            onClick={() => !isOutOfStock && addToCart(product)}
                                            className={`p-4 border-b border-white/5 flex items-center gap-4 transition-colors ${isOutOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-blue-600/20 cursor-pointer'}`}
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-black overflow-hidden flex-shrink-0 border border-white/5">
                                                <img src={getProductImage(product)} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-grow">
                                                <h4 className="text-white font-bold text-sm truncate">{product.name}</h4>
                                                <div className="flex gap-2 items-center mt-0.5">
                                                    <p className="text-gray-500 text-[10px] font-mono">{product.sku}</p>
                                                    {product.qr_code && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setPreviewQR(product); }}
                                                            className="text-violet-400 text-[9px] font-mono bg-violet-500/10 px-1.5 py-0.5 rounded hover:bg-violet-500/20 transition-colors"
                                                        >
                                                            {product.qr_code}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-blue-400 font-bold">{formatPrice(product.price)}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Product Catalog Grid */}
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 pb-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(searchQuery.length < 2 ? initialProducts : []).map(product => {
                            const available = product.stock - product.reserved_qty;
                            const isOutOfStock = product.product_type === 'ready' && available <= 0;

                            return (
                                <div
                                    key={product.id}
                                    onClick={() => !isOutOfStock && addToCart(product)}
                                    className={`glass-card p-3 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group flex flex-col ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
                                >
                                    <div className="aspect-square rounded-xl bg-black overflow-hidden border border-white/5 mb-3 relative">
                                        <img
                                            src={getProductImage(product)}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            alt=""
                                        />
                                        <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${product.product_type === 'po' ? 'bg-purple-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                            {product.product_type}
                                        </div>
                                        {/* QR Code badge */}
                                        {product.qr_code && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewQR(product); }}
                                                className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-1 hover:bg-black/90 transition-colors group/qr"
                                            >
                                                <HiOutlineQrcode className="w-3 h-3 text-violet-400 group-hover/qr:text-white" />
                                                <span className="text-[7px] text-violet-300 font-mono group-hover/qr:text-white">{product.qr_code.substring(0, 12)}...</span>
                                            </button>
                                        )}
                                    </div>
                                    <h4 className="text-white font-bold text-xs line-clamp-2 min-h-[2rem] leading-tight mb-1">{product.name}</h4>
                                    <p className="text-blue-400 font-black text-sm italic mt-auto">{formatPrice(product.price)}</p>
                                    <div className="mt-2 text-[8px] text-gray-500 font-black uppercase tracking-widest flex justify-between items-center border-t border-white/5 pt-2">
                                        <span>Ready: {available}</span>
                                        <HiOutlinePlus className="w-3 h-3 text-blue-500" />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Side: Cart & Checkout (The Flow Target) */}
            <div className="w-full lg:w-[35%] flex flex-col gap-6">
                <div className="glass-card flex-grow rounded-3xl border border-white/5 flex flex-col overflow-hidden bg-black/40">
                    <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
                        <h3 className="text-white font-black uppercase tracking-widest text-xs italic">Keranjang Belanja</h3>
                        <button onClick={() => setCart([])} className="text-rose-500 text-[9px] font-black uppercase tracking-widest hover:underline">Bersihkan</button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-40">
                                <HiOutlineCube className="w-12 h-12 mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-center">Pilih Produk Untuk<br />Memulai Transaksi</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className="flex gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                                    <div className="w-10 h-10 rounded-lg bg-black overflow-hidden border border-white/5 flex-shrink-0">
                                        <img src={getProductImage(item)} className="w-full h-full object-cover" alt="" />
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <h4 className="text-white font-bold text-[11px] truncate">{item.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <div className="flex items-center gap-2 bg-black/50 rounded-lg border border-white/10 px-2 py-0.5">
                                                <button onClick={() => updateQuantity(item.product_id, -1)} className="text-gray-500 hover:text-white"><HiOutlineMinus className="w-3 h-3" /></button>
                                                <span className="text-white font-mono text-[11px] w-4 text-center">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.product_id, 1)} className="text-gray-500 hover:text-white"><HiOutlinePlus className="w-3 h-3" /></button>
                                            </div>
                                            <span className="text-blue-400 font-bold text-xs">{formatPrice(item.price * item.quantity)}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item.product_id)} className="text-gray-600 hover:text-rose-500"><HiOutlineTrash className="w-4 h-4" /></button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary & Customer Panel */}
                    <div className={`p-6 border-t border-white/10 bg-white/[0.02] space-y-6 ${cart.length === 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                        {/* Compact Customer Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Pelanggan</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                                    value={customerInfo.name}
                                    onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1.5 block">Pembayaran</label>
                                <select
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white"
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <option value="CASH" className="bg-[#0B0F1A]">CASH</option>
                                    <option value="QRIS" className="bg-[#0B0F1A]">QRIS</option>
                                </select>
                            </div>
                        </div>

                        {cart.some(item => item.product_type === 'po') && (
                            <div className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-xl">
                                <label className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2 block">Tipe Pembayaran Pre-Order</label>
                                <select
                                    className="w-full bg-purple-950/50 border border-purple-500/50 rounded-lg py-2 px-3 text-xs text-purple-100 focus:outline-none focus:border-purple-400 font-bold"
                                    value={poPaymentType}
                                    onChange={(e) => setPoPaymentType(e.target.value)}
                                >
                                    <option value="full">LUNAS Penuh (Bayar 100% Harga)</option>
                                    <option value="deposit">DP (Bayar Limit Sesuai Deposit)</option>
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-gray-400 font-bold">
                                <span>TOTAL</span>
                                <span className="text-white font-black italic">{formatPrice(calculateTotal())}</span>
                            </div>
                            <button
                                onClick={handleCheckout}
                                disabled={isProcessing || cart.length === 0}
                                className="w-full bg-blue-600 hover:bg-white hover:text-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (paymentMethod === 'QRIS' ? "TERBITKAN QRIS" : "PROSES TRANSAKSI")}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
            />

            {/* QR Code Scanner Modal */}
            {showQRScanner && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
                    <div className="bg-[#0B0F1A] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-violet-600/10 to-blue-600/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
                                    <HiOutlineQrcode className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">Scan QR Produk</h3>
                                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Arahkan kamera ke QR code produk</p>
                                </div>
                            </div>
                            <button
                                onClick={closeQRScanner}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                            >
                                <HiOutlineX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Scanner Area */}
                        <div className="p-6">
                            <div
                                ref={qrScannerRef}
                                id="qr-reader"
                                className="rounded-2xl overflow-hidden border-2 border-violet-500/30"
                                style={{ minHeight: '300px' }}
                            ></div>

                            <div className="mt-4 flex items-center gap-3 bg-violet-500/10 px-4 py-3 rounded-xl border border-violet-500/20">
                                <div className="w-2 h-2 bg-violet-500 rounded-full animate-ping"></div>
                                <p className="text-violet-300 text-xs font-medium">Kamera aktif, scan QR code produk untuk langsung menambahkan ke keranjang</p>
                            </div>

                            <p className="text-center text-gray-600 text-[9px] uppercase tracking-widest font-bold mt-4">
                                Atau ketik kode QR secara manual di search bar
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal (Iframe) */}
            {/* Payment Modal (Iframe) */}
            {paymentModal.isOpen && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0B0F1A] border border-white/10 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <div>
                                <h3 className="text-white font-bold text-lg">Scan QRIS</h3>
                                <p className="text-gray-400 text-xs mt-1">Menunggu pembayaran otomatis...</p>
                            </div>
                            <button
                                onClick={() => setPaymentModal({ isOpen: false, url: '', orderId: null })}
                                className="text-gray-400 hover:text-white p-2"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-grow bg-white relative flex flex-col items-center justify-center p-8">
                            {iframeLoading && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0B0F1A]">
                                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <p className="text-white font-black uppercase tracking-widest text-[10px] animate-pulse">
                                        Menyiapkan QRIS Premium...
                                    </p>
                                    <p className="text-gray-500 text-[8px] mt-2">Sistem sedang menghubungi Payment Gateway</p>
                                </div>
                            )}

                            {paymentModal.url.includes('api.qrserver.com') ? (
                                <div className="flex flex-col items-center">
                                    <div className="bg-white p-4 rounded-3xl shadow-2xl mb-6">
                                        <img
                                            src={paymentModal.url}
                                            alt="QRIS"
                                            className="w-64 h-64 md:w-80 md:h-80 object-contain"
                                            onLoad={() => setIframeLoading(false)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 bg-blue-50 px-6 py-3 rounded-2xl border border-blue-100">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
                                        <span className="text-blue-900 font-bold text-sm">Scan Sekarang untuk Bayar</span>
                                    </div>
                                    <p className="text-gray-400 text-[10px] mt-4 font-medium italic">Status akan terkonfirmasi otomatis dalam detik</p>

                                    <button
                                        onClick={async () => {
                                            if (manualLoading) return;
                                            setManualLoading(true);
                                            try {
                                                const res = await posService.checkStatus(paymentModal.orderId);
                                                if (res.status === 'paid' || res.status === 'completed' || res.payment_status === 'paid') {
                                                    setPaymentModal({ isOpen: false, url: '', orderId: null });
                                                    setAlertConfig({
                                                        isOpen: true,
                                                        title: 'Pembayaran Berhasil',
                                                        message: `Transaksi QRIS Terkonfirmasi! Order #${res.order_number}`,
                                                        type: 'success'
                                                    });
                                                    setCart([]);
                                                    setCustomerInfo({ name: 'Guest Customer', email: '' });
                                                    setSearchQuery('');
                                                    setPaymentMethod('CASH');
                                                } else {
                                                    showToast.info('Status Pembayaran: ' + (res.payment_status || res.status).toUpperCase() + ' — Silakan coba lagi beberapa saat lagi.');
                                                }
                                            } catch (e) {
                                                console.error("Manual Check Error:", e);
                                                showToast.error('Gagal mengecek status. Coba lagi.');
                                            } finally {
                                                setManualLoading(false);
                                            }
                                        }}
                                        disabled={manualLoading}
                                        className={`mt-6 px-6 py-3 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm select-none cursor-pointer relative z-50 border ${manualLoading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-wait' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600'}`}
                                    >
                                        {manualLoading ? (
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <span>🔄</span>
                                        )}
                                        {manualLoading ? "Mengecek..." : "Cek Status Pembayaran Manual"}
                                    </button>
                                </div>
                            ) : (
                                <iframe
                                    src={paymentModal.url}
                                    className={`w-full h-full border-0 transition-opacity duration-1000 ${iframeLoading ? 'opacity-0' : 'opacity-100'}`}
                                    title="Payment Gateway"
                                    onLoad={() => setIframeLoading(false)}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* QR Preview Modal */}
            {previewQR && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setPreviewQR(null)}>
                    <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4 max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <h3 className="text-gray-900 font-bold text-lg">{previewQR.name}</h3>
                            <p className="text-gray-500 text-xs font-mono">{previewQR.sku}</p>
                        </div>

                        <div className="p-4 bg-white border-2 border-gray-100 rounded-xl">
                            <QRCodeCanvas
                                value={previewQR.qr_code}
                                size={256}
                                level={"H"}
                                includeMargin={true}
                            />
                        </div>

                        <div className="text-center space-y-2 w-full">
                            <div className="bg-gray-100 px-3 py-2 rounded-lg">
                                <p className="text-gray-600 text-xs font-mono font-bold tracking-widest break-all">
                                    {previewQR.qr_code}
                                </p>
                            </div>
                            <button
                                onClick={() => setPreviewQR(null)}
                                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors"
                            >
                                Close
                            </button>
                            <p className="text-[9px] text-gray-400 mt-2 leading-tight">
                                *Pastikan mesin barcode Anda mendukung **2D/QR Scanning**. <br />
                                Jika tidak bisa, Anda tetap bisa mengetik SKU secara manual.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Toasts Container */}
            <div className="fixed bottom-6 left-6 z-[120] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-left-10 duration-300 pointer-events-auto ${toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
                            } text-white font-bold text-sm`}
                    >
                        {toast.type === 'error' ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineCheckCircle className="w-5 h-5" />}
                        {toast.message}
                    </div>
                ))}
            </div>

        </div>
    );
};

// Simplified alias for Bank Transfer icon
const HiOutlineGlobeAlt = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
);

export default POS;
