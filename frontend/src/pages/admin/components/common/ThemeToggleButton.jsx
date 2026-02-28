import React, { useEffect, useState } from "react";
import { HiMoon, HiSun } from "react-icons/hi";

export const ThemeToggleButton = () => {
    const [theme, setTheme] = useState(
        localStorage.getItem("theme") || "light"
    );

    useEffect(() => {
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
            {theme === "dark" ? (
                <HiSun className="w-5 h-5 text-yellow-500" />
            ) : (
                <HiMoon className="w-5 h-5 text-gray-500" />
            )}
        </button>
    );
};
