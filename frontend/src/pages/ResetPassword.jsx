import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { HiOutlineLockClosed, HiCheck, HiOutlineExclamationCircle, HiCheckCircle, HiArrowLeft, HiOutlineKey } from 'react-icons/hi';

const ResetPassword = () => {
    const [code, setCode] = useState('');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, new_password: newPassword }),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccess('Password reset successfully. Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                setError(data.error || 'Failed to update credentials.');
            }
        } catch (err) {
            setError('Connection failure.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-4 relative overflow-hidden font-sans selection:bg-rose-600 selection:text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-[#050505] opacity-80"></div>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="w-full max-w-[440px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* Header */}
                <div className="text-center mb-10">
                    <img
                        src="/forza.png"
                        alt="FORZA"
                        className="h-12 mx-auto mb-6 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/')}
                    />
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Reset password</h1>
                    <p className="text-gray-400 text-sm">Choose a new password for your account.</p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <HiOutlineExclamationCircle className="text-lg" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <HiCheckCircle className="text-lg" />
                        {success}
                    </div>
                )}

                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="block w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Verification Code</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <HiOutlineKey className="text-gray-500 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm font-mono placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white tracking-widest"
                                    placeholder="XXXXXX"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">New Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <HiOutlineLockClosed className="text-gray-500 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                    placeholder="Mind 6 chars"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Confirm Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <HiOutlineLockClosed className="text-gray-500 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                    placeholder="Repeat password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Resetting password...' : 'Reset Password'}
                        </button>
                    </form>
                </div>

                <div className="mt-8 text-center bg-white/5 rounded-xl py-3 border border-white/5 mx-auto w-full max-w-[200px]">
                    <button
                        onClick={() => navigate('/login')}
                        className="text-xs text-gray-400 hover:text-white font-medium flex items-center justify-center gap-2 w-full transition-colors"
                    >
                        <HiArrowLeft /> Back to login
                    </button>
                </div>

                <div className="mt-8 w-full text-center">
                    <p className="text-[10px] text-gray-700 font-medium tracking-widest uppercase">Secured by Forza Systems</p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
