import React, { useState, useEffect, useRef } from 'react';
import { adminService } from '../../../services/adminService';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
    HiOutlineTruck,
    HiOutlineQrcode,
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineCamera,
    HiOutlinePencilAlt
} from 'react-icons/hi';

const QuickShip = () => {
    const [formData, setFormData] = useState({
        qr_code: '',
        carrier: '', // Default empty, wait for load
        tracking_number: ''
    });
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success, error
    const [message, setMessage] = useState('');
    const [history, setHistory] = useState([]);
    const [scanMode, setScanMode] = useState(false); // 'manual' or 'camera'

    const qrInputRef = useRef(null);
    const scannerRef = useRef(null);

    // Fetch Active Couriers
    useEffect(() => {
        const fetchCouriers = async () => {
            try {
                const data = await adminService.getActiveCouriers();
                if (Array.isArray(data) && data.length > 0) {
                    setCouriers(data);
                    // Set default to first courier
                    setFormData(prev => ({ ...prev, carrier: data[0].name }));
                } else {
                    // Fallback defaults
                    const defaults = [{ name: 'JNE' }, { name: 'J&T' }, { name: 'SICEPAT' }, { name: 'POS' }, { name: 'GOSEND' }, { name: 'GRAB' }];
                    setCouriers(defaults);
                    setFormData(prev => ({ ...prev, carrier: defaults[0].name }));
                }
            } catch (error) {
                console.error("Failed to load couriers", error);
                // Fallback defaults
                const defaults = [{ name: 'JNE' }, { name: 'J&T' }, { name: 'SICEPAT' }, { name: 'POS' }, { name: 'GOSEND' }, { name: 'GRAB' }];
                setCouriers(defaults);
                setFormData(prev => ({ ...prev, carrier: defaults[0].name }));
            }
        };
        fetchCouriers();
    }, []);

    // Auto-focus logic for manual input
    useEffect(() => {
        if (!scanMode && qrInputRef.current) qrInputRef.current.focus();
    }, [status, scanMode]);

    // Handle Camera Scanner Logic
    useEffect(() => {
        if (scanMode) {
            const onScanSuccess = (decodedText, decodedResult) => {
                handleDataProcessed(decodedText);
            };

            const onScanFailure = (error) => {
                // console.warn(`Code scan error = ${error}`);
            };

            const html5QrcodeScanner = new Html5QrcodeScanner(
                "reader",
                { fps: 10, qrbox: { width: 250, height: 250 } },
                /* verbose= */ false
            );

            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = html5QrcodeScanner;

            return () => {
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(error => {
                        console.error("Failed to clear html5QrcodeScanner. ", error);
                    });
                }
            };
        }
    }, [scanMode]);

    const handleDataProcessed = async (qrData) => {
        if (!qrData) return;
        setFormData(prev => ({ ...prev, qr_code: qrData }));
        // Close camera after successful scan
        setScanMode(false);
    };

    const processShipment = async (e) => {
        if (e) e.preventDefault();

        if (!formData.qr_code || !formData.tracking_number) {
            setStatus('error');
            setMessage('Missing QR Data or Tracking Number');
            return;
        }

        setLoading(true);
        setStatus('idle');
        setMessage('');

        try {
            const response = await adminService.quickShip(formData);

            setStatus('success');
            setMessage(`${response.order.order_number} DISPATCHED`);
            setHistory(prev => [response.order, ...prev].slice(0, 5));

            // Reset form partly, keep carrier
            setFormData(prev => ({ ...prev, qr_code: '', tracking_number: '' }));
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.error || error.message);
        } finally {
            setLoading(false);
            if (!scanMode && qrInputRef.current) qrInputRef.current.focus();
        }
    };

    return (
        <div className="p-6 md:p-8 animate-in fade-in zoom-in-95 duration-500 min-h-screen relative">
            <div className="max-w-xl mx-auto space-y-6">

                {/* Header Compact */}
                <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20">
                            <HiOutlineQrcode className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic tracking-tighter">QUICK SHIP</h1>
                            <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest leading-none">Warehouse Terminal</p>
                        </div>
                    </div>
                    {/* Mode Toggle */}
                    <div className="flex bg-white/5 rounded-lg p-1 border border-white/5">
                        <button
                            onClick={() => setScanMode(false)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${!scanMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <HiOutlinePencilAlt /> Manual
                        </button>
                        <button
                            onClick={() => setScanMode(true)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${scanMode ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                        >
                            <HiOutlineCamera /> Camera
                        </button>
                    </div>
                </div>

                {/* Main Card */}
                <div className="glass-card rounded-[2rem] overflow-hidden border border-white/10 relative">

                    {/* Camera Viewport */}
                    {scanMode && (
                        <div className="p-4 bg-black">
                            <div id="reader" className="w-full rounded-xl overflow-hidden border-2 border-white/20"></div>
                            <p className="text-center text-xs text-gray-500 mt-2">Point camera at QR Code</p>
                        </div>
                    )}

                    <div className="p-6 md:p-8 space-y-6 relative z-10 bg-gradient-to-b from-transparent to-black/20">
                        {scanMode && <div className="h-px bg-white/10 -mt-6 mb-6"></div>}

                        <form onSubmit={processShipment} className="space-y-6">

                            {/* Inputs Compact Grid */}
                            <div className="space-y-4">
                                <div>
                                    <label className="text-blue-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-1">
                                        <HiOutlineQrcode className="w-3 h-3" /> Target Order ID
                                    </label>
                                    <input
                                        ref={qrInputRef}
                                        type="text"
                                        value={formData.qr_code}
                                        onChange={(e) => setFormData({ ...formData, qr_code: e.target.value })}
                                        placeholder={scanMode ? "Detecting..." : "SCAN QR / TYPE ID"}
                                        disabled={scanMode}
                                        className="w-full bg-black/40 border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 text-lg font-mono text-white placeholder-gray-600 outline-none transition-all shadow-inner uppercase"
                                        autoComplete="off"
                                    />
                                </div>

                                <div>
                                    <label className="text-purple-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-1.5 ml-1">
                                        <HiOutlineTruck className="w-3 h-3" /> Tracking / Resi
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.tracking_number}
                                        onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                                        placeholder="SCAN / INPUT RESI"
                                        className="w-full bg-black/40 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 text-lg font-mono text-white placeholder-gray-600 outline-none transition-all shadow-inner uppercase"
                                    />
                                </div>
                            </div>

                            {/* Carrier Pills Compact */}
                            <div>
                                <label className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-2 block ml-1">Select Carrier</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {couriers.map(c => (
                                        <button
                                            key={c.name}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, carrier: c.name })}
                                            className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${formData.carrier === c.name
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-md scale-[1.02]'
                                                    : 'bg-white/5 text-gray-500 border-white/5 hover:bg-white/10 hover:text-gray-300'
                                                }`}
                                        >
                                            {c.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Status Bar */}
                            {status !== 'idle' && (
                                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top-1 ${status === 'success'
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                                    }`}>
                                    {status === 'success' ? <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0" /> : <HiOutlineXCircle className="w-5 h-5 flex-shrink-0" />}
                                    <div className="flex-grow min-w-0">
                                        <p className="font-bold text-sm truncate">{status === 'success' ? 'DISPATCH SUCCESS' : 'FAILED'}</p>
                                        <p className="text-[10px] opacity-80 truncate">{message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-4 rounded-xl font-black text-sm italic uppercase tracking-[0.2em] transition-all shadow-lg ${status === 'success'
                                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20'
                                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading ? 'PROCESSING...' : status === 'success' ? 'READY FOR NEXT' : 'CONFIRM SHIPMENT'}
                            </button>

                        </form>
                    </div>
                </div>

                {/* History List Compact */}
                {history.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/5">
                        <h3 className="text-gray-600 text-[9px] font-black uppercase tracking-widest px-2">Session History</h3>
                        <div className="space-y-2">
                            {history.map((order) => (
                                <div key={order.id} className="glass-card rounded-xl p-3 flex items-center justify-between border border-white/5 animate-in slide-in-from-bottom-1 hover:bg-white/5 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                            <HiOutlineCheckCircle className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="text-white text-xs font-bold font-mono">{order.order_number}</p>
                                            <p className="text-gray-500 text-[9px] uppercase tracking-wider">{order.tracking_number} • {order.carrier}</p>
                                        </div>
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">SENT</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default QuickShip;
