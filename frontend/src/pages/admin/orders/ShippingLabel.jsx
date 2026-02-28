import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { adminService } from '../../../services/adminService';
import QRCode from 'react-qr-code';

const ShippingLabel = () => {
    const { id } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadOrder = async () => {
            try {
                const data = await adminService.getOrder(id);
                setOrder(data.order || data);
                setTimeout(() => {
                    window.print();
                }, 500);
            } catch (err) {
                console.error("Failed to load order for shipping label", err);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-black bg-white min-h-screen">Loading...</div>;
    if (!order) return <div className="p-10 text-center text-black bg-white min-h-screen">Order not found</div>;

    const shipToName = `${order.shipping_first_name || order.billing_first_name} ${order.shipping_last_name || order.billing_last_name}`;
    const trackingNo = order.tracking_number || "PENDING";

    return (
        <div className="bg-white text-black min-h-screen p-8 font-sans flex justify-center items-start">
            {/* Standard 4x6 Label Size representation (approx) */}
            <div className="border-4 border-black w-full max-w-[4in] p-4 relative" style={{ minHeight: '6in' }}>

                {/* Carrier / Header */}
                <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-4">
                    <div className="font-black text-3xl uppercase tracking-tighter">
                        {order.carrier || order.shipping_method || 'STANDARD'}
                    </div>
                    <div className="font-bold text-lg">
                        {order.shipping_postcode || order.billing_postcode}
                    </div>
                </div>

                {/* From / Return Address */}
                <div className="text-xs mb-4">
                    <div className="font-bold uppercase">FROM: ForzaShop</div>
                    <div>123 Commerce St</div>
                    <div>Jakarta, Indonesia 10000</div>
                    <div>Ph: +62 812 3456 7890</div>
                </div>

                {/* To Address */}
                <div className="border-t-2 border-b-2 border-black py-4 mb-4 text-center">
                    <h2 className="text-xs font-bold uppercase text-gray-500 mb-2">SHIP TO:</h2>
                    <div className="font-black text-2xl uppercase">{shipToName}</div>
                    <div className="text-lg font-medium leading-tight mt-2">
                        {(order.shipping_address_1 || order.billing_address_1)}<br />
                        {(order.shipping_address_2 || order.billing_address_2) && <>{(order.shipping_address_2 || order.billing_address_2)}<br /></>}
                        {(order.shipping_city || order.billing_city)}, {(order.shipping_state || order.billing_state)} {(order.shipping_postcode || order.billing_postcode)}<br />
                        {(order.shipping_country || order.billing_country)}
                    </div>
                    <div className="mt-3 font-bold text-lg">
                        Ph: {(order.shipping_phone || order.billing_phone || order.user?.phone)}
                    </div>
                </div>

                {/* Barcode/Tracking Area */}
                <div className="text-center mb-4">
                    <div className="font-bold text-xs uppercase mb-2 text-gray-500">Tracking Number</div>
                    <div className="font-black text-3xl font-mono tracking-widest">{trackingNo}</div>

                    {/* Fake barcode using div, or actual QR. We'll use a QR code for tracking reference */}
                    <div className="mt-4 flex justify-center">
                        <QRCode value={trackingNo} size={100} />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="absolute bottom-4 left-4 right-4 border-t-2 border-black pt-2 flex justify-between text-xs font-bold">
                    <div>Order: {order.order_number}</div>
                    <div>Wt: {order.items?.length || 1} items</div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body {
                        background: white;
                    }
                    @page { 
                        size: 4in 6in;
                        margin: 0; 
                    }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
};

export default ShippingLabel;
