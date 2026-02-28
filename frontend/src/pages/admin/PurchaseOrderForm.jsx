import React, { useState, useEffect, useMemo } from 'react';
import { showToast } from '../../utils/toast';
import { useNavigate, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import {
    HiOutlineOfficeBuilding,
    HiOutlineSave,
    HiOutlineX,
    HiOutlinePlus,
    HiOutlineTrash,
    HiOutlineCube,
    HiOutlineCalculator,
    HiOutlineTruck,
    HiOutlineCheckCircle
} from 'react-icons/hi';

const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    // Data Sources
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);

    const [formData, setFormData] = useState({
        po_number: '',
        supplier_id: '',
        notes: '',
        status: 'draft',
        items: []
    });

    // Fetch Initial Data
    useEffect(() => {
        const fetchDependencies = async () => {
            setFetching(true);
            try {
                // Fetch Suppliers and Products in parallel
                const [suppliersRes, productsRes] = await Promise.all([
                    adminService.getSuppliers(),
                    adminService.getProducts({ limit: 1000 }) // Fetch enough for MVP selection
                ]);

                setSuppliers(suppliersRes.data || suppliersRes);
                setProducts(productsRes.data || productsRes);

                // If Edit Mode, Fetch PO
                if (id) {
                    const po = await adminService.getPurchaseOrder(id);
                    if (po) {
                        setFormData({
                            po_number: po.po_number,
                            supplier_id: po.supplier_id,
                            notes: po.notes || '',
                            status: po.status,
                            items: po.items.map(item => ({
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_cost: item.unit_cost
                            }))
                        });
                    }
                } else {
                    // Generate temp PO Number
                    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
                    setFormData(prev => ({ ...prev, po_number: `PO-${date}-${random}` }));
                }
            } catch (error) {
                console.error("Failed to load dependencies", error);
            } finally {
                setFetching(false);
            }
        };

        fetchDependencies();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Item Management
    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { product_id: '', quantity: 1, unit_cost: 0 }]
        }));
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;

        // Auto-fill cost if product selected (optional, if we had current cost in product)
        if (field === 'product_id') {
            const product = products.find(p => p.id === parseInt(value));
            if (product && product.supplier_cost) {
                newItems[index].unit_cost = product.supplier_cost;
            }
        }

        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    // Calculations
    const totalAmount = useMemo(() => {
        return formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    }, [formData.items]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                supplier_id: parseInt(formData.supplier_id),
                items: formData.items.map(item => ({
                    product_id: parseInt(item.product_id),
                    quantity: parseInt(item.quantity),
                    unit_cost: parseFloat(item.unit_cost),
                    total_cost: parseInt(item.quantity) * parseFloat(item.unit_cost)
                }))
            };

            if (id) {
                await adminService.updatePurchaseOrder(id, payload);
            } else {
                await adminService.createPurchaseOrder(payload);
            }
            navigate('/admin/procurement');
        } catch (error) {
            console.error("Failed to save PO", error);
            showToast.error("Error: " + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleReceive = async () => {
        if (!window.confirm("Terima pesanan ini? Stok akan bertambah.")) return;
        setLoading(true);
        try {
            await adminService.receivePurchaseOrder(id);
            showToast.success("PO Diterima! Stok telah diperbarui.");
            // Refresh
            const po = await adminService.getPurchaseOrder(id);
            setFormData(prev => ({ ...prev, status: po.status }));
        } catch (error) {
            showToast.error("Gagal menerima PO: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="p-10 text-center text-white">Memuat data...</div>;
    }

    return (
        <div className="glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl font-black text-white italic normal-case tracking-tight">
                        {id ? `Edit PO #${formData.po_number}` : 'Buat Pesanan Pembelian'}
                    </h2>
                    <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest mt-2">
                        {formData.status === 'draft' ? 'Draft Mode' : formData.status}
                    </p>
                </div>
                <button onClick={() => navigate('/admin/procurement')} className="p-3 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5">
                    <HiOutlineX className="w-6 h-6" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Header Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-white/5 rounded-3xl border border-white/5">
                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nomor PO</label>
                        <input
                            name="po_number"
                            value={formData.po_number}
                            onChange={handleChange}
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white font-mono"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Pemasok</label>
                        <div className="relative">
                            <HiOutlineOfficeBuilding className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                            <select
                                name="supplier_id"
                                value={formData.supplier_id}
                                onChange={handleChange}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 pl-10 text-white appearance-none cursor-pointer"
                                required
                            >
                                <option value="">Pilih Pemasok...</option>
                                {suppliers.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Catatan</label>
                        <input
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Opsional..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-white"
                        />
                    </div>
                </div>

                {/* Items Table */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white font-bold text-lg">Daftar Barang</h3>
                        <button type="button" onClick={addItem} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider">
                            <HiOutlinePlus className="w-4 h-4" /> Tambah Barang
                        </button>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-white/5">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-gray-500 text-[10px] uppercase font-black">
                                <tr>
                                    <th className="p-4">Produk</th>
                                    <th className="p-4 w-32">Qty</th>
                                    <th className="p-4 w-48">Harga Satuan (IDR)</th>
                                    <th className="p-4 w-48 text-right">Subtotal</th>
                                    <th className="p-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {formData.items.map((item, index) => (
                                    <tr key={index} className="hover:bg-white/[0.02]">
                                        <td className="p-2">
                                            <select
                                                value={item.product_id}
                                                onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                                                className="w-full bg-transparent border-none text-white focus:ring-0 cursor-pointer"
                                                required
                                            >
                                                <option value="" className="bg-slate-900">Pilih Produk...</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} (Stok: {p.stock})</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                className="w-full bg-transparent border border-white/5 rounded-lg p-2 text-white text-center"
                                                required
                                            />
                                        </td>
                                        <td className="p-2">
                                            <input
                                                type="number"
                                                min="0"
                                                value={item.unit_cost}
                                                onChange={(e) => updateItem(index, 'unit_cost', e.target.value)}
                                                className="w-full bg-transparent border border-white/5 rounded-lg p-2 text-white text-right font-mono"
                                                required
                                            />
                                        </td>
                                        <td className="p-4 text-right font-mono text-white">
                                            {(item.quantity * item.unit_cost).toLocaleString()}
                                        </td>
                                        <td className="p-2 text-center">
                                            <button type="button" onClick={() => removeItem(index)} className="text-rose-500 hover:text-rose-400">
                                                <HiOutlineTrash className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {formData.items.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500 italic">Belum ada barang ditambahkan.</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-white/5 font-bold text-white">
                                <tr>
                                    <td colSpan="3" className="p-4 text-right uppercase tracking-widest text-xs">Total Estimasi</td>
                                    <td className="p-4 text-right font-mono text-lg">{totalAmount.toLocaleString()}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-4 pt-8 border-t border-white/5">
                    {id && formData.status === 'ordered' && (
                        <button
                            type="button"
                            onClick={handleReceive}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 flex items-center gap-2"
                        >
                            <HiOutlineCheckCircle className="w-5 h-5" />
                            Terima Barang (Masuk Stok)
                        </button>
                    )}

                    {formData.status === 'draft' && (
                        <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, status: 'ordered' }))} // Quick hack: change status on save
                            className="bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <HiOutlineTruck className="w-5 h-5" />
                            Simpan & Tandai Dipesan
                        </button>
                    )}

                    {id && (
                        <button
                            type="button"
                            onClick={async () => {
                                if (window.confirm("Hapus Purchase Order ini secara permanen?")) {
                                    setLoading(true);
                                    try {
                                        await adminService.deletePurchaseOrder(id);
                                        navigate('/admin/procurement');
                                    } catch (err) {
                                        showToast.error("Gagal menghapus: " + err.message);
                                    } finally {
                                        setLoading(false);
                                    }
                                }
                            }}
                            className="bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                            <HiOutlineTrash className="w-5 h-5" />
                            HAPUS PO
                        </button>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-500/20 flex items-center gap-3"
                    >
                        <HiOutlineSave className="w-5 h-5" />
                        {loading ? 'MENYIMPAN...' : 'SIMPAN PERUBAHAN'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PurchaseOrderForm;
