import React from 'react';
import { HiInformationCircle, HiX } from 'react-icons/hi';

const AlertModal = ({ show, isOpen, onClose, title, message, buttonText = "OK", type = "info" }) => {
    const isVisible = show || isOpen;
    if (!isVisible) return null;

    const colors = {
        info: "text-neon-blue bg-neon-blue/10",
        error: "text-red-500 bg-red-500/10",
        success: "text-green-500 bg-green-500/10",
        warning: "text-yellow-500 bg-yellow-500/10"
    };

    const colorClass = colors[type] || colors.info;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#0b0d17] border border-white/10 rounded-sm w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <HiX size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <HiInformationCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider font-display">
                        {title}
                    </h3>
                </div>

                {/* Body */}
                <div className="mb-8">
                    <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {message}
                    </p>
                </div>

                {/* Footer / Actions */}
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white text-white hover:text-black px-6 py-2 text-sm font-bold uppercase tracking-widest transition-all skew-x-[-10deg]"
                    >
                        <span className="skew-x-[10deg] inline-block">{buttonText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertModal;
