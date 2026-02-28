import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../../context/SidebarContext";
import AppHeader from "./layout/AppHeader";
import AppSidebar from "./layout/AppSidebar";
import Backdrop from "./layout/Backdrop";

const AdminLayoutContent = () => {
    const { isExpanded, isHovered, isMobileOpen } = useSidebar();

    return (
        <div className="min-h-screen xl:flex dark:bg-gray-900 bg-gray-50 transition-colors duration-300">
            <AppSidebar />
            <Backdrop />
            <div
                className={`flex-1 transition-all duration-300 ease-in-out ${isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
                    } ${isMobileOpen ? "ml-0" : ""}`}
            >
                <AppHeader />
                <div className="p-4 mx-auto max-w-7xl md:p-6">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};

const AdminLayout = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser.role === 'user') {
                navigate('/dashboard');
                return;
            }
            if (!parsedUser.role) {
                navigate('/login');
                return;
            }
        } else {
            navigate('/login');
            return;
        }
        setLoading(false);
    }, [navigate]);

    if (loading) return null;

    return (
        <SidebarProvider>
            <AdminLayoutContent />
        </SidebarProvider>
    );
};

export default AdminLayout;
