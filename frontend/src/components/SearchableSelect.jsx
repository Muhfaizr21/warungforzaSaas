import React, { useState, useRef, useEffect } from 'react';
import { HiOutlineSearch, HiChevronDown } from 'react-icons/hi';

const SearchableSelect = ({ options, value, onChange, placeholder, className, displayValue }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    const filteredOptions = options.filter(opt =>
        (opt.label?.toLowerCase().includes(search.toLowerCase())) ||
        (opt.value?.toLowerCase().includes(search.toLowerCase()))
    );

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-white/5 border border-white/8 hover:border-white/20 focus:border-rose-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none cursor-pointer flex items-center justify-between transition-all"
            >
                <span className="flex items-center gap-2 truncate text-xs sm:text-sm">
                    {selectedOption ? (
                        <>
                            {selectedOption.flag && <span>{selectedOption.flag}</span>}
                            <span className="truncate">{selectedOption.label}</span>
                        </>
                    ) : (
                        <span className="text-gray-500">{placeholder}</span>
                    )}
                </span>
                <HiChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full min-w-[200px] bg-[#111111] border border-white/10 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-white/5">
                        <div className="relative">
                            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-white/5 border border-white/5 rounded-lg pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-rose-500/30 transition-all placeholder:text-gray-700"
                                placeholder="Cari negara/kode..."
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => (
                                <div
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(opt);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                    className={`px-4 py-2.5 text-xs sm:text-sm cursor-pointer transition-colors flex items-center gap-3 hover:bg-rose-500/10 ${value === opt.value ? 'bg-rose-500/20 text-rose-400' : 'text-gray-300'}`}
                                >
                                    {opt.flag && <span>{opt.flag}</span>}
                                    <span className="truncate font-medium">{opt.label}</span>
                                </div>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-gray-600 text-[11px] uppercase font-bold tracking-widest italic">
                                Tidak ditemukan
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
