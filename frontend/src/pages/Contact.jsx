import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import contactService from '../services/contactService';
import { sanitizeInput } from '../utils/security';
import { useLanguage } from '../context/LanguageContext';

const ContactPage = () => {
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });
    const [submitting, setSubmitting] = useState(false);
    const { t } = useLanguage();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const sanitizedData = {
            name: sanitizeInput(formData.name),
            email: sanitizeInput(formData.email),
            message: sanitizeInput(formData.message)
        };

        try {
            await contactService.submitMessage(sanitizedData);
            alert('Message sent successfully! We will contact you soon.');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    return (
        <div className="bg-[#030303] pt-16 pb-20 overflow-hidden">
            {/* Hero Banner */}
            <div className="relative h-96 flex items-center justify-center overflow-hidden mb-8 border-b border-white/5">
                <img
                    src="https://warungforzashop.com/wp-content/uploads/2025/04/predator-collectible-warung-forzashop-action-figure.webp"
                    className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale brightness-50"
                    alt="bg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] to-transparent"></div>
                <div className="container relative z-10 text-center">
                    <h1 className="text-white uppercase italic">Contacts</h1>
                    <div className="flex items-center justify-center gap-3 mt-4 text-gray-500 font-black uppercase tracking-[0.4em] text-[10px]">
                        <Link to="/" className="hover:text-rose-600 transition-colors">Home</Link>
                        <span>›</span>
                        <span className="text-white">Contacts</span>
                    </div>
                </div>
            </div>

            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start mb-20">

                    {/* Left Column: Info */}
                    <div className="relative">
                        <div className="relative z-10 bg-white/5 backdrop-blur-xl p-10 rounded-[8px] border border-white/10 shadow-2xl">
                            <span className="text-rose-600 font-black text-[10px] uppercase tracking-[0.5em] mb-4 block">Communication</span>
                            <h2 className="text-white uppercase italic mb-6">Get In <span className="text-rose-600">Touch</span></h2>
                            <p className="text-gray-400 leading-relaxed mb-8 text-sm">
                                Have questions about membership, product acquisition, or archive access? <br />
                                Please fill out the form and our team will respond within <span className="text-white font-bold">24 hours</span>.
                            </p>

                            <div className="pt-8 border-t border-white/10">
                                <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-2">Direct Channel:</p>
                                <a href="tel:081230535151" className="text-2xl font-black text-rose-600 hover:text-white transition-colors tracking-tighter">
                                    0812 3053 5151
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Form */}
                    <div className="bg-white/5 p-8 md:p-12 rounded-[8px] border border-white/10 shadow-2xl">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder={t('contact.name').toUpperCase()}
                                    required
                                    className="input-standard"
                                />
                            </div>
                            <div>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder={t('contact.email').toUpperCase()}
                                    required
                                    className="input-standard"
                                />
                            </div>
                            <div>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows="5"
                                    placeholder={t('contact.message').toUpperCase()}
                                    required
                                    className="input-standard min-h-[120px] resize-none"
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full btn-primary h-[54px]"
                            >
                                {submitting ? t('contact.sending').toUpperCase() : t('contact.send').toUpperCase()}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Map Placeholder */}
                <div className="rounded-[8px] overflow-hidden border border-white/10 shadow-3xl h-[450px] relative grayscale hover:grayscale-0 transition-all duration-700">
                    <img
                        src="https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?q=80&w=2666&auto=format&fit=crop"
                        className="w-full h-full object-cover opacity-30"
                        alt="Map"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/80 backdrop-blur-md p-6 rounded-[8px] border border-white/10 text-center">
                            <div className="w-12 h-12 bg-rose-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                📍
                            </div>
                            <h3 className="text-white font-bold mb-1 uppercase tracking-widest text-xs">Our Showroom</h3>
                            <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest leading-relaxed">
                                Jl. Raya Forza No. 123,<br />Indonesia
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
