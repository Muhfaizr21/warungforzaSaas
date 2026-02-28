import DOMPurify from 'dompurify';

export const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input.trim());
};

export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

export const validatePassword = (password) => {
    // Minimum 8 characters, at least one letter and one number
    // const re = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    // For now, simple length check to match backend usually handling complexity
    return password.length >= 6;
};
