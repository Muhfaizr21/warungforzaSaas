import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { HiDotsHorizontal } from "react-icons/hi";

export default function MonthlyTarget() {
    const series = [75.55]; // Placeholder for target
    const options = {
        colors: ["#10B981"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "radialBar",
            height: 330,
            sparkline: {
                enabled: true,
            },
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            radialBar: {
                startAngle: -85,
                endAngle: 85,
                hollow: {
                    size: "80%",
                },
                track: {
                    background: "#E4E7EC",
                    strokeWidth: "100%",
                    margin: 5, // margin is in pixels
                },
                dataLabels: {
                    name: {
                        show: false,
                    },
                    value: {
                        fontSize: "36px",
                        fontWeight: "600",
                        offsetY: -40,
                        color: "#1D2939",
                        formatter: function (val) {
                            return val + "%";
                        },
                    },
                },
            },
        },
        fill: {
            type: "solid",
            colors: ["#10B981"],
        },
        stroke: {
            lineCap: "round",
        },
        labels: ["Kemajuan"],
        theme: {
            mode: document.documentElement.className.includes("dark") ? "dark" : "light",
        },
    };

    return (
        <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-11 dark:bg-gray-900 sm:px-6 sm:pt-6">
                <div className="flex justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                            Target Bulanan
                        </h3>
                        <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">
                            Target yang Anda tetapkan setiap bulan
                        </p>
                    </div>
                    <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                        <HiDotsHorizontal className="size-6" />
                    </button>
                </div>
                <div className="relative mt-8">
                    <div className="max-h-[330px]" id="chartDarkStyle">
                        <ReactApexChart
                            options={options}
                            series={series}
                            type="radialBar"
                            height={330}
                        />
                    </div>

                    <span className="absolute left-1/2 top-full -translate-x-1/2 -translate-y-[200%] md:-translate-y-[350%] rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-500">
                        +10%
                    </span>
                </div>
                <p className="mx-auto mt-2 w-full max-w-[380px] text-center text-sm text-gray-500 sm:text-base">
                    Anda memperoleh {series[0]}% dari target hari ini. Terus pertahankan kerja bagus Anda!
                </p>
            </div>

            <div className="flex items-center justify-center gap-5 px-6 py-3.5 sm:gap-8 sm:py-5">
                <div>
                    <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                        Target
                    </p>
                    <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                        $20K
                    </p>
                </div>

                <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

                <div>
                    <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                        Pendapatan
                    </p>
                    <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                        $16K
                    </p>
                </div>

                <div className="w-px bg-gray-200 h-7 dark:bg-gray-800"></div>

                <div>
                    <p className="mb-1 text-center text-gray-500 text-xs dark:text-gray-400 sm:text-sm">
                        Hari Ini
                    </p>
                    <p className="flex items-center justify-center gap-1 text-base font-semibold text-gray-800 dark:text-white/90 sm:text-lg">
                        $1.5K
                    </p>
                </div>
            </div>
        </div>
    );
}
