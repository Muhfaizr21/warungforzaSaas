import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import {
    HiOutlineCurrencyDollar,
    HiOutlineTrendingUp,
    HiOutlineTrendingDown,
    HiOutlineDocumentText,
    HiOutlineCreditCard,
    HiOutlinePlus,
    HiOutlineX,
    HiOutlineRefresh,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineReceiptTax,
    HiChevronRight,
    HiChevronDown,
} from 'react-icons/hi';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { usePermission } from '../../hooks/usePermission';
import ConfirmationModal from '../../components/ConfirmationModal';
import AlertModal from '../../components/AlertModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { HiOutlineDocumentDownload } from 'react-icons/hi';

const ExpenseModal = React.memo(({ show, coas, onCancel, onSubmit, editData = null }) => {
    const [localForm, setLocalForm] = useState({
        coa_id: '',
        amount: '',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        if (editData) {
            setLocalForm({
                coa_id: editData.coa_id || '',
                amount: editData.amount || '',
                description: editData.description || '',
                vendor: editData.vendor || '',
                date: editData.date ? new Date(editData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
        } else {
            setLocalForm({
                coa_id: '',
                amount: '',
                description: '',
                vendor: '',
                date: new Date().toISOString().split('T')[0]
            });
        }
    }, [editData, show]);

    if (!show) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            ...localForm,
            coa_id: parseInt(localForm.coa_id),
            amount: parseFloat(localForm.amount)
        };
        onSubmit(payload);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
            <div className="glass-card rounded-3xl w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-xl tracking-tight">
                            {editData ? 'Koreksi Pengeluaran' : 'Catat Pengeluaran'}
                        </h3>
                        <p className="text-gray-500 text-xs mt-1">Data akan otomatis masuk ke jurnal ledger</p>
                    </div>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:text-white transition-colors">
                        <HiOutlineX className="w-6 h-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Tanggal</label>
                            <input
                                type="date"
                                value={localForm.date}
                                onChange={(e) => setLocalForm({ ...localForm, date: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Nominal (IDR)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">Rp</span>
                                <input
                                    type="text"
                                    value={localForm.amount ? parseInt(localForm.amount).toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setLocalForm({ ...localForm, amount: val ? parseInt(val) : '' });
                                    }}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 shadow-inner font-mono tracking-wide"
                                    placeholder="0"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Akun Biaya (COA)</label>
                        <select
                            value={localForm.coa_id}
                            onChange={(e) => setLocalForm({ ...localForm, coa_id: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none transition-all"
                            required
                        >
                            <option value="" className="bg-slate-900 text-gray-400">Pilih akun target...</option>
                            {coas.filter(c => {
                                const type = c.type?.toUpperCase();
                                return type === 'EXPENSE' || type === 'COGS';
                            }).map(coa => (
                                <option key={coa.id} value={coa.id} className="bg-slate-900">{coa.code} - {coa.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px} uppercase font-black tracking-widest">Vendor / Penerima</label>
                        <input
                            type="text"
                            value={localForm.vendor}
                            onChange={(e) => setLocalForm({ ...localForm, vendor: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
                            placeholder="Contoh: Tokopedia, PLN, Gaji Staff"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-gray-500 text-[10px] uppercase font-black tracking-widest">Keterangan / Memo</label>
                        <textarea
                            value={localForm.description}
                            onChange={(e) => setLocalForm({ ...localForm, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white h-24 focus:outline-none focus:border-blue-500/50 shadow-inner resize-none"
                            placeholder="Narasi transaksi..."
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className={`w-full ${editData ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white py-4 rounded-2xl font-bold transition-all shadow-xl mt-4`}
                    >
                        {editData ? 'Update Transaksi' : 'Eksekusi Entri'}
                    </button>
                </form>
            </div>
        </div>
    );
});

const StatCard = React.memo(({ icon: Icon, label, value, trend, color, subValue }) => (
    <div className="glass-card p-6 rounded-3xl border border-white/5 hover:border-white/10 transition-all group">
        <div className="flex justify-between items-start">
            <div className={`p-4 rounded-2xl ${color} bg-opacity-10 group-hover:bg-opacity-20 transition-all`}>
                <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
            </div>
            {trend && (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${trend === 'up' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {trend === 'up' ? <HiOutlineTrendingUp className="w-3 h-3" /> : <HiOutlineTrendingDown className="w-3 h-3" />}
                    10%
                </div>
            )}
        </div>
        <div className="mt-6">
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em]">{label}</p>
            <h3 className="text-2xl font-bold text-white mt-2 tabular-nums tracking-tight tracking-[-0.03em] whitespace-nowrap overflow-hidden text-ellipsis">
                {value}
            </h3>
            {subValue && <p className="text-gray-500 text-[10px] mt-1 italic">{subValue}</p>}
        </div>
    </div>
));

const FinanceDashboard = () => {
    const { hasPermission } = usePermission();
    const [stats, setStats] = useState({
        total_revenue: 0,
        total_expense: 0,
        net_profit: 0,
        pending_payments: 0,
        total_cogs: 0,
        recent_expenses: 0
    });
    const [journals, setJournals] = useState([]);
    const [coas, setCoas] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [editMode, setEditMode] = useState(null);
    const [confirmConfig, setConfirmConfig] = useState({ show: false, title: '', message: '', onConfirm: null });
    const [alertConfig, setAlertConfig] = useState({ show: false, title: '', message: '', type: 'info' });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, journalsRes, coasRes, expensesRes, trendRes] = await Promise.all([
                adminService.getFinanceStats({ period }),
                adminService.getJournals({ limit: 10, period }),
                adminService.getCOAs(),
                adminService.getExpenses({ limit: 20, period }),
                adminService.getCashFlowTrend({ period })
            ]);
            setStats(statsRes || statsRes.data || {});
            setJournals(journalsRes.data || []);
            setCoas(coasRes.data || []);
            setExpenses(expensesRes.data || []);
            setRevenueData(trendRes || []);
        } catch (error) {
            console.error('Failed to load finance data', error);
        } finally {
            setLoading(false);
        }
    }, [period]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddOrEditExpense = useCallback(async (formData) => {
        try {
            if (editMode) {
                await adminService.updateExpense(editMode.id, formData);
            } else {
                await adminService.createExpense(formData);
            }
            setShowExpenseModal(false);
            setEditMode(null);
            loadData();
        } catch (error) {
            const errorData = error.response?.data;
            const message = errorData?.details
                ? `${errorData.error}: ${errorData.details} (User ID: ${errorData.userID || 'N/A'})`
                : (errorData?.error || error.message);
            setAlertConfig({ show: true, title: 'Operasi Gagal', message: message, type: 'error' });
        }
    }, [editMode, loadData]);

    const handleDeleteExpense = useCallback(async (id) => {
        setConfirmConfig({
            show: true,
            title: 'Hapus Transaksi',
            message: 'Hapus transaksi ini? Jurnal akan otomatis dibatalkan (reversal).',
            onConfirm: async () => {
                try {
                    await adminService.deleteExpense(id);
                    loadData();
                } catch (error) {
                    setAlertConfig({ show: true, title: 'Gagal', message: error.response?.data?.error || error.message, type: 'error' });
                }
            }
        });
    }, [loadData]);

    const pieData = useMemo(() => {
        if (!stats.expense_breakdown || stats.expense_breakdown.length === 0) return [];
        const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

        return stats.expense_breakdown.map((item, i) => ({
            name: item.name,
            value: item.value,
            color: COLORS[i % COLORS.length]
        }));
    }, [stats.expense_breakdown]);

    const openExpenseModal = useCallback(() => { setEditMode(null); setShowExpenseModal(true); }, []);
    const closeExpenseModal = useCallback(() => { setShowExpenseModal(false); setEditMode(null); }, []);

    const handleExportPDF = useCallback(() => {
        const doc = new jsPDF();
        const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        // --- Header Premium Design ---
        doc.setFillColor(15, 23, 42); // Navy Deep
        doc.rect(0, 0, 210, 45, 'F');

        // Logo Text
        doc.setTextColor(225, 29, 72); // Rose-600
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('FORZA', 15, 25);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.text('SHOP', 52, 25);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // Slate-400
        doc.text('Executive Financial Statement', 15, 34);

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text('Warung Forza Indonesia', 155, 20, { align: 'right' });
        doc.text('Jakarta, Indonesia', 155, 25, { align: 'right' });
        doc.text(`Generated: ${dateStr}`, 155, 30, { align: 'right' });

        // --- Stat Cards / Summary ---
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('ACCOUNT SUMMARY', 15, 65);

        doc.setDrawColor(225, 29, 72);
        doc.setLineWidth(1);
        doc.line(15, 68, 35, 68);

        const summaryData = [
            ['INDICATOR', 'TOTAL VALUE', 'STATUS'],
            ['Total Gross Revenue', `Rp ${stats.total_revenue.toLocaleString()}`, 'ACTIVE'],
            ['Total Operating Expenses', `Rp ${stats.total_expense.toLocaleString()}`, 'PAID'],
            ['Business Net Profit', `Rp ${stats.net_profit.toLocaleString()}`, 'VERIFIED'],
            ['Pending Receivables', `Rp ${stats.pending_payments.toLocaleString()}`, 'PENDING']
        ];

        autoTable(doc, {
            body: summaryData.slice(1),
            head: [summaryData[0]],
            startY: 75,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
            styles: { fontSize: 10, cellPadding: 6 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
                2: { halign: 'center', textColor: [100, 116, 139] }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        // --- Recent Expenses Table ---
        doc.setFontSize(14);
        doc.setTextColor(15, 23, 42);

        let nextY = doc.lastAutoTable.finalY + 15;
        if (nextY > 240) {
            doc.addPage();
            nextY = 20;
        }

        doc.text('OPERATIONAL EXPENSES LOG', 15, nextY);

        const expenseTableData = expenses.slice(0, 15).map(exp => [
            new Date(exp.date).toLocaleDateString('id-ID'),
            exp.vendor || 'General',
            exp.coa?.name || 'Uncategorized',
            exp.description,
            `Rp ${exp.amount.toLocaleString()}`
        ]);

        autoTable(doc, {
            head: [['DATE', 'VENDOR / PAYEE', 'CATEGORY', 'MEMO', 'AMOUNT']],
            body: expenseTableData,
            startY: nextY + 5,
            theme: 'grid',
            headStyles: { fillColor: [225, 29, 72], textColor: [255, 255, 255], fontSize: 8 },
            styles: { fontSize: 8, cellPadding: 4 },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });

        // --- Ledger Journal Table ---
        nextY = doc.lastAutoTable.finalY + 15;
        if (nextY > 240) {
            doc.addPage();
            nextY = 20;
        }

        doc.setFontSize(14);
        doc.text('GENERAL LEDGER JOURNALS', 15, nextY);

        const journalTableData = journals.slice(0, 15).map(j => [
            j.reference_id || 'AUTO',
            new Date(j.created_at).toLocaleDateString('id-ID'),
            j.description || 'System Entry',
            `Rp ${(j.items?.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0) || 0).toLocaleString()}`
        ]);

        autoTable(doc, {
            head: [['REFERENCE ID', 'POSTING DATE', 'DESCRIPTION / NARRATION', 'DEBIT TOTAL']],
            body: journalTableData,
            startY: nextY + 5,
            theme: 'plain',
            headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 3 },
            columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
        });

        // --- Final Footer and Security Notice ---
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
            doc.setDrawColor(226, 232, 240);
            doc.line(15, 282, 195, 282);
            doc.text('Warung Forza Shop - Financial Integrity Protection (FIP)', 15, 287);
            doc.text('CONFIDENTIAL DOCUMENT', 195, 287, { align: 'right' });
        }

        doc.save(`Forza_Financial_Report_${new Date().getTime()}.pdf`);
    }, [stats, expenses, journals]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="w-12 h-12 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">Sinkronisasi Data Keuangan...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 h-full pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Dasbor Keuangan</h2>
                    <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mt-1 italic">Pantau arus kas, laba rugi, dan rekaman jurnal Ledger</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm text-gray-300 outline-none focus:border-blue-500 transition-all cursor-pointer"
                    >
                        <option value="all" className="bg-slate-900">Semua Waktu</option>
                        <option value="1m" className="bg-slate-900">1 Bulan Terakhir</option>
                        <option value="6m" className="bg-slate-900">6 Bulan Terakhir</option>
                        <option value="1y" className="bg-slate-900">1 Tahun Terakhir</option>
                    </select>
                    <button onClick={loadData} className="p-4 glass-card rounded-2xl text-gray-400 hover:text-white transition-all shadow-sm">
                        <HiOutlineRefresh className="w-5 h-5" />
                    </button>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-6 py-4 rounded-2xl font-bold text-sm transition-all"
                    >
                        <HiOutlineDocumentDownload className="w-5 h-5" />
                        Cetak Laporan
                    </button>
                    {hasPermission('finance.manage') && (
                        <button
                            onClick={openExpenseModal}
                            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
                        >
                            <HiOutlinePlus className="w-5 h-5 font-black" />
                            Catat Biaya Baru
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={HiOutlineTrendingUp} label="Pendapatan Kotor" value={`Rp ${(stats.total_revenue || 0).toLocaleString()}`} trend="up" color="bg-emerald-500" subValue="Total sales dari semua channel" />
                <StatCard icon={HiOutlineTrendingDown} label="Total Pengeluaran" value={`Rp ${(stats.total_expense || 0).toLocaleString()}`} trend="down" color="bg-rose-500" subValue={`HPP/COGS: Rp ${stats.total_cogs?.toLocaleString()}`} />
                <StatCard icon={HiOutlineCurrencyDollar} label="Laba Bersih" value={`Rp ${(stats.net_profit || 0).toLocaleString()}`} trend="up" color="bg-blue-500" subValue="Setelah dikurangi HPP & Biaya" />
                <StatCard icon={HiOutlineCreditCard} label="Piutang Aktif" value={`Rp ${(stats.pending_payments || 0).toLocaleString()}`} color="bg-orange-500" subValue="Tagihan pesanan yang belum lunas" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card p-8 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-center mb-10">
                        <div>
                            <h3 className="text-lg font-bold text-white tracking-tight">Tren Arus Kas</h3>
                            <p className="text-gray-500 text-xs mt-1">Pendapatan vs Biaya (6 Bulan Terakhir)</p>
                        </div>
                        <div className="flex gap-4">
                            <span className="flex items-center gap-2 text-[10px] text-emerald-400 font-black uppercase tracking-wider"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> Penjualan</span>
                            <span className="flex items-center gap-2 text-[10px] text-rose-400 font-black uppercase tracking-wider"><div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div> Biaya</span>
                        </div>
                    </div>
                    <div className="h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#4b5563" fontSize={11} axisLine={false} tickLine={false} tick={{ dy: 10 }} />
                                <YAxis stroke="#4b5563" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(val) => `Rp${val / 1000}k`} />
                                <Tooltip
                                    cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 20 }}
                                    contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
                                    itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                                    labelStyle={{ color: '#6b7280', marginBottom: '8px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                                <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={4} fillOpacity={1} fill="url(#colorExp)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-8 rounded-[2rem] border border-white/5 flex flex-col">
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Alokasi Biaya</h3>
                        <p className="text-gray-500 text-xs mt-1">Distribusi pengeluaran saat ini</p>
                    </div>
                    <div className="h-[220px] my-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={95} paddingAngle={8} dataKey="value" stroke="none">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0B0F1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 flex-grow overflow-y-auto pr-2 custom-scrollbar">
                        {pieData.map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}80` }}></div>
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-wider">{item.name}</span>
                                </div>
                                <span className="text-white font-bold text-xs tabular-nums">Rp {item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/5">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Daftar Pengeluaran Terkini</h3>
                        <p className="text-gray-500 text-xs mt-1">Kelola dan koreksi data operasional</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl text-gray-400 text-[10px] font-black uppercase tracking-widest">
                            <HiOutlineReceiptTax className="w-4 h-4 text-emerald-400" />
                            {expenses.length} Catatan
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-[0.2em] text-gray-500">
                            <tr>
                                <th className="text-left p-6">Tanggal & Vendor</th>
                                <th className="text-left p-6">Akun Biaya</th>
                                <th className="text-left p-6">Deskripsi</th>
                                <th className="text-right p-6">Nominal</th>
                                <th className="text-center p-6">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {expenses.map((exp) => (
                                <tr key={exp.id} className="hover:bg-white/[0.03] transition-colors group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="text-blue-400 font-mono text-[10px] uppercase">{new Date(exp.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            <span className="text-white font-bold text-sm mt-1">{exp.vendor || 'Umum'}</span>
                                        </div>
                                    </td>
                                    <td className="p-6">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-gray-400 text-[10px] font-black uppercase tracking-widest">
                                            {exp.coa?.name || 'Tanpa Kategori'}
                                        </span>
                                    </td>
                                    <td className="p-6">
                                        <p className="text-gray-400 italic text-xs max-w-[300px] truncate">{exp.description}</p>
                                    </td>
                                    <td className="p-6 text-right">
                                        <span className="text-white font-black text-base tabular-nums tracking-tighter">
                                            Rp {exp.amount?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="p-6 text-center">
                                        {hasPermission('finance.manage') ? (
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => { setEditMode(exp); setShowExpenseModal(true); }} className="p-2 bg-white/5 hover:bg-blue-500/20 text-gray-400 hover:text-blue-400 rounded-lg transition-all"><HiOutlinePencil className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteExpense(exp.id)} className="p-2 bg-white/5 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 rounded-lg transition-all"><HiOutlineTrash className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-700 font-bold uppercase">Locked</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="glass-card rounded-[2rem] overflow-hidden border border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                        <HiOutlineDocumentText className="text-blue-400 w-5 h-5" />
                        Riwayat Jurnal Ledger
                    </h3>
                    <span className="text-[10px] text-gray-500 font-black tracking-widest uppercase">Audit Sistem</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-500">
                            <tr>
                                <th className="text-left p-4">Ref & Tanggal</th>
                                <th className="text-left p-4">Detail Narasi</th>
                                <th className="text-right p-4">Debit (Nilai)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                            {journals.map((j) => (
                                <tr key={j.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="text-gray-500 text-[9px] font-mono uppercase tracking-tighter">{j.reference_id || 'AUTO'}</span>
                                            <span className="text-gray-400 text-[10px] mt-0.5">{new Date(j.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-white font-medium italic normal-case truncate max-w-[200px]">{j.description || 'Rekaman transaksi'}</td>
                                    <td className="p-4 text-right text-emerald-400 font-bold tabular-nums">
                                        Rp {(j.items?.reduce((sum, item) => sum + (parseFloat(item.debit) || 0), 0) || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <ExpenseModal
                show={showExpenseModal}
                coas={coas}
                onCancel={closeExpenseModal}
                onSubmit={handleAddOrEditExpense}
                editData={editMode}
            />

            <ConfirmationModal
                show={confirmConfig.show}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={() => {
                    confirmConfig.onConfirm();
                    setConfirmConfig({ ...confirmConfig, show: false });
                }}
                onCancel={() => setConfirmConfig({ ...confirmConfig, show: false })}
            />

            <AlertModal
                show={alertConfig.show}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onClose={() => setAlertConfig({ ...alertConfig, show: false })}
            />
        </div>
    );
};

export default FinanceDashboard;
