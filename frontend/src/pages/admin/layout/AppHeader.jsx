import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSidebar } from "../../../context/SidebarContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import NotificationDropdown from "../components/header/NotificationDropdown";
import UserDropdown from "../components/header/UserDropdown";
import { HiMenu, HiSearch } from "react-icons/hi";

const AppHeader = () => {
    const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
    const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");

    const handleToggle = () => {
        if (window.innerWidth >= 1024) {
            toggleSidebar();
        } else {
            toggleMobileSidebar();
        }
    };

    const toggleApplicationMenu = () => {
        setApplicationMenuOpen(!isApplicationMenuOpen);
    };

    const inputRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "k") {
                event.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
        }
    };

    return (
        <header className="sticky top-0 flex w-full bg-white border-gray-200 z-[40] dark:border-gray-800 dark:bg-gray-900 lg:border-b">
            <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
                <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
                    <button
                        className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg dark:border-gray-800 lg:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={handleToggle}
                        aria-label="Toggle Sidebar"
                    >
                        <HiMenu className="w-6 h-6" />
                    </button>

                    <Link to="/" className="lg:hidden text-2xl font-black italic text-rose-600">
                        FORZA
                    </Link>

                    <div className="hidden lg:block flex-grow px-4">
                        <form onSubmit={handleSearch}>
                            <div className="relative">
                                <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
                                    <HiSearch className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                                </span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cari... (Cmd+K)"
                                    className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-rose-600 xl:w-[430px] transition-all"
                                />
                            </div>
                        </form>
                    </div>
                </div>

                <div className="flex items-center justify-end w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none lg:w-auto">
                    <div className="flex items-center gap-2">
                        <NotificationDropdown />
                    </div>
                    <UserDropdown />
                </div>
            </div>
        </header>
    );
};

export default AppHeader;
