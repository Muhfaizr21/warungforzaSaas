import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { API_BASE_URL as API_URL } from "../../config/api";
import {
    HiOutlineTag, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash,
    HiOutlineDuplicate, HiOutlineEye, HiOutlineRefresh, HiOutlineX,
    HiOutlineCheck, HiOutlineCheckCircle, HiOutlineExclamationCircle,
    HiOutlineSearch, HiOutlineFilter, HiOutlineDownload, HiOutlineChevronDown,
    HiOutlineClock, HiOutlineCash, HiOutlineChartBar, HiOutlineUsers,
    HiOutlineSwitchHorizontal, HiOutlineXCircle, HiOutlineLightningBolt, HiSparkles
} from "react-icons/hi";

const getAuthHeader = () => {
    const token = localStorage.getItem("token");
    return { headers: { Authorization: `Bearer ${token}` } };
};

const formatRupiah = (n) => {
    if (!n && n !== 0) return "Rp 0";
    return "Rp " + Number(n).toLocaleString("id-ID");
};

const formatDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const VOUCHER_TYPES = [
    { value: "percentage", label: "Persentase (%)", icon: "%" },
    { value: "fixed", label: "Nominal Tetap (Rp)", icon: "Rp" },
    { value: "shipping", label: "Gratis Ongkir", icon: "🚚" },
    { value: "buy_get_y", label: "Buy X Get Y", icon: "🎁" },
];

const STATUS_COLORS = {
    active: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
    expired: "bg-gray-500/20 text-gray-400 border border-gray-500/30",
    disabled: "bg-red-500/20 text-red-400 border border-red-500/30",
};
const STATUS_LABELS = { active: "Aktif", expired: "Kedaluwarsa", disabled: "Nonaktif" };

