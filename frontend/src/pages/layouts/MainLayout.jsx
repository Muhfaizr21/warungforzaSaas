import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import AnnouncementBar from '../../components/AnnouncementBar';
import Maintenance from './Maintenance';
import { useTheme } from '../../context/ThemeContext';

const MainLayout = () => {
    const { publicSettings } = useTheme();

    if (publicSettings.maintenance_mode === 'true') {
        let isAdmin = false;
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                isAdmin = user?.role && user.role !== 'user';
            } catch { }
        }

        if (!isAdmin) {
            return <Maintenance />;
        }
    }
    return (
        <>
            <AnnouncementBar />
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </>
    );
};

export default MainLayout;
