// Initialize Chart
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('comparison-chart');
    
    if (ctx && typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Linear Regression', 'Random Forest', 'XGBoost'],
                datasets: [
                    {
                        label: 'RMSE',
                        data: [9.3, 9.3, 9.3],
                        backgroundColor: '#1565C0',
                        borderColor: '#0D47A1',
                        borderWidth: 2,
                        borderRadius: 8
                    },
                    {
                        label: 'MAE',
                        data: [10, 10, 10],
                        backgroundColor: '#64B5F6',
                        borderColor: '#42A5F5',
                        borderWidth: 2,
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            padding: 15,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14,
                            weight: '600'
                        },
                        bodyFont: {
                            size: 13
                        },
                        cornerRadius: 8
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#666'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#666'
                        }
                    }
                }
            }
        });
    }
    
    // Handle dropdown change
    const stationDropdown = new Dropdown('station-dropdown', {
        items: [
            { value: "s1", text: "S1 - Giao thong" },
            { value: "s2", text: "S2 - Residential" },
            { value: "s3", text: "S3 - Industrial" }
        ],
        defaultItem: "s1"
    });
    const btnCreate = document.querySelector('.btn-create');

    if (btnCreate) {
        btnCreate.addEventListener('click', function() {
            const selectedStation = stationDropdown ? stationDropdown.getText() : null;
            const stationLabel = selectedStation || "S1 - Giao thong";
            alert('Dang tao bao cao cho tram: ' + stationLabel);
        });
    }
});
