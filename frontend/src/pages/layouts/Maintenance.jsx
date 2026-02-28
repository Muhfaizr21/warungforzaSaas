import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { LuWrench, LuMail } from 'react-icons/lu';

const Maintenance = () => {
    const { publicSettings } = useTheme();

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#030303]">
            {/* Background elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] bg-rose-500/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[20%] right-[20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
            </div>

            <div className="relative z-10 w-full max-w-3xl mx-auto px-6 text-center">
                <div className="mb-10 inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/5 border border-white/10 shadow-2xl backdrop-blur-md">
                    <LuWrench className="w-10 h-10 text-rose-500 animate-pulse" />
                </div>

                <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight uppercase italic">
                    {publicSettings.store_name || "Warung Forza"} <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-rose-300">
                        Under Maintenance
                    </span>
                </h1>

                <p className="text-gray-400 text-lg md:text-xl font-medium max-w-xl mx-auto mb-12">
                    Our platform is currently undergoing scheduled maintenance and upgrades.
                    We are forging new enhancements to deliver a superior collecting experience.
                </p>

                <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    Estimated Completion: Soon™
                </div>

                {publicSettings.store_email && (
                    <div className="mt-16 text-center">
                        <p className="text-sm font-bold text-gray-500 tracking-widest uppercase mb-4">Contact Support</p>
                        <a href={`mailto:${publicSettings.store_email}`}
                            className="inline-flex items-center justify-center gap-2 group text-gray-300 hover:text-white transition-colors">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-rose-500/50 transition-colors">
                                <LuMail className="w-5 h-5 text-gray-400 group-hover:text-rose-500 transition-colors" />
                            </div>
                            <span className="font-medium">{publicSettings.store_email}</span>
                        </a>
                    </div>
                )}
            </div>

            <div className="absolute bottom-8 left-0 right-0 text-center text-xs font-bold tracking-widest uppercase text-gray-600">
                SYSTEM INTERCEPT // FORZA SECURE PROTOCOL
            </div>
        </div>
    );
};

export default Maintenance;
