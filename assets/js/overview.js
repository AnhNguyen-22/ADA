// Khởi tạo biểu đồ xu hướng PM 2.5
document.addEventListener('DOMContentLoaded', function() {
    // Dữ liệu mẫu cho biểu đồ xu hướng (24 giờ)
    const trendCtx = document.getElementById('trendChart');
    if (trendCtx) {
        const trendChart = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['0:00', '2:00', '4:00', '6:00', '8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'],
                datasets: [{
                    label: 'PM 2.5 (µg/m³)',
                    data: [32, 34, 35, 36, 38, 40, 39, 37, 35, 33, 32, 31],
                    borderColor: '#FFFFFF',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointHoverBackgroundColor: '#FFFFFF',
                    pointHoverBorderColor: '#0EA5E9',
                    pointHoverBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        padding: 12,
                        titleColor: '#1F2937',
                        bodyColor: '#1F2937',
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return 'PM 2.5: ' + context.parsed.y + ' µg/m³';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94A3B8',
                            font: {
                                size: 11
                            }
                        },
                        border: {
                            color: '#475569'
                        }
                    },
                    y: {
                        min: 30,
                        max: 42,
                        grid: {
                            color: '#475569',
                            lineWidth: 1
                        },
                        ticks: {
                            color: '#94A3B8',
                            font: {
                                size: 11
                            },
                            stepSize: 2
                        },
                        border: {
                            color: '#475569'
                        }
                    }
                }
            }
        });
    }

    // Khởi tạo biểu đồ xếp hạng mức độ ô nhiễm
    const rankingCtx = document.getElementById('rankingChart');
    if (rankingCtx) {
        // Dữ liệu xếp hạng các trạm (từ cao đến thấp)
        const stationData = {
            labels: ['S2', 'S4', 'S6', 'S5', 'S3', 'S1'],
            values: [52.1, 48.3, 42.7, 38.9, 35.2, 32.1]
        };

        const rankingChart = new Chart(rankingCtx, {
            type: 'bar',
            data: {
                labels: stationData.labels,
                datasets: [{
                    label: 'PM 2.5 (µg/m³)',
                    data: stationData.values,
                    backgroundColor: [
                        '#EF4444', // Đỏ đậm - ô nhiễm cao nhất
                        '#F97316', // Cam đậm
                        '#F59E0B', // Vàng cam
                        '#F97316', // Cam
                        '#F59E0B', // Vàng cam nhạt
                        '#F97316'  // Cam nhạt
                    ],
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return 'PM 2.5: ' + context.parsed.x + ' µg/m³';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#94A3B8',
                            font: {
                                size: 11
                            }
                        },
                        border: {
                            display: false
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#1F2937',
                            font: {
                                size: 12,
                                weight: '500'
                            }
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Xử lý nút Refresh
    const refreshBtn = document.querySelector('.btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Có thể thêm logic refresh dữ liệu ở đây
            console.log('Refreshing data...');
            // Ví dụ: reload lại biểu đồ với dữ liệu mới
        });
    }

    // Xử lý dropdown thay đổi
    const timeSelect = document.querySelector('.chart-controls .control-select');
    if (timeSelect) {
        timeSelect.addEventListener('change', function() {
            console.log('Time range changed:', this.value);
            // Có thể cập nhật biểu đồ dựa trên khoảng thời gian được chọn
        });
    }

    const indexSelect = document.querySelectorAll('.chart-controls .control-select')[1];
    if (indexSelect) {
        indexSelect.addEventListener('change', function() {
            console.log('Index changed:', this.value);
            // Có thể cập nhật biểu đồ dựa trên chỉ số được chọn
        });
    }
});