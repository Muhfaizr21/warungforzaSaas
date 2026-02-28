import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { adminService } from '../../../services/adminService';

const PackingSlip = () => {
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
                console.error("Failed to load order for packing slip", err);
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id]);

    if (loading) return <div className="p-10 text-center text-black bg-white min-h-screen">Loading...</div>;
    if (!order) return <div className="p-10 text-center text-black bg-white min-h-screen">Order not found</div>;

    return (
        <div className="bg-white text-black min-h-screen p-8 text-sm font-sans" style={{ '@media print': { margin: 0, padding: '20px' } }}>
            <div className="max-w-4xl mx-auto border border-gray-300 p-8 shadow-sm">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-black pb-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-black uppercase tracking-widest text-black mb-2">PACKING SLIP</h1>
                        <p className="text-gray-600 font-bold">Order #{order.order_number}</p>
                        <p className="text-gray-500 text-xs mt-1">Date: {new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-xl font-bold uppercase mb-1">ForzaShop</h2>
                        <p className="text-gray-600 text-xs">forzashop@example.com</p>
                        <p className="text-gray-600 text-xs">www.forzashop.com</p>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <h3 className="text-xs font-black uppercase text-gray-500 border-b border-gray-200 pb-2 mb-3">Ship To</h3>
                        <div className="font-semibold text-base">{order.shipping_first_name || order.billing_first_name} {order.shipping_last_name || order.billing_last_name}</div>
                        <div className="text-gray-700 mt-1">
                            {(order.shipping_address_1 || order.billing_address_1)}<br />
                            {(order.shipping_address_2 || order.billing_address_2) && <>{(order.shipping_address_2 || order.billing_address_2)}<br /></>}
                            {(order.shipping_city || order.billing_city)}, {(order.shipping_state || order.billing_state)} {(order.shipping_postcode || order.billing_postcode)}<br />
                            {(order.shipping_country || order.billing_country)}<br />
                            <span className="mt-2 block font-medium">Phone: {(order.shipping_phone || order.billing_phone || order.user?.phone)}</span>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase text-gray-500 border-b border-gray-200 pb-2 mb-3">Order Details</h3>
                        <div className="grid grid-cols-2 gap-y-2 text-sm">
                            <div className="text-gray-500 font-medium">Payment Method:</div>
                            <div className="font-semibold">{order.payment_method_title || order.payment_method || 'N/A'}</div>
                            <div className="text-gray-500 font-medium">Shipping Method:</div>
                            <div className="font-semibold">{order.shipping_method || 'Standard'}</div>
                            <div className="text-gray-500 font-medium">Status:</div>
                            <div className="font-semibold uppercase">{order.status}</div>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <table className="w-full text-left border-collapse mb-8">
                    <thead>
                        <tr className="border-b-2 border-black">
                            <th className="py-3 px-2 font-black uppercase text-xs">Item Description</th>
                            <th className="py-3 px-2 font-black uppercase text-xs text-center">SKU</th>
                            <th className="py-3 px-2 font-black uppercase text-xs text-center">Qty</th>
                            <th className="py-3 px-2 font-black uppercase text-xs text-center border-l border-gray-200">Checked</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items?.map((item, index) => (
                            <tr key={index} className="border-b border-gray-200 break-inside-avoid">
                                <td className="py-4 px-2">
                                    <div className="font-bold text-base">{item.product?.name || 'Legacy Product'}</div>
                                    <div className="text-xs text-gray-500 mt-1 uppercase">{item.product?.product_type}</div>
                                </td>
                                <td className="py-4 px-2 text-center text-sm font-mono">{item.product?.sku || '-'}</td>
                                <td className="py-4 px-2 text-center font-bold text-lg">{item.quantity}</td>
                                <td className="py-4 px-2 text-center border-l border-gray-200">
                                    <div className="w-6 h-6 border-2 border-gray-300 rounded mx-auto"></div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer Notes */}
                {order.notes && (
                    <div className="mb-8 p-4 bg-gray-50 border border-gray-200 rounded">
                        <h3 className="text-xs font-black uppercase text-gray-500 mb-2">Customer Notes</h3>
                        <p className="italic text-gray-700">{order.notes}</p>
                    </div>
                )}

                <div className="text-center text-gray-500 text-xs mt-12 border-t border-gray-200 pt-6 font-medium uppercase tracking-widest">
                    Thank you for your business!
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    body {
                        background: white;
                    }
                    @page { margin: 0; }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    );
};

export default PackingSlip;
