import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { GoogleLogin } from '@react-oauth/google';
import { HiOutlineMail, HiOutlineLockClosed, HiArrowRight, HiOutlineExclamationCircle } from 'react-icons/hi';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.message;
    const { t } = useLanguage();

    // ✅ Read ?next= param to redirect back after login
    const searchParams = new URLSearchParams(location.search);
    const nextPath = searchParams.get('next');

    const getRedirectPath = (role) => {
        // If there's a next param, respect it (unless it would cause a loop)
        if (nextPath && !nextPath.includes('/login')) {
            return nextPath;
        }
        if (role === 'user') return '/dashboard';
        return '/admin'; // All staff/admin roles
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate(getRedirectPath(data.user.role), { replace: true });
            } else {
                if (data.code === 'PENDING_VERIFICATION') {
                    navigate('/register', { state: { email: data.email, step: 2 } });
                }
                setError(data.error || 'Authentication Failed');
            }
        } catch (err) {
            setError('Connection Error. Please check your network.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (response) => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: response.credential }),
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                navigate(getRedirectPath(data.user.role), { replace: true });
            } else {
                setError(data.error || 'Google Sign-In Failed');
            }
        } catch (err) {
            setError('Google Authentication Error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] text-white p-4 relative overflow-hidden font-sans selection:bg-rose-600 selection:text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-[#050505] to-[#050505] opacity-80"></div>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

            <div className="w-full max-w-[400px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {/* Logo Section */}
                <div className="text-center mb-10">
                    <img
                        src="/forza.png"
                        alt="FORZA"
                        className="h-12 mx-auto mb-6 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => navigate('/')}
                    />
                    <h1 className="text-2xl font-bold tracking-tight mb-2">{t('auth.welcomeBack')}</h1>
                    <p className="text-gray-400 text-sm">{t('auth.enterCredentials')}</p>
                </div>

                {/* Notifications */}
                {successMessage && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        {successMessage}
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
                        <HiOutlineExclamationCircle className="text-lg" />
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">{t('auth.email')}</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <HiOutlineMail className="text-gray-500 group-focus-within:text-white transition-colors" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                placeholder={t('auth.emailPlaceholder')}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-1">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{t('auth.password')}</label>
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="text-[11px] text-gray-500 hover:text-white transition-colors font-medium"
                            >
                                {t('auth.forgotPassword')}
                            </button>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <HiOutlineLockClosed className="text-gray-500 group-focus-within:text-white transition-colors" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="block w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? t('auth.validating') : t('auth.signIn')}
                        {!loading && <HiArrowRight className="group-hover:translate-x-0.5 transition-transform" />}
                    </button>
                </form>

                <div className="my-8 flex items-center gap-4">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">{t('auth.orContinueWith')}</span>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <div className="flex justify-center">
                    <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setError('Google Sign-In Failed')}
                        theme="filled_black"
                        shape="circle"
                        width="400"
                    />
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    {t('auth.noAccount')}{' '}
                    <button onClick={() => navigate('/register')} className="text-white hover:underline font-medium decoration-white/30 underline-offset-4">
                        {t('auth.createAccount')}
                    </button>
                </p>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 w-full text-center">
                <p className="text-[10px] text-gray-700 font-medium tracking-widest uppercase">{t('auth.securedBy')}</p>
            </div>
        </div>
    );
};

export default Login;
