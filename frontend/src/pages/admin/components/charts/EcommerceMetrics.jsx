import React from "react";
import {
    HiOutlineUsers,
    HiOutlineShoppingCart,
    HiOutlineCurrencyDollar,
    HiOutlineTrendingUp,
    HiOutlineArrowUp,
    HiOutlineArrowDown,
} from "react-icons/hi";
import Badge from "../ui/Badge";

export default function EcommerceMetrics({ stats }) {
    const metrics = [
        {
            label: "Total Pelanggan",
            value: stats?.customers_count || "0",
            trend: "11.01%", // Placeholder trend
            trendDirection: "up",
            icon: HiOutlineUsers,
        },
        {
            label: "Total Pesanan",
            value: stats?.total_orders_count || "0",
            trend: stats?.new_orders_count ? `${stats.new_orders_count} Menunggu` : "Semua Lunas",
            trendDirection: stats?.new_orders_count > 0 ? "down" : "up", // Alert if there are pending orders
            icon: HiOutlineShoppingCart,
        },
        {
            label: "Total Pendapatan",
            value: `Rp ${(stats?.revenue || 0).toLocaleString('id-ID')}`,
            trend: "Dinamis",
            trendDirection: "up",
            icon: HiOutlineCurrencyDollar,
        },
        {
            label: "Produk Aktif",
            value: stats?.products_count || "0",
            trend: "5.2%",
            trendDirection: "up",
            icon: HiOutlineTrendingUp,
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 xl:grid-cols-4">
            {metrics.map((metric, index) => (
                <div
                    key={index}
                    className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6"
                >
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                        <metric.icon className="text-gray-800 size-6 dark:text-white/90" />
                    </div>

                    <div className="flex items-end justify-between mt-5">
                        <div>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {metric.label}
                            </span>
                            <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                                {metric.value}
                            </h4>
                        </div>
                        <Badge color={metric.trendDirection === "up" ? "success" : "error"}>
                            {metric.trendDirection === "up" ? (
                                <HiOutlineArrowUp className="mr-1" />
                            ) : (
                                <HiOutlineArrowDown className="mr-1" />
                            )}
                            {metric.trend}
                        </Badge>
                    </div>
                </div>
            ))}
        </div>
    );
}
