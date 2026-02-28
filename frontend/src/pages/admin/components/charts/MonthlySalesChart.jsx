import React, { useState } from "react";
import ReactApexChart from "react-apexcharts";
import { HiDotsHorizontal } from "react-icons/hi";

export default function MonthlySalesChart({ data = [] }) {
    // Process incoming data to map onto 12 months (Jan-Dec)
    const processedData = Array(12).fill(0);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

    if (data && data.length > 0) {
        data.forEach(item => {
            // item.month is in YYYY-MM format from backend
            const monthIndex = parseInt(item.month.split('-')[1]) - 1;
            if (monthIndex >= 0 && monthIndex < 12) {
                // If it's a count, use it, otherwise use total (revenue)
                processedData[monthIndex] = item.total || 0;
            }
        });
    }

    const series = [
        {
            name: "Pendapatan",
            data: processedData,
        },
    ];

    const options = {
        colors: ["#10B981"], // Emerald premium
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height: 250,
            toolbar: {
                show: false,
            },
            background: 'transparent',
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "40%",
                borderRadius: 8,
                distributed: false,
                dataLabels: {
                    position: 'top',
                },
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 0,
            colors: ["transparent"],
        },
        xaxis: {
            categories: monthNames,
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
            labels: {
                style: {
                    colors: '#94a3b8',
                }
            }
        },
        legend: {
            show: false,
        },
        yaxis: {
            show: true,
            labels: {
                style: {
                    colors: '#94a3b8',
                },
                formatter: (val) => {
                    if (val >= 1000000) return (val / 1000000).toFixed(1) + ' Jt';
                    if (val >= 1000) return (val / 1000).toFixed(0) + ' Rb';
                    return val;
                }
            }
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.05)',
            strokeDashArray: 4,
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: "vertical",
                shadeIntensity: 0.5,
                gradientToColors: ['#34D399'], // Lighter emerald
                inverseColors: true,
                opacityFrom: 1,
                opacityTo: 0.8,
                stops: [0, 100]
            }
        },
        tooltip: {
            theme: 'dark',
            y: {
                formatter: (val) => `Rp ${new Intl.NumberFormat('id-ID').format(val)}`,
            },
        },
    };

    return (
        <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-md p-6 shadow-xl h-full flex flex-col">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">
                        Pendapatan <span className="text-emerald-500">Bulanan</span>
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium italic">Performa penjualan sepanjang tahun</p>
                </div>
            </div>

            <div className="flex-1 min-h-[250px]">
                <div id="monthlySalesChart" className="-ml-4 h-full">
                    <ReactApexChart
                        options={options}
                        series={series}
                        type="bar"
                        height="100%"
                    />
                </div>
            </div>
        </div>
    );
}
