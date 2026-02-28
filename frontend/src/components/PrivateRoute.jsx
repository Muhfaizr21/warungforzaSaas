import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * PrivateRoute — protects pages that require authentication.
 * Redirects to /login with ?next= param so user returns after login.
 */
export const PrivateRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (!token) {
        return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    }

    return children;
};

/**
 * AdminRoute — protects admin pages.
 * User must be logged in AND have a non-customer role.
 */
export const AdminRoute = ({ children }) => {
    const token = localStorage.getItem('token');
    const location = useLocation();

    if (!token) {
        return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
    }

    try {
        const userData = localStorage.getItem('user');
        if (userData) {
            const user = JSON.parse(userData);
            // 'user' slug = regular customer, everything else = staff/admin
            if (user?.role === 'user') {
                return <Navigate to="/" replace />;
            }
        }
    } catch {
        // If user data is corrupt, redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default PrivateRoute;
