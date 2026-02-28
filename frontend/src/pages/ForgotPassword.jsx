import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { HiOutlineMail, HiArrowLeft, HiOutlineExclamationCircle, HiCheckCircle } from 'react-icons/hi';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Verification code sent. Check your email (including spam).');
                setTimeout(() => {
                    navigate('/reset-password', { state: { email } });
                }, 2000);
            } else {
                setError(data.error || 'Failed to send reset code.');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
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
                    <h1 className="text-2xl font-bold tracking-tight mb-2">Forgot password?</h1>
                    <p className="text-gray-400 text-sm">No worries, we'll send you reset instructions.</p>
                </div>

                {/* Notifications */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <HiOutlineExclamationCircle className="text-lg" />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <HiCheckCircle className="text-lg" />
                        {message}
                    </div>
                )}

                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <HiOutlineMail className="text-gray-500 group-focus-within:text-white transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                    placeholder="name@example.com"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                        >
                            {loading ? 'Sending instruction...' : 'Send Reset Link'}
                        </button>
                    </form>

                    <div className="mt-8 text-center bg-white/5 rounded-xl py-3 border border-white/5">
                        <button
                            onClick={() => navigate('/login')}
                            className="text-xs text-gray-400 hover:text-white font-medium flex items-center justify-center gap-2 mx-auto transition-colors"
                        >
                            <HiArrowLeft /> Back to login
                        </button>
                    </div>
                </div>

                <div className="mt-8 w-full text-center">
                    <p className="text-[10px] text-gray-700 font-medium tracking-widest uppercase">Secured by Forza Systems</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
