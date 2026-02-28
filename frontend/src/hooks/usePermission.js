import { useState, useEffect } from 'react';

export const usePermission = () => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState([]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            // Extract permission slugs
            const perms = parsedUser.permissions?.map(p => p.slug) || [];
            setPermissions(perms);
        }
    }, []);

    const hasPermission = (requiredPermission) => {
        if (!user) return false;

        // Super Admin has universal access
        if (user.role === 'super_admin') return true;

        // Check if user has the specific permission
        return permissions.includes(requiredPermission);
    };

    const hasAnyPermission = (requiredPermissions = []) => {
        if (!user) return false;
        if (user.role === 'super_admin') return true;

        return requiredPermissions.some(perm => permissions.includes(perm));
    };

    return { user, hasPermission, hasAnyPermission };
};
