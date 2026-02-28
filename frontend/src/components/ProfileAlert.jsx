import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HiExclamation, HiArrowRight, HiShieldCheck } from 'react-icons/hi';

const ProfileAlert = ({ type = 'warning', message, submessage, actionLabel, actionLink }) => {
    const navigate = useNavigate();

    return (
        <div className="relative group animate-in fade-in slide-in-from-top duration-700">
            {/* Ambient Background Glow */}
            <div className={`absolute -inset-1 bg-gradient-to-r ${type === 'danger' ? 'from-rose-600 to-red-600' : 'from-neon-pink to-purple-600'} rounded-[8px] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200`}></div>

            <div className="relative bg-[#0a0a0a] backdrop-blur-md rounded-[8px] p-4 md:p-5 border border-white/10 flex flex-col md:flex-row items-center gap-4 md:gap-6 overflow-hidden">
                {/* Visual Icon Section */}
                <div className={`w-14 h-14 rounded-[8px] flex items-center justify-center flex-shrink-0 ${type === 'danger' ? 'bg-rose-500/20 text-rose-500' : 'bg-neon-pink/20 text-neon-pink shadow-[0_0_20px_rgba(255,0,119,0.2)]'}`}>
                    {type === 'danger' ? <HiExclamation className="w-8 h-8" /> : <HiShieldCheck className="w-8 h-8" />}
                </div>

                {/* Content */}
                <div className="text-center md:text-left flex-grow">
                    <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${type === 'danger' ? 'text-rose-500' : 'text-neon-pink'}`}>
                        {message}
                    </h3>
                    <p className="text-gray-400 text-[10px] uppercase font-bold tracking-widest italic tracking-wide">
                        {submessage}
                    </p>
                </div>

                {/* Action Section */}
                <button
                    onClick={() => navigate(actionLink)}
                    className={`flex items-center gap-2 px-6 h-[48px] rounded-[8px] text-[10px] font-black uppercase tracking-[0.2em] transition-all group/btn ${type === 'danger'
                        ? 'bg-rose-600 hover:bg-white hover:text-rose-600 text-white'
                        : 'bg-white/5 hover:bg-neon-pink hover:text-white text-gray-400'
                        }`}
                >
                    {actionLabel}
                    <HiArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>

                {/* Subtle Grid Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
        </div>
    );
};

export default ProfileAlert;
