import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { GoogleLogin } from '@react-oauth/google';
import { HiOutlineUser, HiOutlineMail, HiOutlineLockClosed, HiArrowRight, HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlinePhone } from 'react-icons/hi';
import { useCountries } from '../hooks/useCountries';
import SearchableSelect from '../components/SearchableSelect';

const Register = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { countries } = useCountries();
    const [step, setStep] = useState(location.state?.step || 1); // 1: Register, 2: Verify
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [phone, setPhone] = useState('');
    const [countryCode, setCountryCode] = useState('+62');
    const [email, setEmail] = useState(location.state?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // Auto-generate username from email if empty, or just use email as username base
            const finalUsername = username || email.split('@')[0] + Math.floor(Math.random() * 1000);
            const finalPhone = countryCode + phone.replace(/^0+/, ''); // Remove leading zeros if any

            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: finalUsername,
                    email,
                    password,
                    full_name: fullName,
                    phone: finalPhone
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setStep(2);
            } else {
                setError(data.error || 'Registration Failed');
            }
        } catch (err) {
            setError('Connection failed. Please try again.');
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

                if (['super_admin', 'product_admin', 'fulfillment_admin', 'admin'].includes(data.user.role)) {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } else {
                setError(data.error || 'Google Sign-Up Failed');
            }
        } catch (err) {
            setError('Google Authentication Error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-registration`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp }),
            });
            const data = await response.json();
            if (response.ok) {
                navigate('/login', { state: { message: 'Account verified successfully. Please sign in.' } });
            } else {
                setError(data.error || 'Invalid verification code');
            }
        } catch (err) {
            setError('Verification failed. Please try again.');
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
                    <h1 className="text-2xl font-bold tracking-tight mb-2">
                        {step === 1 ? 'Create an account' : 'Verify your email'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {step === 1 ? 'Start your journey with Forza Shop' : `We sent a 6-digit code to ${email}`}
                    </p>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                        <HiOutlineExclamationCircle className="text-lg" />
                        {error}
                    </div>
                )}

                <div className="bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl">
                    {step === 1 ? (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HiOutlineUser className="text-gray-500 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Username</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HiOutlineUser className="text-gray-500 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                            placeholder="johndoe123"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number (Global)</label>
                                <div className="flex gap-2">
                                    <div className="w-[120px] relative group">
                                        <SearchableSelect
                                            options={countries.filter(c => c.dialCode).map(c => ({
                                                value: c.dialCode,
                                                label: `${c.code} ${c.dialCode}`,
                                                flag: c.flag
                                            }))}
                                            value={countryCode}
                                            onChange={(opt) => setCountryCode(opt.value)}
                                            placeholder="+62"
                                        />
                                    </div>
                                    <div className="flex-1 relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HiOutlinePhone className="text-gray-500 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                            placeholder="8123456XXXX"
                                        />
                                    </div>
                                </div>
                            </div>

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
                                        className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                        placeholder="name@example.com"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HiOutlineLockClosed className="text-gray-500 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Confirm</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <HiOutlineLockClosed className="text-gray-500 group-focus-within:text-white transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm placeholder:text-gray-600 focus:border-white/30 focus:bg-white/10 focus:ring-0 outline-none transition-all text-white font-medium"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-black hover:bg-gray-100 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                            >
                                {loading ? 'Creating account...' : 'Create Account'}
                                {!loading && <HiArrowRight className="group-hover:translate-x-0.5 transition-transform" />}
                            </button>

                            <div className="mt-8">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-px flex-1 bg-white/10"></div>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Or sign up with</span>
                                    <div className="h-px flex-1 bg-white/10"></div>
                                </div>
                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => setError('Google Sign-Up Failed')}
                                        theme="filled_black"
                                        shape="circle"
                                        width="300"
                                    />
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
                                    <HiOutlineCheckCircle className="w-8 h-8 text-blue-400" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[11px] text-center block text-gray-400 font-bold uppercase tracking-wider">Enter Confirmation Code</label>
                                <div className="flex justify-center">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                        required
                                        autoFocus
                                        className="w-full text-center py-5 bg-white/5 border border-white/10 rounded-2xl text-3xl font-bold tracking-[0.5em] text-white focus:border-blue-500/50 focus:bg-white/10 outline-none transition-all"
                                        placeholder="······"
                                    />
                                </div>
                                <p className="text-center text-xs text-gray-500">
                                    Check your spam folder if you don't see the email.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white hover:bg-blue-500 py-3.5 rounded-xl font-bold text-sm tracking-wide transition-all"
                                >
                                    {loading ? 'Verifying...' : 'Verify Email'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-gray-500 hover:text-white transition-colors font-medium py-2"
                                >
                                    Change email address
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    Already have an account?{' '}
                    <button onClick={() => navigate('/login')} className="text-white hover:underline font-medium decoration-white/30 underline-offset-4">
                        Sign in
                    </button>
                </p>

                {/* Footer */}
                <div className="mt-8 w-full text-center">
                    <p className="text-[10px] text-gray-700 font-medium tracking-widest uppercase">Secured by Forza Systems</p>
                </div>
            </div>
        </div>
    );
};

export default Register;