// ─── STATS CARD ─────────────────────────────────────────────────────────────────
const StatsCard = ({ icon, label, value, sub, color }) => (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-5`}>
        <div className={`absolute -top-4 -right-4 w-24 h-24 rounded-full opacity-10 ${color}`} />
        <div className={`inline-flex p-2 rounded-xl mb-3 ${color} bg-opacity-20`}>
            <span className="text-xl">{icon}</span>
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-400 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
);

// ─── VOUCHER FORM MODAL ───────────────────────────────────────────────────────
const VoucherFormModal = ({ voucher, onClose, onSaved }) => {
    const isEdit = !!voucher?.id;
    const [form, setForm] = useState({
        code: voucher?.code || "",
        description: voucher?.description || "",
        type: voucher?.type || "percentage",
        value: voucher?.value || "",
        max_discount: voucher?.max_discount || "",
        free_shipping: voucher?.free_shipping || false,
        min_spend: voucher?.min_spend || "",
        max_spend: voucher?.max_spend || "",
        usage_limit_global: voucher?.usage_limit_global || "",
        usage_limit_per_user: voucher?.usage_limit_per_user || 1,
        individual_use: voucher?.individual_use || false,
        start_date: voucher?.start_date ? voucher.start_date.slice(0, 16) : "",
        end_date: voucher?.end_date ? voucher.end_date.slice(0, 16) : "",
        status: voucher?.status || "active",
        bulk_generate: 1,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const payload = {
                ...form,
                value: parseFloat(form.value) || 0,
                max_discount: parseFloat(form.max_discount) || 0,
                min_spend: parseFloat(form.min_spend) || 0,
                max_spend: parseFloat(form.max_spend) || 0,
                usage_limit_global: parseInt(form.usage_limit_global) || 0,
                usage_limit_per_user: parseInt(form.usage_limit_per_user) || 1,
                bulk_generate: parseInt(form.bulk_generate) || 1,
                start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
                end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
            };
            if (isEdit) {
                await axios.put(`${API_URL}/admin/vouchers/${voucher.id}`, payload, getAuthHeader());
            } else {
                await axios.post(`${API_URL}/admin/vouchers`, payload, getAuthHeader());
            }
            onSaved();
        } catch (err) {
            setError(err.response?.data?.error || "Gagal menyimpan voucher");
        } finally {
            setSaving(false);
        }
    };

    const generateCode = () => {
        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let result = "";
        for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
        set("code", result);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-rose-500/20 rounded-xl">
                            <HiOutlineTag className="text-rose-400 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">{isEdit ? "Edit Voucher" : "Buat Voucher Baru"}</h2>
                            <p className="text-sm text-gray-400">{isEdit ? `Mengedit: ${voucher.code}` : "Isi detail voucher di bawah"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <HiOutlineX className="text-xl" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <HiOutlineExclamationCircle /> {error}
                        </div>
                    )}

                    {/* Code & Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Kode Voucher *</label>
                            <div className="flex gap-2">
                                <input
                                    value={form.code}
                                    onChange={e => set("code", e.target.value.toUpperCase())}
                                    placeholder="PROMO10"
                                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm font-mono focus:border-rose-500 focus:outline-none"
                                />
                                <button type="button" onClick={generateCode} title="Auto-generate"
                                    className="px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:border-rose-500 transition-colors">
                                    <HiOutlineRefresh />
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Status</label>
                            <select value={form.status} onChange={e => set("status", e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none">
                                <option value="active">Aktif</option>
                                <option value="disabled">Nonaktif</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1.5">Deskripsi Internal</label>
                        <input value={form.description} onChange={e => set("description", e.target.value)}
                            placeholder="Catatan untuk admin..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">Tipe Diskon *</label>
                        <div className="grid grid-cols-2 gap-2">
                            {VOUCHER_TYPES.map(t => (
                                <button key={t.value} type="button"
                                    onClick={() => set("type", t.value)}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${form.type === t.value ? "border-rose-500 bg-rose-500/10 text-rose-400" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"}`}>
                                    <span className="text-lg">{t.icon}</span>
                                    <span className="font-medium">{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Value */}
                    {form.type !== "shipping" && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1.5">
                                    Nilai Diskon * {form.type === "percentage" ? "(%)" : "(Rp)"}
                                </label>
                                <input type="number" value={form.value} onChange={e => set("value", e.target.value)}
                                    placeholder={form.type === "percentage" ? "10" : "50000"}
                                    min="0" max={form.type === "percentage" ? "100" : undefined}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                            </div>
                            {form.type === "percentage" && (
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1.5">Maks. Diskon (Rp)</label>
                                    <input type="number" value={form.max_discount} onChange={e => set("max_discount", e.target.value)}
                                        placeholder="0 = tidak terbatas"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Free Shipping Toggle */}
                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                        <input type="checkbox" id="free_shipping" checked={form.free_shipping}
                            onChange={e => set("free_shipping", e.target.checked)}
                            className="w-4 h-4 accent-rose-500" />
                        <label htmlFor="free_shipping" className="text-sm text-gray-300 cursor-pointer">
                            Gratis Ongkos Kirim (bisa dikombinasikan dengan diskon lain)
                        </label>
                    </div>

                    {/* Spending Limits */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Min. Belanja (Rp)</label>
                            <input type="number" value={form.min_spend} onChange={e => set("min_spend", e.target.value)}
                                placeholder="0 = tidak ada syarat"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Maks. Belanja (Rp)</label>
                            <input type="number" value={form.max_spend} onChange={e => set("max_spend", e.target.value)}
                                placeholder="0 = tidak terbatas"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Maks. Penggunaan Total</label>
                            <input type="number" value={form.usage_limit_global} onChange={e => set("usage_limit_global", e.target.value)}
                                placeholder="0 = tidak terbatas"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Maks. Per User</label>
                            <input type="number" value={form.usage_limit_per_user} onChange={e => set("usage_limit_per_user", e.target.value)}
                                placeholder="1"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Tanggal Mulai</label>
                            <input type="datetime-local" value={form.start_date} onChange={e => set("start_date", e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Tanggal Berakhir</label>
                            <input type="datetime-local" value={form.end_date} onChange={e => set("end_date", e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-rose-500 focus:outline-none" />
                        </div>
                    </div>

                    {/* Individual Use */}
                    <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                        <input type="checkbox" id="individual_use" checked={form.individual_use}
                            onChange={e => set("individual_use", e.target.checked)}
                            className="w-4 h-4 accent-rose-500" />
                        <label htmlFor="individual_use" className="text-sm text-gray-300 cursor-pointer">
                            Penggunaan individual (tidak bisa digabung dengan voucher lain)
                        </label>
                    </div>

                    {/* Bulk Generate (only on create) */}
                    {!isEdit && (
                        <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                            <label className="block text-sm font-medium text-rose-400 mb-2">
                                <HiSparkles className="inline mr-1" />
                                Generate Massal
                            </label>
                            <div className="flex items-center gap-3">
                                <input type="number" value={form.bulk_generate} onChange={e => set("bulk_generate", Math.min(500, parseInt(e.target.value) || 1))}
                                    min="1" max="500"
                                    className="w-32 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:border-rose-500 focus:outline-none" />
                                <p className="text-xs text-gray-400">voucher dengan kode unik (maks. 500)</p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 font-medium hover:bg-gray-700 transition-colors">
                            Batal
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 rounded-xl text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                            {saving ? (
                                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                            ) : (
                                <><HiOutlineCheck /> {isEdit ? "Simpan Perubahan" : "Buat Voucher"}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─── USAGE DRAWER ───────────────────────────────────────────────────────────────
const UsageDrawer = ({ voucher, onClose }) => {
    const [usages, setUsages] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_URL}/admin/vouchers/${voucher.id}/usages`, getAuthHeader())
            .then(r => { setUsages(r.data.usages || []); setTotal(r.data.total || 0); })
            .finally(() => setLoading(false));
    }, [voucher.id]);

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-gray-800">
                    <div>
                        <h3 className="font-bold text-white">Riwayat Penggunaan</h3>
                        <p className="text-sm text-gray-400">Kode: <span className="font-mono text-rose-400">{voucher.code}</span> — {total} kali digunakan</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"><HiOutlineX /></button>
                </div>
                <div className="p-5">
                    {loading ? (
                        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /></div>
                    ) : usages.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Belum ada penggunaan</p>
                    ) : (
                        <div className="space-y-2">
                            {usages.map(u => (
                                <div key={u.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700">
                                    <div>
                                        <p className="text-sm font-medium text-white">{u.user?.full_name || "User #" + u.user_id}</p>
                                        <p className="text-xs text-gray-400">{u.user?.email} · {formatDate(u.used_at)}</p>
                                        {u.order?.order_number && <p className="text-xs text-gray-500 mt-0.5">Order: {u.order.order_number}</p>}
                                    </div>
                                    <span className="text-emerald-400 font-semibold text-sm">-{formatRupiah(u.discount_amount)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function VoucherManagement() {
    const [vouchers, setVouchers] = useState([]);
    const [stats, setStats] = useState(null);
    const [topVouchers, setTopVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterType, setFilterType] = useState("");
    const [modal, setModal] = useState(null); // null | {mode: 'create'|'edit', voucher?}
    const [usageDrawer, setUsageDrawer] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            if (filterStatus) params.set("status", filterStatus);
            if (filterType) params.set("type", filterType);

            const [vRes, sRes] = await Promise.all([
                axios.get(`${API_URL}/admin/vouchers?${params}`, getAuthHeader()),
                axios.get(`${API_URL}/admin/vouchers/stats`, getAuthHeader()),
            ]);
            setVouchers(vRes.data.vouchers || []);
            setStats(sRes.data.stats);
            setTopVouchers(sRes.data.top_vouchers || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [search, filterStatus, filterType]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleDisable = async (v) => {
        if (!window.confirm(`Nonaktifkan voucher "${v.code}"?`)) return;
        setDeleting(v.id);
        try {
            await axios.delete(`${API_URL}/admin/vouchers/${v.id}`, getAuthHeader());
            showToast("Voucher dinonaktifkan");
            fetchAll();
        } catch {
            showToast("Gagal menonaktifkan", "error");
        } finally {
            setDeleting(null);
        }
    };

    const handleDelete = async (v) => {
        if (!window.confirm(`HAPUS PERMANEN voucher "${v.code}"? Aksi ini tidak bisa dibatalkan dan akan menghapus semua riwayat pemakaiannya juga.`)) return;
        setDeleting(v.id);
        try {
            await axios.delete(`${API_URL}/admin/vouchers/${v.id}?force=true`, getAuthHeader());
            showToast("Voucher berhasil dihapus permanen");
            fetchAll();
        } catch {
            showToast("Gagal menghapus", "error");
        } finally {
            setDeleting(null);
        }
    };

    const handleEnable = async (v) => {
        if (!window.confirm(`Aktifkan kembali voucher "${v.code}"?`)) return;
        setDeleting(v.id);
        try {
            await axios.put(`${API_URL}/admin/vouchers/${v.id}/enable`, {}, getAuthHeader());
            showToast("Voucher diaktifkan kembali");
            fetchAll();
        } catch {
            showToast("Gagal mengaktifkan", "error");
        } finally {
            setDeleting(null);
        }
    };

    const handleDuplicate = async (v) => {
        try {
            const res = await axios.post(`${API_URL}/admin/vouchers/${v.id}/duplicate`, {}, getAuthHeader());
            showToast(`Duplikat: ${res.data.voucher.code}`);
            fetchAll();
        } catch {
            showToast("Gagal menduplikasi", "error");
        }
    };

    const handleSaved = () => {
        setModal(null);
        showToast(modal?.mode === "edit" ? "Voucher diperbarui" : "Voucher berhasil dibuat");
        fetchAll();
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-medium transition-all ${toast.type === "error" ? "bg-red-600" : "bg-emerald-600"}`}>
                    {toast.type === "error" ? <HiOutlineExclamationCircle /> : <HiOutlineCheckCircle />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="p-2 bg-rose-500/20 rounded-xl">
                            <HiOutlineTag className="text-rose-400 text-2xl" />
                        </div>
                        Voucher & Diskon
                    </h1>
                    <p className="text-gray-400 mt-1 ml-12">Kelola kode promo dan program diskon toko</p>
                </div>
                <button onClick={() => setModal({ mode: "create" })}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 rounded-xl text-white font-medium transition-colors shadow-lg shadow-rose-900/40">
                    <HiOutlinePlus className="text-lg" />
                    Buat Voucher
                </button>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatsCard icon={<HiOutlineTag className="text-rose-400" />} label="Total Voucher" value={stats.total_vouchers} color="bg-rose-500" />
                    <StatsCard icon={<HiOutlineLightningBolt className="text-emerald-400" />} label="Voucher Aktif" value={stats.active_vouchers} color="bg-emerald-500" />
                    <StatsCard icon={<HiOutlineUsers className="text-blue-400" />} label="Total Pemakaian" value={stats.total_usage.toLocaleString()} color="bg-blue-500" />
                    <StatsCard icon={<HiOutlineCash className="text-amber-400" />} label="Total Diskon Diberikan" value={formatRupiah(stats.total_discount)} color="bg-amber-500" />
                </div>
            )}

            {/* Top Vouchers mini chart */}
            {topVouchers.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-6">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <HiOutlineChartBar className="text-rose-400" /> Voucher Terpopuler
                    </h3>
                    <div className="space-y-3">
                        {topVouchers.map((tv, i) => {
                            const maxUsed = topVouchers[0]?.used_count || 1;
                            const pct = Math.max(5, (tv.used_count / maxUsed) * 100);
                            return (
                                <div key={i} className="flex items-center gap-3">
                                    <span className="text-xs font-mono text-rose-400 w-24 shrink-0">{tv.code}</span>
                                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-gray-400 w-16 text-right">{tv.used_count}x · {formatRupiah(tv.total_saved)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                    <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Cari kode voucher..."
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none" />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:border-rose-500 focus:outline-none">
                    <option value="">Semua Status</option>
                    <option value="active">Aktif</option>
                    <option value="expired">Kedaluwarsa</option>
                    <option value="disabled">Nonaktif</option>
                </select>
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                    className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:border-rose-500 focus:outline-none">
                    <option value="">Semua Tipe</option>
                    {VOUCHER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <button onClick={fetchAll} className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:border-gray-600 transition-colors">
                    <HiOutlineRefresh />
                </button>
            </div>

            {/* Table */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-800">
                                <th className="text-left px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Kode</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Tipe</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Nilai</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Min. Belanja</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Pemakaian</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Masa Berlaku</th>
                                <th className="text-left px-4 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="text-right px-5 py-3.5 text-xs text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                                        <p className="text-gray-500 text-sm">Memuat data...</p>
                                    </div>
                                </td></tr>
                            ) : vouchers.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-16">
                                    <div className="flex flex-col items-center gap-3">
                                        <HiOutlineTag className="text-5xl text-gray-700" />
                                        <p className="text-gray-500">Belum ada voucher</p>
                                        <button onClick={() => setModal({ mode: "create" })}
                                            className="px-4 py-2 bg-rose-600 rounded-lg text-sm text-white font-medium">
                                            Buat Voucher Pertama
                                        </button>
                                    </div>
                                </td></tr>
                            ) : vouchers.map(v => (
                                <tr key={v.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group">
                                    {/* Code */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-sm font-bold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                                                {v.code}
                                            </span>
                                            {v.free_shipping && <span title="Gratis Ongkir" className="text-sky-400 text-sm">🚚</span>}
                                            {v.individual_use && <span title="Individual Use" className="text-amber-400 text-xs">⚡</span>}
                                        </div>
                                        {v.description && <p className="text-xs text-gray-500 mt-1 max-w-[180px] truncate">{v.description}</p>}
                                    </td>
                                    {/* Type */}
                                    <td className="px-4 py-4">
                                        <span className="text-xs text-gray-400">
                                            {VOUCHER_TYPES.find(t => t.value === v.type)?.label || v.type}
                                        </span>
                                    </td>
                                    {/* Value */}
                                    <td className="px-4 py-4">
                                        <span className="text-sm font-semibold text-white">
                                            {v.type === "percentage" ? `${v.value}%` :
                                                v.type === "shipping" ? "Gratis" :
                                                    formatRupiah(v.value)}
                                        </span>
                                        {v.max_discount > 0 && v.type === "percentage" && (
                                            <p className="text-xs text-gray-500">maks. {formatRupiah(v.max_discount)}</p>
                                        )}
                                    </td>
                                    {/* Min Spend */}
                                    <td className="px-4 py-4 text-sm text-gray-400">
                                        {v.min_spend > 0 ? formatRupiah(v.min_spend) : <span className="text-gray-600">-</span>}
                                    </td>
                                    {/* Usage */}
                                    <td className="px-4 py-4">
                                        <button onClick={() => setUsageDrawer(v)}
                                            className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-rose-400 transition-colors group/usage">
                                            <span className="font-semibold">{v.used_count}</span>
                                            <span className="text-gray-500">/{v.usage_limit_global > 0 ? v.usage_limit_global : "∞"}</span>
                                            <HiOutlineEye className="text-xs opacity-0 group-hover/usage:opacity-100 transition-opacity" />
                                        </button>
                                    </td>
                                    {/* Dates */}
                                    <td className="px-4 py-4">
                                        {v.end_date ? (
                                            <div className="text-xs">
                                                <p className="text-gray-400">{formatDate(v.start_date)} →</p>
                                                <p className={`font-medium ${new Date(v.end_date) < new Date() ? "text-red-400" : "text-gray-300"}`}>
                                                    {formatDate(v.end_date)}
                                                </p>
                                            </div>
                                        ) : <span className="text-xs text-gray-600">Tidak terbatas</span>}
                                    </td>
                                    {/* Status */}
                                    <td className="px-4 py-4">
                                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[v.status] || STATUS_COLORS.disabled}`}>
                                            {STATUS_LABELS[v.status] || v.status}
                                        </span>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-5 py-4">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setUsageDrawer(v)} title="Lihat Pemakaian"
                                                className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors">
                                                <HiOutlineEye className="text-base" />
                                            </button>
                                            <button onClick={() => setModal({ mode: "edit", voucher: v })} title="Edit"
                                                className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors">
                                                <HiOutlinePencil className="text-base" />
                                            </button>
                                            <button onClick={() => handleDuplicate(v)} title="Duplikasi"
                                                className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors">
                                                <HiOutlineDuplicate className="text-base" />
                                            </button>
                                            {v.status === "active" ? (
                                                <button onClick={() => handleDisable(v)} disabled={deleting === v.id} title="Nonaktifkan"
                                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                                                    <HiOutlineXCircle className="text-base" />
                                                </button>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEnable(v)} disabled={deleting === v.id} title="Aktifkan Kembali"
                                                        className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors disabled:opacity-50">
                                                        <HiOutlineCheckCircle className="text-base" />
                                                    </button>
                                                    <button onClick={() => handleDelete(v)} disabled={deleting === v.id} title="Hapus Permanen"
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
                                                        <HiOutlineTrash className="text-base" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
                    <p className="text-xs text-gray-500">{vouchers.length} voucher ditampilkan</p>
                    <p className="text-xs text-gray-600">Klik baris untuk melihat detail pemakaian</p>
                </div>
            </div>

            {/* Modals */}
            {modal && (
                <VoucherFormModal
                    voucher={modal.mode === "edit" ? modal.voucher : null}
                    onClose={() => setModal(null)}
                    onSaved={handleSaved}
                />
            )}
            {usageDrawer && (
                <UsageDrawer voucher={usageDrawer} onClose={() => setUsageDrawer(null)} />
            )}
        </div>
    );
}
