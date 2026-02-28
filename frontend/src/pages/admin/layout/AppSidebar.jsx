import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    HiOutlineHome, HiOutlineShoppingBag, HiOutlineClipboardList, HiOutlineUsers,
    HiOutlineSpeakerphone, HiOutlineMail, HiOutlineInbox, HiOutlineHeart,
    HiOutlineCurrencyDollar, HiOutlineCog, HiOutlineDocumentText,
    HiOutlineShieldCheck, HiOutlineUserCircle, HiOutlineTag,
    HiOutlineOfficeBuilding, HiOutlineTruck, HiOutlineChartBar,
    HiChevronDown, HiOutlineGlobe, HiOutlineColorSwatch
} from "react-icons/hi";
import { useSidebar } from "../../../context/SidebarContext";
import { usePermission } from "../../../hooks/usePermission";

const AppSidebar = () => {
    const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
    const location = useLocation();
    const { hasPermission } = usePermission();

    // Define navigation structure
    const navItems = [
        {
            name: "UTAMA",
            description: "Dashboard utama dan pusat pesan",
            items: [
                { name: "Dashboard", path: "/admin/dashboard", icon: <HiOutlineHome />, permission: "dashboard.view", desc: "Statistik & ringkasan toko" },
                { name: "Kotak Masuk", path: "/admin/inbox", icon: <HiOutlineInbox />, permission: "marketing.view", desc: "Pesan dari pelanggan" },
            ]
        },
        {
            name: "PRODUK & PESANAN",
            description: "Kelola dagangan dan transaksi",
            items: [
                { name: "Semua Produk", path: "/admin/products", icon: <HiOutlineShoppingBag />, permission: "product.view", desc: "Katalog & stok barang" },
                { name: "Sistem Kasir (POS)", path: "/admin/pos", icon: <HiOutlineShoppingBag />, permission: "pos.view", desc: "Offline point of sale" },
                { name: "Daftar Pesanan", path: "/admin/orders", icon: <HiOutlineClipboardList />, permission: "order.view", desc: "Transaksi pelanggan" },
                { name: "Pengadaan (PO)", path: "/admin/procurement", icon: <HiOutlineClipboardList />, permission: "procurement.view", desc: "Restock ke supplier" },
                { name: "Daftar Supplier", path: "/admin/suppliers", icon: <HiOutlineTruck />, permission: "procurement.view", desc: "Rekan bisnis" },
                { name: "Data Pelanggan", path: "/admin/users", icon: <HiOutlineUsers />, permission: "user.view", desc: "Database pembeli" },
                { name: "Taksonomi", path: "/admin/taxonomy", icon: <HiOutlineTag />, permission: "taxonomy.view", desc: "Kategori & Label" },
            ]
        },
        {
            name: "LOGISTIK",
            description: "Pusat kendali pengiriman",
            items: [
                { name: "Pengiriman", path: "/admin/shipping", icon: <HiOutlineTruck />, permission: "settings.view", desc: "Biteship & Kurir Nasional" },
            ]
        },
        {
            name: "MARKETING & KONTEN",
            description: "Promosi dan konten menarik",
            items: [
                { name: "Pengumuman", path: "/admin/announcements", icon: <HiOutlineSpeakerphone />, permission: "marketing.view", desc: "Bar promosi atas" },
                { name: "Newsletter", path: "/admin/newsletter", icon: <HiOutlineMail />, permission: "marketing.view", desc: "Email broadcast" },
                { name: "Daftar Wishlist", path: "/admin/wishlist", icon: <HiOutlineHeart />, permission: "marketing.view", desc: "Minat pelanggan" },
                { name: "Voucher & Diskon", path: "/admin/vouchers", icon: <HiOutlineTag />, permission: "marketing.view", desc: "Promo kupon" },
                { name: "Kelola Blog", path: "/admin/blog", icon: <HiOutlineDocumentText />, permission: "blog.view", desc: "Artikel & Berita" },]
        },
        {
            name: "KEUANGAN",
            description: "Laporan duit dan modal",
            items: [
                { name: "Ringkasan Keuangan", path: "/admin/finance", icon: <HiOutlineCurrencyDollar />, permission: "finance.view", desc: "Laba rugi & kas" },
                { name: "Bagan Akun (COA)", path: "/admin/finance/coa", icon: <HiOutlineChartBar />, permission: "finance.view", desc: "Struktur akuntansi" },
            ]
        },
        {
            name: "KONFIGURASI",
            description: "Pengaturan inti & visual",
            items: [
                { name: "Pengaturan Situs", path: "/admin/settings", icon: <HiOutlineCog />, permission: "settings.view", desc: "Identitas toko & kunci API" },
                { name: "Theme Studio", path: "/admin/theme", icon: <HiOutlineColorSwatch />, permission: "settings.view", desc: "Design & Look" },
                { name: "Email Templates", path: "/admin/email-templates", icon: <HiOutlineMail />, permission: "settings.view", desc: "Notifikasi otomatis" },
            ]
        },
        {
            name: "KONTROL AKSES (RBAC)",
            description: "Keamanan dan tim",
            items: [
                { name: "Peran & Hak Akses", path: "/admin/rbac/roles", icon: <HiOutlineShieldCheck />, permission: "role.view", desc: "Level akses karyawan" },
                { name: "Manajemen Staff", path: "/admin/rbac/staff", icon: <HiOutlineUserCircle />, permission: "user.view", desc: "Akun admin internal" },
                { name: "Catatan Audit", path: "/admin/audit", icon: <HiOutlineClipboardList />, permission: "audit.view", desc: "Log aktivitas staff" },
            ]
        }
    ];

    const [openSubmenu, setOpenSubmenu] = useState(null);
    const [subMenuHeight, setSubMenuHeight] = useState({});
    const subMenuRefs = useRef({});

    const isActive = useCallback(
        (path) => location.pathname === path || location.pathname.startsWith(`${path}/`),
        [location.pathname]
    );

    useEffect(() => {
        // Auto-expand submenu if active
        // Implementation simplified for single-level menu for now as current structure is flat
        // If we introduce sub-menus later, we can re-enable this logic
    }, [location, isActive]);

    const handleSubmenuToggle = (index) => {
        setOpenSubmenu(openSubmenu === index ? null : index);
    };

    return (
        <aside
            className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 
        ${isExpanded || isMobileOpen ? "w-[290px]" : isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
            onMouseEnter={() => !isExpanded && setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={`py-8 flex justify-center px-4 w-full`}>
                <Link to="/admin/dashboard">
                    {isExpanded || isHovered || isMobileOpen ? (
                        <div className="flex items-center gap-3">
                            <img src="/forza.png" alt="Warung Forza" className="h-8 md:h-10 object-contain" />
                        </div>
                    ) : (
                        <img src="/forza.png" alt="Warung Forza" className="h-8 object-contain" />
                    )}
                </Link>
            </div>

            <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
                <nav className="mb-6">
                    <div className="flex flex-col gap-4">
                        {navItems.map((group, groupIndex) => {
                            // Filter items based on permissions
                            const filteredItems = group.items.filter(item => !item.permission || hasPermission(item.permission));

                            if (filteredItems.length === 0) return null;

                            return (
                                <div key={groupIndex} className="pt-2">
                                    {(isExpanded || isHovered || isMobileOpen) && (
                                        <div className="px-4 mb-2">
                                            <h2 className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                                                {group.name}
                                            </h2>
                                            {group.description && (
                                                <p className="text-[9px] text-gray-500/60 dark:text-gray-400/40 font-medium italic">
                                                    {group.description}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    <ul className="flex flex-col gap-1">
                                        {filteredItems.map((item, itemIndex) => (
                                            <li key={item.name}>
                                                <Link
                                                    to={item.path}
                                                    className={`menu-item group flex items-start gap-3.5 rounded-2xl px-4 py-3 transition-all duration-300 ${isActive(item.path)
                                                        ? "bg-rose-600/10 text-rose-500 shadow-sm"
                                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.03] hover:text-gray-900 dark:hover:text-white"
                                                        } ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}
                                                >
                                                    <span className={`text-xl transition-transform duration-300 group-hover:scale-110 ${isActive(item.path) ? "text-rose-500" : "text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"}`}>
                                                        {item.icon}
                                                    </span>
                                                    {(isExpanded || isHovered || isMobileOpen) && (
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold tracking-tight">{item.name}</span>
                                                            {item.desc && (
                                                                <span className={`text-[10px] opacity-60 font-medium transition-colors ${isActive(item.path) ? "text-rose-400" : "text-gray-500"}`}>
                                                                    {item.desc}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </aside>
    );
};

export default AppSidebar;
