import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../context/CurrencyContext';
import { customerService } from '../services/customerService';
import { HiTrendingUp, HiTrendingDown, HiCreditCard, HiClock, HiArrowRight, HiFilter, HiShieldCheck } from 'react-icons/hi';

const Wallet = () => {
    const navigate = useNavigate();
    const { formatPrice, currency, convertPrice } = useCurrency();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, credit, debit

    const fetchWallet = async () => {
        try {
            const data = await customerService.getWalletBalance();
            setBalance(data.balance);
            setTransactions(data.transactions || []);
            setUnpaidInvoices(data.unpaid_invoices || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const filteredTransactions = useMemo(() => {
        if (filter === 'all') return transactions;
        return transactions.filter(tx => tx.type === filter);
    }, [transactions, filter]);

    const handleTopUp = async () => {
        if (!amount || amount <= 0) return;
        try {
            // We only have `convertPrice` which converts IDR -> selected currency (e.g., IDR -> USD).
            // So 1 IDR = X USD. To get IDR from USD, we divide by the same rate.
            // convertPrice(1) returns the rate of the current currency to IDR.
            const currentRate = convertPrice(1);
            const amountInIDR = currency === 'IDR' ? parseFloat(amount) : parseFloat(amount) / currentRate;

            const res = await customerService.topUpWallet(amountInIDR);
            // Redirect to Payment Page (Prismalink Integration)
            navigate(`/payment/${res.invoice_id}`);
        } catch (error) {
            console.error('Top-up error:', error);
            alert(`Top up failed: ${error.response?.data?.error || error.message}`);
        }
    };

    if (loading) {
        return (
            <div className="pt-16 min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
            </div>
        );
    }

    return (
        <div className="pt-16 min-h-screen bg-[#030303] px-6 pb-20">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Forza Wallet</h1>
                        <p className="text-gray-400 text-sm mt-1">Manage your balance and procurement funds</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        Status: Synchronized
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Balance Card */}
                    <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-black border border-white/10 p-8 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:bg-rose-600/10 transition-colors duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <HiShieldCheck className="text-rose-600 w-4 h-4" />
                                <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Verified Account Balance</p>
                            </div>
                            <h2 className="text-6xl font-black text-white tracking-tighter mb-8">
                                {formatPrice(balance)}
                            </h2>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">
                                        {currency === 'IDR' ? 'Rp' : '$'}
                                    </span>
                                    <input
                                        type="number"
                                        step="any"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-white/5 border border-white/10 pl-12 pr-4 py-4 rounded-xl text-white font-bold placeholder-gray-700 focus:outline-none focus:border-rose-600 focus:bg-white/[0.08] transition-all"
                                    />
                                </div>
                                <button
                                    onClick={handleTopUp}
                                    disabled={!amount || amount <= 0}
                                    className="bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:grayscale text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 shadow-xl shadow-rose-900/20 active:scale-95"
                                >
                                    <HiCreditCard className="w-5 h-5" />
                                    Initialize Top Up
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Pending Actions */}
                    <div className="bg-black border border-white/10 rounded-2xl p-6">
                        <h3 className="text-white font-black uppercase tracking-tighter text-sm mb-4 flex items-center gap-2">
                            <HiClock className="text-rose-600" />
                            Pending Top Ups
                        </h3>
                        <div className="space-y-3">
                            {unpaidInvoices.length > 0 ? unpaidInvoices.map(inv => (
                                <div key={inv.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between hover:border-white/20 transition-all cursor-pointer group" onClick={() => navigate(`/payment/${inv.id}`)}>
                                    <div>
                                        <p className="text-white font-bold text-sm">{formatPrice(inv.amount)}</p>
                                        <p className="text-gray-500 text-[10px] font-mono mt-1 uppercase">#{inv.invoice_number}</p>
                                    </div>
                                    <HiArrowRight className="text-gray-600 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
                                </div>
                            )) : (
                                <div className="py-8 text-center bg-white/[0.02] rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">No Active Invoices</p>
                                </div>
                            )}
                        </div>
                        <p className="text-gray-600 text-[9px] font-bold uppercase tracking-widest mt-6 leading-relaxed">
                            Awaiting settlement for active procurement requests. Funds will be credited upon confirmation.
                        </p>
                    </div>
                </div>

                {/* Transactions Table Section */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Recent Transactions</h3>

                        {/* Filters */}
                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                            {[
                                { id: 'all', label: 'All Activity' },
                                { id: 'credit', label: 'Credits' },
                                { id: 'debit', label: 'Debits' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setFilter(btn.id)}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === btn.id ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40' : 'text-gray-500 hover:text-white'}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-zinc-900/30 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 border-b border-white/10">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Transaction</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Details</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Timestamp</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Reference</th>
                                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredTransactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-white/[0.03] transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tx.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                        {tx.type === 'credit' ? <HiTrendingUp /> : <HiTrendingDown />}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${tx.type === 'credit' ? 'text-green-500' : 'text-rose-500'}`}>
                                                        {tx.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="text-white text-sm font-bold group-hover:text-rose-500 transition-colors">{tx.description}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-gray-600 text-[9px] font-bold uppercase tracking-widest">Balance After:</span>
                                                    <span className="text-gray-400 text-[10px] font-mono">{formatPrice(tx.balance_after)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="text-gray-300 text-xs font-medium">
                                                    {new Date(tx.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-gray-600 text-[10px] mt-0.5">
                                                    {new Date(tx.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-gray-500 text-[10px] font-mono uppercase bg-white/5 px-2 py-1 rounded border border-white/5">
                                                    {tx.reference_id || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <p className={`text-base font-black tracking-tight ${tx.type === 'credit' ? 'text-green-400' : 'text-white'}`}>
                                                    {tx.type === 'credit' ? '+' : '-'}{formatPrice(tx.amount)}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <HiFilter className="w-8 h-8 text-gray-800" />
                                                    <p className="text-gray-600 text-sm font-bold uppercase tracking-widest">No activity found for this filter</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet;
