import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../services/customerService';
import {
    HiOutlineUser,
    HiOutlinePhone,
    HiOutlineLocationMarker,
    HiOutlineCheckCircle,
    HiOutlineArrowLeft,
    HiOutlineSave,
    HiOutlineMail,
    HiOutlineBell,
    HiOutlineNewspaper,
    HiOutlineExclamation
} from 'react-icons/hi';

import { useCountries } from '../hooks/useCountries';
import SearchableSelect from '../components/SearchableSelect';
import { useLanguage } from '../context/LanguageContext';

const InputField = ({ label, icon: Icon, ...props }) => (
    <div className="space-y-2">
        <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
            {Icon && <Icon className="w-3.5 h-3.5 text-gray-600" />}
            {label}
        </label>
        <input
            {...props}
            className="w-full bg-white/5 border border-white/8 focus:border-rose-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3 text-white text-sm transition-all outline-none placeholder:text-gray-700"
        />
    </div>
);

const ProfilePage = () => {
    const { countries, loading: countriesLoading } = useCountries();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const { t } = useLanguage();
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        address: '',
        street: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        email: '',
        username: '',
        newsletter_sub: false,
        restock_notify: true
    });

    useEffect(() => {
        if (!countriesLoading) {
            loadProfile();
        }
    }, [countriesLoading]);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const res = await customerService.getProfile();
            const { user, profile } = res;

            let parsedAddress = { main: '', street: '', city: '', state: '', postal_code: '', country: '' };
            try {
                if (profile.address) {
                    const addr = typeof profile.address === 'string' ? JSON.parse(profile.address) : profile.address;
                    parsedAddress = {
                        main: addr.main || '',
                        street: addr.street || '',
                        city: addr.city || '',
                        state: addr.state || '',
                        postal_code: addr.postal_code || '',
                        country: addr.country || ''
                    };
                }
            } catch (e) {
                console.error("Failed to parse address", e);
            }

            let detectedCode = '+62';
            let detectedPhone = user.phone || '';
            const existingCodes = ['+62', '+1', '+44', '+60', '+65', '+61', '+81', '+82', '+86', '+49', '+33'];
            let found = false;
            if (countries.length > 0) {
                for (const c of countries) {
                    if (c.dialCode && detectedPhone.startsWith(c.dialCode)) {
                        detectedCode = c.dialCode;
                        detectedPhone = detectedPhone.replace(c.dialCode, '');
                        found = true;
                        break;
                    }
                }
            }

            if (!found) {
                for (const code of existingCodes) {
                    if (detectedPhone.startsWith(code)) {
                        detectedCode = code;
                        detectedPhone = detectedPhone.replace(code, '');
                        break;
                    }
                }
            }

            setFormData({
                full_name: user.full_name || '',
                phone: detectedPhone,
                country_code: detectedCode,
                address: parsedAddress.main,
                street: parsedAddress.street,
                city: parsedAddress.city,
                state: parsedAddress.state,
                postal_code: parsedAddress.postal_code,
                country: parsedAddress.country,
                email: user.email || '',
                username: user.username || '',
                newsletter_sub: profile.newsletter_sub || false,
                restock_notify: profile.restock_notify !== false
            });
        } catch (error) {
            console.error('Failed to load profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const finalPhone = formData.country_code + formData.phone.replace(/^0+/, '');

            await customerService.updateProfile({
                full_name: formData.full_name,
                phone: finalPhone,
                address: formData.address,
                street: formData.street,
                city: formData.city,
                state: formData.state,
                postal_code: formData.postal_code,
                country: formData.country,
                newsletter_sub: formData.newsletter_sub,
                restock_notify: formData.restock_notify
            });

            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, full_name: formData.full_name, phone: finalPhone };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            setMessage({ type: 'success', text: 'Profile successfully updated!' });
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            const errorMsg = error.response?.data?.error || 'Failed to save profile. Please try again.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setSaving(false);
        }
    };

    if (loading || countriesLoading) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm">{t('dashboard.synchronizing')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#030303] min-h-screen pt-20 pb-24">
            <div className="container max-w-3xl mx-auto px-4">

                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 text-gray-500 hover:text-white mb-8 transition-colors text-sm font-medium uppercase tracking-widest text-xs"
                >
                    <HiOutlineArrowLeft className="w-4 h-4" />
                    <span>Return to Dashboard</span>
                </button>

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-white mb-1 uppercase tracking-widest">{t('profile.title')}</h1>
                    <p className="text-gray-500 text-sm font-medium">{t('profile.subtitle')}</p>
                </div>

                {/* Alert Message */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-fadeIn ${message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                        {message.type === 'success'
                            ? <HiOutlineCheckCircle className="w-5 h-5 flex-shrink-0" />
                            : <HiOutlineExclamation className="w-5 h-5 flex-shrink-0" />
                        }
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Account Info Card */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                            <HiOutlineUser className="w-5 h-5 text-gray-400" />
                            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Account Credentials</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Username (read-only) */}
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
                                        <HiOutlineUser className="w-3.5 h-3.5 text-gray-600" />
                                        {t('profile.username')}
                                    </label>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm">
                                        @{formData.username}
                                    </div>
                                </div>

                                {/* Email (read-only) */}
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
                                        <HiOutlineMail className="w-3.5 h-3.5 text-gray-600" />
                                        {t('profile.email')}
                                    </label>
                                    <div className="bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm truncate">
                                        {formData.email}
                                    </div>
                                </div>
                            </div>

                            {/* Full Name */}
                            <InputField
                                label={t('profile.fullName')}
                                icon={HiOutlineUser}
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder={t('profile.fullName')}
                            />

                            {/* Phone */}
                            <div className="space-y-2">
                                <label className="text-gray-400 text-xs font-medium flex items-center gap-2">
                                    <HiOutlinePhone className="w-3.5 h-3.5 text-gray-600" />
                                    {t('profile.phone')}
                                </label>
                                <div className="flex gap-3">
                                    <SearchableSelect
                                        options={countries.filter(c => c.dialCode).map(c => ({
                                            value: c.dialCode,
                                            label: `${c.code} ${c.dialCode}`,
                                            flag: c.flag
                                        }))}
                                        value={formData.country_code || '+62'}
                                        onChange={(opt) => setFormData({ ...formData, country_code: opt.value })}
                                        className="w-[120px]"
                                        placeholder="+62"
                                    />
                                    <input
                                        type="text"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                                        className="flex-grow bg-white/5 border border-white/8 focus:border-rose-500/50 focus:bg-white/[0.07] rounded-xl px-4 py-3 text-white text-sm transition-all outline-none placeholder:text-gray-700"
                                        placeholder="8123456789"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Address Card */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                            <HiOutlineLocationMarker className="w-5 h-5 text-gray-400" />
                            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Shipping Destination</h3>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Country */}
                                <div className="space-y-2">
                                    <label className="text-gray-400 text-xs font-medium">{t('profile.country')}</label>
                                    <SearchableSelect
                                        options={countries.map(c => ({
                                            value: c.code,
                                            label: c.name,
                                            flag: c.flag
                                        }))}
                                        value={formData.country || 'ID'}
                                        onChange={(opt) => setFormData({ ...formData, country: opt.value })}
                                        placeholder="Select Destination..."
                                    />
                                </div>

                                {/* Province */}
                                <InputField
                                    label={t('profile.state')}
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    placeholder="e.g., California"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* City */}
                                <InputField
                                    label={t('profile.city')}
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    placeholder="e.g., Los Angeles"
                                />

                                {/* Postal Code */}
                                <InputField
                                    label={t('profile.postalCode')}
                                    type="text"
                                    value={formData.postal_code}
                                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                                    placeholder="e.g., 90001"
                                />
                            </div>

                            {/* Street */}
                            <InputField
                                label={t('profile.street')}
                                type="text"
                                value={formData.street}
                                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                                placeholder="e.g., 123 Main St, Apt 4B"
                            />

                            {/* Additional Address */}
                            <InputField
                                label="Additional Details (optional)"
                                type="text"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Landmark, floor, building, etc."
                            />
                        </div>
                    </div>

                    {/* Preferences Card */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                            <HiOutlineBell className="w-5 h-5 text-gray-400" />
                            <h3 className="text-white font-semibold text-sm uppercase tracking-wide">Transmission Preferences</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Newsletter Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                        <HiOutlineNewspaper className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">Newsletter</p>
                                        <p className="text-gray-600 text-xs">Receive promotional intelligence & new artifact drops via email</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.newsletter_sub}
                                        onChange={(e) => setFormData({ ...formData, newsletter_sub: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white"></div>
                                </label>
                            </div>

                            {/* Restock Notify Toggle */}
                            <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:border-white/10 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <HiOutlineBell className="w-4 h-4 text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">Restock Alerts</p>
                                        <p className="text-gray-600 text-xs">Get notified when wishlisted artifacts are re-acquired</p>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.restock_notify}
                                        onChange={(e) => setFormData({ ...formData, restock_notify: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-600 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full md:w-auto px-10 py-3.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <HiOutlineSave className="w-4 h-4" />
                                    <span>{t('profile.saveChanges')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
