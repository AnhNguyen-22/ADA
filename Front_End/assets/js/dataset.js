// 1. Dữ liệu các biến (Giữ nguyên description, cập nhật Link ảnh mới)
const variables = [
    { 
        name: 'PM2.5', 
        unit: 'µg/m³', 
        fullName: 'Particulate Matter 2.5',
        phonetic: '/pɑːrˈtɪkjələt ˈmætər tuː pɔɪnt faɪv/',
        description: 'Các hạt bụi siêu nhỏ có đường kính dưới 2.5 micromet, có thể xâm nhập sâu vào phổi và máu.', 
        image: 'https://cdn.tgdd.vn/hoi-dap/1203991/bui-min-pm2-5-pm10-la-gi-cach-xem-chi-so-bui.004-800x408.jpg', 
        imagePosition: '7% center',
        imageSize: '180%',
        stations: ['s1', 's2', 's3'] 
    },
    { 
        name: 'PM10', 
        unit: 'µg/m³', 
        fullName: 'Particulate Matter 10',
        phonetic: '/pɑːrˈtɪkjələt ˈmætər ten/',
        description: 'Các hạt bụi có đường kính dưới 10 micromet, bao gồm bụi, phấn hoa và nấm mốc. Gây kích ứng niêm mạc mắt, mũi, họng; tích tụ trong các phế quản lớn.', 
        image: 'https://images.unsplash.com/photo-1524143825310-867f707f1697?q=80&w=400',
        stations: ['s1', 's2', 's3'] 
    },
    { 
        name: 'NO2', 
        unit: 'µg/m³', 
        fullName: 'Nitrogen dioxide',
        phonetic: '/ˈnaɪtrədʒən daɪˈɒksaɪd/',
        description: 'Chất khí màu nâu đỏ, có mùi gắt, phát sinh chủ yếu từ khí thải phương tiện giao thông.Làm giảm chức năng phổi, tăng nguy cơ hen suyễn và là tác nhân chính gây mưa axit.', 
        image: 'https://images.unsplash.com/photo-1616432043562-3671ea2e5241?q=80&w=400',
        stations: ['s1', 's2'] 
    },
    { 
        name: 'O3', 
        unit: 'µg/m³', 
        fullName: 'Ozone',
        phonetic: '/ˈəʊzəʊn/',
        description: 'Chất ô nhiễm thứ cấp do ánh sáng mặt trời phản ứng với khí thải. Gây sưng viêm phổi, khó thở và đau ngực.', 
        image: 'https://images.unsplash.com/photo-1599388144837-293699b68c9c?q=80&w=400',
        stations: ['s1', 's2', 's3'] 
    },
    { 
        name: 'SO2', 
        unit: 'µg/m³', 
        fullName: 'Sulfur (Lưu Huỳnh) dioxide',
        phonetic: '/ˈsʌlfər daɪˈɒksaɪd/',
        description: 'Sản phẩm của quá trình đốt cháy nhiên liệu hóa thạch, có mùi hắc đặc trưng. Gây kích ứng đường hô hấp cực mạnh, viêm phế quản cấp tính và phá hủy hệ sinh thái.', 
        image: 'https://images.unsplash.com/photo-1580193769210-b8d1c049a7d9?q=80&w=400',
        stations: ['s1', 's3'] 
    },
    { 
        name: 'CO', 
        unit: 'µg/m³', 
        fullName: 'Carbon monoxide',
        phonetic: '/ˈkɑːrbən mɒnˈɒksaɪd/',
        description: 'Khí không màu, không mùi, sinh ra do sự cháy không hoàn toàn của carbon. Ngăn cản máu vận chuyển oxy, gây đau đầu, chóng mặt và ngạt khí.', 
        image: 'https://images.unsplash.com/photo-1532187643603-ba119ca4109e?q=80&w=400',
        stations: ['s1', 's2', 's3'] 
    },
    { 
        name: 'Temp', 
        unit: '°C', 
        fullName: 'Temperature - Nhiệt độ',
        phonetic: '/ˈtemprətʃər/',
        description: 'Yếu tố khí tượng quan trọng. Nhiệt độ cao thúc đẩy các phản ứng hóa học tạo Ozon và giữ các hạt bụi treo lơ lửng.', 
        image: 'https://images.unsplash.com/photo-1504370805625-d32c54b16100?q=80&w=400',
        stations: ['s1', 's2', 's3'] 
    },
    { 
        name: 'Humid', 
        unit: '%', 
        fullName: 'Humidity - Độ ẩm',
        phonetic: '/hjuːˈmɪdəti/',
        description: 'Độ ẩm không khí. Tác động: Ảnh hưởng đến khả năng phân tán bụi; độ ẩm cao thường đi kèm với việc tích tụ các sol khí gây mù quang hóa.', 
        image: 'https://images.unsplash.com/photo-1485236715568-ddc5ee6ca227?q=80&w=400',
        stations: ['s1', 's2', 's3'] 
    }
];

