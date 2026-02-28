import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { HiOutlineCalendar } from "react-icons/hi";

export default function StatisticsChart({ data, period, onPeriodChange, loading }) {
    const series = [
        {
            name: "Pendapatan",
            data: data?.map(item => item.total) || [],
        },
    ];

    const categories = data?.map(item => item.date) || [];

    const options = {
        legend: {
            show: false,
            position: "top",
            horizontalAlign: "left",
        },
        colors: ["#10B981", "#34D399"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            height: 310,
            type: "area",
            toolbar: {
                show: false,
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: {
                    enabled: true,
                    delay: 150
                },
                dynamicAnimation: {
                    enabled: true,
                    speed: 350
                }
            },
            locales: [{
                name: 'id',
                options: {
                    months: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
                    shortMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
                    days: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
                    shortDays: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
                    toolbar: {
                        download: 'Unduh SVG',
                        selection: 'Seleksi',
                        selectionZoom: 'Seleksi Zoom',
                        zoomIn: 'Perbesar',
                        zoomOut: 'Perkecil',
                        pan: 'Geser',
                        reset: 'Reset Zoom',
                    }
                }
            }],
            defaultLocale: 'id'
        },
        fill: {
            type: "gradient",
            gradient: {
                opacityFrom: 0.55,
                opacityTo: 0,
                shadeIntensity: 1,
                stops: [0, 90, 100]
            },
        },
        stroke: {
            curve: "smooth",
            width: 3,
        },
        markers: {
            size: 4,
            colors: ["#10B981"],
            strokeColors: "#fff",
            strokeWidth: 2,
            hover: {
                size: 7,
            },
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            xaxis: {
                lines: {
                    show: false,
                },
            },
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
        tooltip: {
            enabled: true,
            theme: 'dark',
            x: {
                format: "dd MMM yyyy",
            },
            y: {
                formatter: (val) => `Rp ${val.toLocaleString()}`,
            },
        },
        xaxis: {
            type: "category",
            categories: categories,
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            labels: {
                style: {
                    colors: Array(categories.length).fill("#6B7280"),
                    fontSize: '11px'
                }
            },
            tooltip: {
                enabled: false,
            },
        },
        yaxis: {
            labels: {
                style: {
                    fontSize: "12px",
                    colors: ["#6B7280"],
                },
                formatter: (val) => {
                    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)} Jt`;
                    if (val >= 1000) return `Rp ${(val / 1000).toFixed(0)} Rb`;
                    return val;
                }
            },
        },
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all duration-300">
            <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:justify-between">
                <div className="w-full">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight italic">
                        Analisis Pendapatan
                    </h3>
                    <p className="mt-1 text-gray-500 text-xs font-medium uppercase tracking-widest italic opacity-60">
                        Ringkasan performa untuk periode saat ini
                    </p>
                </div>
                <div className="flex items-center gap-3 sm:justify-end">
                    <div className="relative inline-flex items-center">
                        <HiOutlineCalendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 dark:text-gray-400 pointer-events-none z-10" />
                        <select
                            value={period}
                            onChange={(e) => onPeriodChange(e.target.value)}
                            className="h-10 pl-9 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-600 outline-none dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400 cursor-pointer appearance-none focus:border-emerald-500 transition-all shadow-sm"
                        >
                            <option value="7d">7 Hari Terakhir</option>
                            <option value="30d">30 Hari Terakhir</option>
                            <option value="90d">3 Bulan Terakhir</option>
                            <option value="6m">6 Bulan Terakhir</option>
                            <option value="1y">Tahun Terakhir</option>
                            <option value="all">Semua Waktu</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-full overflow-x-auto custom-scrollbar relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-black/20 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-xl">
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Memperbarui...</span>
                        </div>
                    </div>
                )}
                <div className="min-w-[650px] xl:min-w-full">
                    <ReactApexChart options={options} series={series} type="area" height={310} />
                </div>
            </div>
        </div>
    );
}
