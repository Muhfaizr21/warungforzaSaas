import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dropdown } from "../ui/Dropdown";
import { DropdownItem } from "../ui/DropdownItem";
import { HiOutlineUser, HiOutlineLogout, HiChevronDown } from "react-icons/hi";

export default function UserDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    function toggleDropdown() {
        setIsOpen(!isOpen);
    }

    function closeDropdown() {
        setIsOpen(false);
    }

    const handleLogout = (e) => {
        e.preventDefault();
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="relative">
            <button
                onClick={toggleDropdown}
                className="flex items-center text-gray-700 dropdown-toggle dark:text-gray-400"
            >
                <span className="mr-3 overflow-hidden rounded-full h-11 w-11 bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                    {user?.username ? user.username[0].toUpperCase() : 'U'}
                </span>

                <span className="block mr-1 font-medium text-theme-sm">{user?.full_name || user?.username || 'Admin'}</span>
                <HiChevronDown
                    className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                />
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={closeDropdown}
                className="absolute right-0 mt-[17px] flex w-[260px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
            >
                <div className="px-3 py-2">
                    <span className="block font-medium text-gray-700 text-theme-sm dark:text-gray-400">
                        {user?.full_name || 'Admin User'}
                    </span>
                    <span className="mt-0.5 block text-theme-xs text-gray-500 dark:text-gray-400 text-xs">
                        {user?.email || 'admin@example.com'}
                    </span>
                </div>

                <ul className="flex flex-col gap-1 pt-4 pb-3 border-b border-gray-200 dark:border-gray-800">
                    <li>
                        <DropdownItem
                            onItemClick={closeDropdown}
                            tag="a"
                            to="/admin/settings"
                            className="flex items-center gap-3 px-3 py-2 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300"
                        >
                            <HiOutlineUser className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
                            Ubah Profil
                        </DropdownItem>
                    </li>
                </ul>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2 mt-3 font-medium text-gray-700 rounded-lg group text-theme-sm hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 w-full text-left"
                >
                    <HiOutlineLogout className="w-5 h-5 text-gray-500 group-hover:text-gray-700 dark:text-gray-400 dark:group-hover:text-gray-300" />
                    Keluar Sesi
                </button>
            </Dropdown>
        </div>
    );
}
