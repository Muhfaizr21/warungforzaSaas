import React, { useEffect } from 'react';

const ClearCart = () => {
    useEffect(() => {
        // Force clear all localStorage on first load
        const hasCleared = sessionStorage.getItem('force_cleared_v2');

        if (!hasCleared) {
            localStorage.clear();
            sessionStorage.setItem('force_cleared_v2', 'true');
        }
    }, []);

    return null;
};

export default ClearCart;
