// Khởi tạo biểu đồ xu hướng
document.addEventListener('DOMContentLoaded', function() {
    // ------------------------------------------------------------------------------
    // Hàm xử lý chế độ công khai/quản lý
    // ------------------------------------------------------------------------------
    function getCurrentMode() {
        const saved = localStorage.getItem('currentMode');
        return saved || 'public';
    }

    function applyModeVisibility(mode) {
        const isManagement = mode === 'management';

        // Áp dụng visibility cho các phần tử có data-requires
        const managementOnly = document.querySelectorAll('[data-requires="management"]');
        const publicOnly = document.querySelectorAll('[data-requires="public"]');

        managementOnly.forEach(el => { el.hidden = !isManagement; });
        publicOnly.forEach(el => { el.hidden = isManagement; });

        // Fix layout bottom-row: 1 card → full width, 2 card → cùng chiều cao
        document.querySelectorAll('.bottom-row').forEach(function(row) {
            var visible = Array.from(row.children).filter(function(el) { return !el.hidden; });
            row.classList.toggle('single-card', visible.length === 1);
        });

        // Cập nhật trạng thái nút refresh dựa trên chế độ
        const refreshButton = document.getElementById('refreshButton');
        if (refreshButton) {
            if (isManagement) {
                refreshButton.disabled = false;
                refreshButton.title = 'Làm mới dữ liệu';
                refreshButton.style.opacity = '1';
                refreshButton.style.cursor = 'pointer';
            } else {
                refreshButton.disabled = true;
                refreshButton.title = 'Chức năng này chỉ khả dụng ở chế độ quản lý';
                refreshButton.style.opacity = '0.5';
                refreshButton.style.cursor = 'not-allowed';
            }
        }
    }

    // Áp dụng chế độ khi trang tải
    const initialMode = getCurrentMode();
    applyModeVisibility(initialMode);

    // Lắng nghe sự kiện thay đổi chế độ từ sidebar
    window.addEventListener('modeChanged', function(event) {
        const newMode = event.detail.mode;
        applyModeVisibility(newMode);
        console.log('Chế độ đã thay đổi:', newMode);
    });

    // Biến dùng chung cho biểu đồ xu hướng nhiều chỉ số
    let trendMulti = null;   // dữ liệu xu hướng cho nhiều chỉ số (từ backend)
    let trendChart = null;   // instance Chart.js cho trendChart

    // Biến dùng chung cho bản đồ Leaflet
    let overviewMap = null;
    let overviewMarkersLayer = null;

    // Cấu hình base URL cho API (chạy được cả khi mở file trực tiếp hoặc qua Flask server)
    const API_BASE = (window.location.origin && window.location.origin.startsWith('http'))
        ? window.location.origin
        : 'http://127.0.0.1:5000';

    // Tọa độ địa lý (lat, lng) thật của từng trạm HealthyAir (HCMC)
    // Lấy từ bảng station info trong paper HealthyAir AQMN
    const STATION_COORDS = {
        1: { lat: 10.8699433, lng: 106.7960143 }, // S1 - Vietnam National University, Thủ Đức
        2: { lat: 10.7409708, lng: 106.6171323 }, // S2 - An Lạc, Bình Tân
        3: { lat: 10.8162123, lng: 106.6204143 }, // S3 - KCN Tân Bình, Tân Phú
        4: { lat: 10.8158455, lng: 106.7174282 }, // S4 - Thanh Đa, Bình Thạnh
        5: { lat: 10.7763661, lng: 106.6878094 }, // S5 - Nguyễn Đình Chiểu, Quận 3
        6: { lat: 10.7804716, lng: 106.6594579 }, // S6 - Trường Sơn, Quận 10
    };

    // Tên hiển thị của trạm theo quận/khu vực
    const STATION_LABELS = {
        1: 'Trạm Thủ Đức',
        2: 'Trạm Bình Tân',
        3: 'Trạm Tân Phú',
        4: 'Trạm Bình Thạnh',
        5: 'Trạm Quận 3',
        6: 'Trạm Quận 10',
    };

    // Khởi tạo bản đồ Leaflet (nếu thư viện đã được load)
    if (typeof L !== 'undefined') {
        const mapElement = document.getElementById('overview-map');
        if (mapElement) {
            overviewMap = L.map('overview-map', {
                zoomControl: true
            }).setView([10.79, 106.68], 11);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(overviewMap);

            overviewMarkersLayer = L.layerGroup().addTo(overviewMap);
        }
    }

    // ------------------------------------------------------------------------------
    // Lấy dữ liệu KPI từ backend qua API Flask (chạy bằng python server.py)
    // Nếu mở trực tiếp file HTML (file://) thì vẫn fallback về http://127.0.0.1:5000
    // ------------------------------------------------------------------------------
    fetch(`${API_BASE}/api/overview`)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('HTTP status ' + response.status);
            }
            return response.json();
        })
        .then(function(data) {
            // Card 1: Tổng số trạm quan sát hiện có
            const totalStationsEl = document.querySelector('.summary-cards .summary-band-item:first-child .summary-band-value');
            if (totalStationsEl && typeof data.num_stations === 'number') {
                // Giữ style 2 chữ số giống "06 Trạm"
                const formatted = data.num_stations.toString().padStart(2, '0') + ' Trạm';
                totalStationsEl.textContent = formatted;
            }

            // Card 2: Trạm có mức độ ô nhiễm cao nhất
            const mostPollutedEl = document.querySelector('.summary-cards .summary-band-item:nth-child(2) .summary-band-value');
            if (mostPollutedEl && data.most_polluted_station != null && data.most_polluted_value != null) {
                const stationLabel = 'Trạm S' + data.most_polluted_station;
                const valueLabel = data.most_polluted_value.toFixed(1) + ' µg/m³';
                mostPollutedEl.textContent = stationLabel + ' (' + valueLabel + ')';
            }

            // Subtitle của card 2: loại khu vực (Giao thông/Dân cư/Công nghiệp)
            const mostPollutedSubtitleEl = document.querySelector('.summary-cards .summary-band-item:nth-child(2) .summary-band-subtitle');
            if (mostPollutedSubtitleEl && data.most_polluted_type) {
                mostPollutedSubtitleEl.textContent = data.most_polluted_type;
            }

            // Card 3: Chỉ số PM2.5 trung bình (24h)
            const avgValueEl = document.querySelector('.summary-cards .summary-band-item:nth-child(3) .summary-band-value');
            const avgPillEl = document.querySelector('.summary-cards .summary-band-item:nth-child(3) .summary-band-pill');

            if (avgValueEl && typeof data.avg_pm25_today === 'number') {
                avgValueEl.textContent = data.avg_pm25_today.toFixed(1) + ' µg/m³';
            }

            if (avgPillEl && typeof data.change_pct === 'number' && data.arrow) {
                const arrowText = data.arrow === '↑' ? '↑ ' : data.arrow === '↓' ? '↓ ' : '';
                const sign = data.change_pct > 0 ? '+' : '';
                avgPillEl.textContent = arrowText + sign + data.change_pct.toFixed(1) + '% so với hôm qua';
            }

            // ------------------------------------------------------------------
            // Bản đồ các trạm: vẽ marker động bằng Leaflet từ dữ liệu backend
            // ------------------------------------------------------------------
            if (overviewMap && overviewMarkersLayer && Array.isArray(data.stations)) {
                overviewMarkersLayer.clearLayers();

                const markerLatLngs = [];

                data.stations.forEach(function(station) {
                    const coord = STATION_COORDS[station.id];
                    if (!coord) return;

                    const label = STATION_LABELS[station.id] || ('Trạm S' + station.id);
                    const typeText = station.type || 'N/A';
                    const pmText = typeof station.pm25 === 'number'
                        ? station.pm25.toFixed(1) + ' µg/m³'
                        : 'N/A';
                    const levelText = station.level_vi || station.level_en || 'Không xác định';

                    const popupHtml =
                        `<strong>${label}</strong><br>` +
                        `Loại khu vực: ${typeText}<br>` +
                        `PM2.5: ${pmText}<br>` +
                        `Mức: ${levelText}`;

                    const marker = L.marker([coord.lat, coord.lng]);
                    marker.bindPopup(popupHtml);
                    marker.addTo(overviewMarkersLayer);

                    markerLatLngs.push([coord.lat, coord.lng]);
                });

                if (markerLatLngs.length > 0) {
                    overviewMap.fitBounds(markerLatLngs, { padding: [20, 20] });
                }
            }

            // ------------------------------------------------------------------
            // Biểu đồ xu hướng: dùng dữ liệu 7 ngày gần nhất từ backend
            // Hỗ trợ nhiều chỉ số (PM2.5, CO, SO2, TSP, ...)
            // ------------------------------------------------------------------
            const trendCtx = document.getElementById('trendChart');
            if (trendCtx) {
                // Lưu dữ liệu xu hướng đa chỉ số nếu backend cung cấp
                if (data.trend_multi) {
                    trendMulti = data.trend_multi;
                } else if (Array.isArray(data.trend_labels) && Array.isArray(data.trend_values)) {
                    // Fallback: chỉ có PM2.5
                    trendMulti = {
                        pm25: {
                            labels: data.trend_labels,
                            values: data.trend_values,
                        },
                    };
                }

                // Hàm helper cập nhật biểu đồ theo chỉ số
                const updateTrendChart = function(metricKey, metricLabel) {
                    if (!trendMulti || !trendMulti[metricKey]) {
                        console.warn('Không có dữ liệu xu hướng cho chỉ số:', metricKey);
                        return;
                    }

                    const labels = trendMulti[metricKey].labels || [];
                    const values = trendMulti[metricKey].values || [];
                    if (!labels.length || !values.length) {
                        console.warn('Dữ liệu xu hướng rỗng cho chỉ số:', metricKey);
                        return;
                    }

                    const yMin = Math.min.apply(null, values);
                    const yMax = Math.max.apply(null, values);

                    const datasetLabel = (metricLabel || metricKey.toUpperCase()) + ' (µg/m³)';

                    if (trendChart) {
                        // Cập nhật chart hiện tại
                        trendChart.data.labels = labels;
                        trendChart.data.datasets[0].data = values;
                        trendChart.data.datasets[0].label = datasetLabel;
                        trendChart.options.scales.y.min = Math.max(0, yMin - 5);
                        trendChart.options.scales.y.max = yMax + 5;
                        trendChart.update();
                    } else {
                        // Tạo chart mới lần đầu
                        trendChart = new Chart(trendCtx, {
                            type: 'line',
                            data: {
                                labels: labels,
                                datasets: [{
                                    label: datasetLabel,
                                    data: values,
                                    borderColor: '#FFFFFF',
                                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                                    borderWidth: 2,
                                    fill: true,
                                    tension: 0.4,
                                    pointRadius: 3,
                                    pointHoverRadius: 5,
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
                                                return datasetLabel.split(' (')[0] + ': ' + context.parsed.y + ' µg/m³';
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
                                            color: '#ffffff',
                                            font: {
                                                size: 11
                                            }
                                        },
                                        border: {
                                            color: '#475569'
                                        }
                                    },
                                    y: {
                                        min: Math.max(0, yMin - 5),
                                        max: yMax + 5,
                                        grid: { display: false },
                                        ticks: {
                                            color: '#ffffff',
                                            font: {
                                                size: 11
                                            }
                                        },
                                        border: {
                                            color: '#475569'
                                        }
                                    }
                                }
                            }
                        });
                    }
                };

                // Khởi tạo mặc định với PM2.5 nếu có
                if (trendMulti && trendMulti.pm25) {
                    updateTrendChart('pm25', 'PM2.5');
                }

                // Lưu hàm updateTrendChart vào window để dropdown có thể gọi
                window.__updateTrendChartFromDropdown = updateTrendChart;

                // Cập nhật items dropdown theo keys thực từ trendMulti
                if (trendMulti) {
                    var METRIC_LABELS = {
                        pm25: 'PM2.5', co: 'CO', co2: 'CO2', so2: 'SO2',
                        tsp: 'TSP', no2: 'NO2', o3: 'O3',
                        temperature: 'Nhiệt độ', humidity: 'Độ ẩm'
                    };
                    var availableItems = Object.keys(trendMulti).map(function(key) {
                        return { value: key, text: METRIC_LABELS[key] || key.toUpperCase() };
                    });
                    if (availableItems.length > 0 && window.__indexDropdownInstance) {
                        window.__indexDropdownInstance.setItems(availableItems);
                        var firstKey = availableItems.find(function(i) { return i.value === 'pm25'; })
                            ? 'pm25' : availableItems[0].value;
                        if (typeof window.__indexDropdownInstance._selectSilent === 'function') {
                            window.__indexDropdownInstance._selectSilent(firstKey);
                        }
                    }
                }
            }

            // ------------------------------------------------------------------
            // Giải thích xu hướng (text) dưới dạng bullet list
            // ------------------------------------------------------------------
            const explanationList = document.querySelector('.explanation-list');
            if (explanationList) {
                explanationList.innerHTML = '';

                // 1) Mức PM2.5 trung bình hôm nay so với chuẩn WHO 24h = 15 µg/m³
                if (typeof data.avg_pm25_today === 'number') {
                    const li1 = document.createElement('li');
                    const today = data.avg_pm25_today;
                    const diffToWho = today - 15;
                    let statusText;
                    if (today <= 15) {
                        statusText = 'dưới ngưỡng khuyến nghị của WHO (tốt).';
                    } else if (today <= 35.4) {
                        statusText = 'cao hơn ngưỡng WHO nhưng vẫn ở mức trung bình.';
                    } else {
                        statusText = 'cao hơn nhiều so với ngưỡng WHO, cần hạn chế các hoạt động ngoài trời.';
                    }
                    li1.textContent = `PM2.5 trung bình 24h hiện tại là ${today.toFixed(1)} µg/m³, ${statusText}`;
                    explanationList.appendChild(li1);
                }

                // 2) So sánh hôm nay – hôm qua
                if (typeof data.change_pct === 'number' && typeof data.avg_pm25_yesterday === 'number') {
                    const li2 = document.createElement('li');
                    const directionText =
                        data.change_pct > 0 ? 'tăng' :
                        data.change_pct < 0 ? 'giảm' :
                        'gần như không đổi';
                    li2.textContent =
                        `So với hôm qua (${data.avg_pm25_yesterday.toFixed(1)} µg/m³), ` +
                        `PM2.5 hôm nay ${directionText} ${Math.abs(data.change_pct).toFixed(1)}%.`;
                    explanationList.appendChild(li2);
                }

                // 3) Trạm ô nhiễm nhất hiện tại
                if (data.most_polluted_station != null && typeof data.most_polluted_value === 'number') {
                    const li3 = document.createElement('li');
                    li3.textContent =
                        `Trạm ô nhiễm nhất hiện tại là trạm S${data.most_polluted_station} ` +
                        `với PM2.5 trung bình ${data.most_polluted_value.toFixed(1)} µg/m³.`;
                    explanationList.appendChild(li3);
                }

                // 4) Xu hướng 7 ngày gần nhất (dựa trên PM2.5)
                const pm25Trend = data.trend_multi && data.trend_multi.pm25;
                if (pm25Trend && Array.isArray(pm25Trend.values) && pm25Trend.values.length >= 2) {
                    const li4 = document.createElement('li');
                    const first = pm25Trend.values[0];
                    const last = pm25Trend.values[pm25Trend.values.length - 1];
                    const diff = last - first;
                    let trendText;
                    if (diff > 1) {
                        trendText = 'PM2.5 có xu hướng tăng dần trong 7 ngày gần đây.';
                    } else if (diff < -1) {
                        trendText = 'PM2.5 có xu hướng giảm dần trong 7 ngày gần đây.';
                    } else {
                        trendText = 'PM2.5 tương đối ổn định trong 7 ngày gần đây.';
                    }
                    li4.textContent = trendText;
                    explanationList.appendChild(li4);
                }
            }

            // ------------------------------------------------------------------
            // Biểu đồ quản lý: số giờ trong ngày PM2.5 > 15 µg/m³
            // tại top 3 trạm tệ nhất (chỉ xem ở chế độ quản lý)
            // ------------------------------------------------------------------
            const hoursChartCanvas = document.getElementById('hoursAboveThresholdChart');
            if (hoursChartCanvas && Array.isArray(data.hours_above_threshold_labels) && Array.isArray(data.hours_above_threshold_values)) {
                const labels3 = data.hours_above_threshold_labels;
                const values3 = data.hours_above_threshold_values;

                if (labels3.length === values3.length && labels3.length > 0) {
                    new Chart(hoursChartCanvas, {
                        type: 'bar',
                        data: {
                            labels: labels3,
                            datasets: [{
                                label: 'Số giờ PM2.5 > 15 µg/m³',
                                data: values3,
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: 0, // làm cột bo tròn giống viên thuốc
                                borderSkipped: false,
                                barPercentage: 0.4,
                                categoryPercentage: 0.5
                            }]
                        },
                        options: {
                            indexAxis: 'x', // cột thẳng đứng
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    padding: 12,
                                    titleFont: { size: 14, weight: 'bold' },
                                    bodyFont: { size: 13 },
                                    callbacks: {
                                        label: function(context) {
                                            return context.parsed.y + ' giờ vượt ngưỡng';
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: {
                                        color: '#ffffff',
                                        font: { size: 12, weight: '500' }
                                    },
                                    border: { display: false }
                                },
                                y: {
                                    beginAtZero: true,
                                    grid: {
                                        color: 'rgba(255, 255, 255, 0.2)',
                                        borderDash: [4, 4]
                                    },
                                    ticks: {
                                        color: '#ffffff',
                                        font: { size: 11 }
                                    },
                                    border: { display: false }
                                }
                            }
                        }
                    });

                    // Sinh nhận xét xu hướng cho khối quản lý
                    const managementDetails = document.getElementById('management-details');
                    if (managementDetails) {
                        managementDetails.innerHTML = '';

                        // Nhận xét 1: trạm tệ nhất và số giờ vượt ngưỡng
                        const worstIndex = values3.indexOf(Math.max.apply(null, values3));
                        const worstStation = labels3[worstIndex];
                        const worstHours = values3[worstIndex];
                        const liWorst = document.createElement('li');
                        liWorst.textContent = `${worstStation} là trạm có số giờ PM2.5 vượt 15 µg/m³ nhiều nhất trong ngày (khoảng ${worstHours} giờ).`;
                        managementDetails.appendChild(liWorst);

                        // Nhận xét 2: so sánh top 1 và top 3
                        if (values3.length >= 3) {
                            const sorted = [...values3].sort((a, b) => b - a);
                            const top1 = sorted[0];
                            const top3 = sorted[2];
                            const diff = top1 - top3;
                            const liGap = document.createElement('li');
                            liGap.textContent =
                                diff > 0
                                    ? `Chênh lệch giữa trạm tệ nhất và trạm đứng thứ 3 là khoảng ${diff} giờ vượt ngưỡng.`
                                    : `Ba trạm tệ nhất có số giờ vượt ngưỡng khá tương đồng (chênh lệch nhỏ).`;
                            managementDetails.appendChild(liGap);
                        }

                        // Nhận xét 3: mức độ rủi ro tổng quan trong ngày
                        const totalHours = values3.reduce((sum, v) => sum + v, 0);
                        const liTotal = document.createElement('li');
                        liTotal.textContent =
                            `Tổng cộng, top 3 trạm tệ nhất đã có khoảng ${totalHours} giờ PM2.5 vượt ngưỡng 15 µg/m³ trong ngày, ` +
                            `cho thấy rủi ro ô nhiễm kéo dài tại các khu vực này.`;
                        managementDetails.appendChild(liTotal);
                    }
                }
            }

            // ------------------------------------------------------------------
            // Biểu đồ xếp hạng mức độ ô nhiễm theo trạm (6 trạm, highlight Top 1 theo PM2.5 trung bình)
            // Sử dụng dữ liệu từ backend: ranking_labels và ranking_values
            // ------------------------------------------------------------------
            const rankingCtx = document.getElementById('rankingChart');
            if (rankingCtx) {
                // Dữ liệu mặc định (fallback nếu backend không cung cấp)
                let labels = ['S2', 'S4', 'S6', 'S5', 'S3', 'S1'];
                let values = [52.1, 48.3, 42.7, 38.9, 35.2, 32.1];

                // Sử dụng dữ liệu xếp hạng từ backend nếu có
                if (Array.isArray(data.ranking_labels) && Array.isArray(data.ranking_values) &&
                    data.ranking_labels.length === data.ranking_values.length && data.ranking_labels.length > 0) {
                    labels = data.ranking_labels;
                    values = data.ranking_values;
                }

                // Xác định Top 1 (giá trị lớn nhất) để tô màu nổi bật
                let topIndex = 0;
                for (let i = 1; i < values.length; i++) {
                    if (values[i] > values[topIndex]) {
                        topIndex = i;
                    }
                }

                const barColors = values.map((_, idx) =>
                    idx === topIndex ? '#EF4444' : '#F97316'
                );

                new Chart(rankingCtx, {
                    type: 'bar',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'PM 2.5 (µg/m³)',
                            data: values,
                            backgroundColor: barColors,
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
                                    color: '#ffffff',
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
                                    color: '#ffffff',
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
        })
        .catch(function(error) {
            console.error('Không thể tải KPI từ backend:', error);
        });

    // Xử lý nút Refresh (chỉ hoạt động ở chế độ quản lý)
    const refreshBtn = document.getElementById('refreshButton');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            // Có thể thêm logic refresh dữ liệu ở đây
            console.log('Refreshing data...');
            // Ví dụ: reload lại biểu đồ với dữ liệu mới
        });
    }

    // Chart controls
    const timeButton = document.getElementById('timeRangeButton');
    if (timeButton) {
        timeButton.addEventListener('click', function() {
            console.log('Time range clicked:', timeButton.textContent);
        });
    }

    const indexDropdownContainer = document.getElementById('index-dropdown');
    if (indexDropdownContainer && typeof Dropdown !== 'undefined') {
        window.__indexDropdownInstance = new Dropdown('index-dropdown', {
            items: [
                { value: 'pm25', text: 'PM2.5' },
                { value: 'co', text: 'CO' },
                { value: 'co2', text: 'CO2' },
                { value: 'so2', text: 'SO2' },
                { value: 'tsp', text: 'TSP' },
                { value: 'temperature', text: 'Nhiệt độ' },
                { value: 'humidity', text: 'Độ ẩm' },
                { value: 'o3', text: 'O3' }
            ],
            defaultItem: 'pm25',
            onSelect: function(value, text) {
                // Khi đổi chỉ số, cập nhật lại biểu đồ xu hướng nếu hàm toàn cục đã được gắn
                if (typeof window.__updateTrendChartFromDropdown === 'function') {
                    window.__updateTrendChartFromDropdown(value, text);
                } else {
                    console.log('Index changed (chưa có dữ liệu xu hướng):', value);
                }
            }
        });
    }

});