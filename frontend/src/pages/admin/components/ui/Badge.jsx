import React from "react";

const Badge = ({
    variant = "light",
    color = "primary",
    size = "md",
    startIcon,
    endIcon,
    children,
}) => {
    const baseStyles =
        "inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium";

    // Define size styles
    const sizeStyles = {
        sm: "text-xs px-2 py-0.5", // Smaller padding and font size
        md: "text-sm px-2.5 py-0.5", // Default padding and font size
    };

    // Define color styles for variants using standard Tailwind colors
    // Mapping 'brand' to 'rose' (Forza theme) and others to standard colors
    const variants = {
        light: {
            primary:
                "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400",
            success:
                "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-500",
            error:
                "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-500", // Using rose for error too as per theme consistency or red
            warning:
                "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400",
            info: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-500",
            light: "bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80",
            dark: "bg-gray-500 text-white dark:bg-white/5 dark:text-white",
        },
        solid: {
            primary: "bg-rose-600 text-white dark:text-white",
            success: "bg-emerald-500 text-white dark:text-white",
            error: "bg-rose-600 text-white dark:text-white", // consistency
            warning: "bg-orange-500 text-white dark:text-white",
            info: "bg-blue-500 text-white dark:text-white",
            light: "bg-gray-400 dark:bg-white/5 text-white dark:text-white/80",
            dark: "bg-gray-700 text-white dark:text-white",
        },
    };

    // Get styles based on size and color variant
    const sizeClass = sizeStyles[size] || sizeStyles.md;
    const colorStyles = variants[variant][color] || variants[variant].primary;

    return (
        <span className={`${baseStyles} ${sizeClass} ${colorStyles}`}>
            {startIcon && <span className="mr-1">{startIcon}</span>}
            {children}
            {endIcon && <span className="ml-1">{endIcon}</span>}
        </span>
    );
};

export default Badge;