// Biến toàn cục cho giao diện Danh sách/Lưới
let currentMode = 'list';
let currentStation = 's1';

// --- HÀM TIỆN ÍCH: Tự động chuyển đổi số thành chỉ số dưới (Subscript) ---
function formatSubscript(str) {
    if (!str) return '';
    return str
        .replace('O3', 'O₃')
        .replace('NO2', 'NO₂')
        .replace('SO2', 'SO₂')
        .replace('PM2.5', 'PM₂.₅')
        .replace('PM10', 'PM₁₀');
}

// 2. Tạo Heatmap từ API
function createHeatmap() {
    const container = document.getElementById('heatmapContainer');
    if (!container) return;

    container.innerHTML = '<div style="padding: 20px; text-align: center;">Đang tính toán ma trận tương quan từ dữ liệu...</div>';

    fetch('http://127.0.0.1:5000/api/correlation')
        .then(response => response.json())
        .then(result => {
            if (result.status !== 'success') {
                container.innerHTML = `<div style="color: red; padding: 20px;">Lỗi: ${result.message}</div>`;
                return;
            }

            const apiVars = result.variables; 
            const matrix = result.matrix;
            
            container.innerHTML = ''; 
            container.style.display = 'grid';
            container.style.gridTemplateColumns = `max-content repeat(${apiVars.length}, 1fr)`;
            container.style.gap = '2px';
            
            container.appendChild(document.createElement('div'));
            
            apiVars.forEach(variable => {
                const headerCell = document.createElement('div');
                headerCell.className = 'heatmap-header-cell';
                headerCell.textContent = formatSubscript(variable);
                container.appendChild(headerCell);
            });
            
            apiVars.forEach((rowVar, rowIndex) => {
                const rowLabel = document.createElement('div');
                rowLabel.className = 'heatmap-row-label';
                rowLabel.textContent = formatSubscript(rowVar);
                container.appendChild(rowLabel);
                
                apiVars.forEach((colVar, colIndex) => {
                    const cell = document.createElement('div');
                    cell.className = 'heatmap-cell';
                    const value = matrix[rowIndex][colIndex];
                    cell.textContent = value.toFixed(2); 
                    
                    const absValue = Math.abs(value);
                    let bgColor, textColor;

                    if (value >= 0) {
                        if (absValue >= 0.8) bgColor = '#00695c';
                        else if (absValue >= 0.6) bgColor = '#26a69a';
                        else if (absValue >= 0.4) bgColor = '#4db6ac';
                        else if (absValue >= 0.2) bgColor = '#80cbc4';
                        else bgColor = '#e0f2f1';
                        textColor = absValue >= 0.4 ? '#ffffff' : '#013a59';
                    } else {
                        if (absValue >= 0.8) bgColor = '#b71c1c';
                        else if (absValue >= 0.6) bgColor = '#e53935';
                        else if (absValue >= 0.4) bgColor = '#ef5350';
                        else if (absValue >= 0.2) bgColor = '#ef9a9a';
                        else bgColor = '#ffebee';
                        textColor = absValue >= 0.4 ? '#ffffff' : '#013a59';
                    }

                    cell.style.backgroundColor = bgColor;
                    cell.style.color = textColor;
                    const fRow = formatSubscript(rowVar);
                    const fCol = formatSubscript(colVar);
                    cell.title = `Tương quan giữa ${fRow} và ${fCol}: ${value.toFixed(4)}`;
                    container.appendChild(cell);
                });
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải Heatmap:', error);
            container.innerHTML = '<div style="color: red;">Không thể kết nối Server.</div>';
        });
}

// 3. Hàm render giao diện Danh sách Biến (Lưới / Bảng)
function renderVariableView() {
    const container = document.querySelector('.variable-table-container');
    if (!container) return;

    const filteredVars = variables.filter(v => v.stations.includes(currentStation));

    if (currentMode === 'list') {
        let html = `
            <table class="variable-table">
                <thead>
                    <tr><th>Biến</th><th>Đơn vị</th><th>Mô tả</th></tr>
                </thead>
                <tbody>
        `;
        filteredVars.forEach(variable => {
            html += `
                <tr>
                    <td><strong>${formatSubscript(variable.name)}</strong></td>
                    <td>${variable.unit}</td>
                    <td>${variable.description}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;

    } else if (currentMode === 'grid') {
        let html = `<div class="variable-grid">`;
        filteredVars.forEach(variable => {
            html += `
                <div class="variable-card">
                    <div class="var-card-name">${formatSubscript(variable.name)}</div>
                    <div class="var-card-unit">${variable.unit}</div>
                    <div class="var-card-desc">${variable.description.substring(0, 40)}...</div>

                    <div class="var-explanation-popover">
                        <div class="popover-left">
                            <h4 class="popover-title">${formatSubscript(variable.name)}</h4>
                            <p class="popover-full">${variable.fullName} <span class="phonetic">${variable.phonetic}</span></p>
                            <p class="popover-text">${variable.description}</p>
                        </div>
                        <div class="popover-right" style="background-image: url('${variable.image}')"></div>
                    </div>
                </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Xử lý lật Popover để không bị che khuất lề phải
        const cards = container.querySelectorAll('.variable-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const popover = card.querySelector('.var-explanation-popover');
                const cardRect = card.getBoundingClientRect();
                const windowWidth = window.innerWidth;

                if (windowWidth - cardRect.right < 460) {
                    popover.classList.add('popover-flip');
                } else {
                    popover.classList.remove('popover-flip');
                }
            });
        });
    }
}

// 4. Khởi tạo Dropdown
function setupDropdowns() {
    new Dropdown('modeDropdown', {
        items: [{ value: 'list', text: 'Danh sách' }, { value: 'grid', text: 'Lưới' }],
        defaultItem: 'list',
        onSelect: function(value) {
            currentMode = value; 
            renderVariableView();
        }
    });

    new Dropdown('stationDropdown', {
        items: [{ value: 's1', text: 'S1' }, { value: 's2', text: 'S2' }, { value: 's3', text: 'S3' }],
        defaultItem: 's1',
        onSelect: function(value) {
            currentStation = value;
            renderVariableView();
        }
    });
}

// 5. Load dữ liệu CSV gốc vào bảng
function loadDataset() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');

    fetch('http://127.0.0.1:5000/api/dataset')
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                const data = result.data;
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="10" style="text-align:center;">Không có dữ liệu.</td></tr>';
                    return;
                }

                const columns = Object.keys(data[0]);
                tableHead.innerHTML = '';
                columns.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = formatSubscript(col);
                    tableHead.appendChild(th);
                });

                tableBody.innerHTML = ''; 
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    columns.forEach(col => {
                        const td = document.createElement('td');
                        td.textContent = row[col];
                        tr.appendChild(td);
                    });
                    tableBody.appendChild(tr);
                });
            } else {
                tableBody.innerHTML = `<tr><td colspan="10" style="color:red; text-align:center;">Lỗi: ${result.message}</td></tr>`;
            }
        })
        .catch(err => {
            tableBody.innerHTML = '<tr><td colspan="10" style="color:red; text-align:center;">Không thể kết nối đến máy chủ.</td></tr>';
        });
}

// 6. Khởi chạy
document.addEventListener('DOMContentLoaded', function() {
    createHeatmap();
    setupDropdowns();
    renderVariableView();
    loadDataset();
});