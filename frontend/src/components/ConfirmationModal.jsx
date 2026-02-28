import React from 'react';
import { HiExclamation, HiX } from 'react-icons/hi';

const ConfirmationModal = ({ show, isOpen, onCancel, onClose, onConfirm, title, message, confirmText = "Proceed", cancelText = "Cancel" }) => {
    const isVisible = show || isOpen;
    const handleClose = onCancel || onClose;

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-[#0b0d17] border border-white/10 rounded-sm w-full max-w-md p-6 shadow-2xl transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
                {/* Close Button */}
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <HiX size={20} />
                </button>

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-full bg-neon-pink/10 flex items-center justify-center flex-shrink-0">
                        <HiExclamation className="text-neon-pink w-6 h-6" />
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
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-wider"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            handleClose();
                        }}
                        className="bg-neon-pink hover:bg-white hover:text-black text-white px-6 py-2 text-sm font-bold uppercase tracking-widest transition-all skew-x-[-10deg]"
                    >
                        <span className="skew-x-[10deg] inline-block">{confirmText}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
