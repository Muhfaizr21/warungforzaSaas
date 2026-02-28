import React from 'react';
import { HiOutlineShoppingCart } from 'react-icons/hi';

const CreateOrder = () => {
    return (
        <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
            <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 rounded-full flex items-center justify-center mb-4">
                <HiOutlineShoppingCart className="w-12 h-12 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">POS System (Coming Soon)</h1>
            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
                Fitur Point of Sales untuk membuat pesanan manual, walk-in customer, dan manajemen kasir sedang dalam tahap pengembangan akhir.
            </p>
            <div className="flex gap-4 mt-8">
                <button
                    onClick={() => window.history.back()}
                    className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                >
                    Kembali
                </button>
            </div>
        </div>
    );
};

export default CreateOrder;
