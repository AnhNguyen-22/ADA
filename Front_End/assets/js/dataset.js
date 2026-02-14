// 1. Dữ liệu các biến (Đã thêm thuộc tính 'stations' để phân loại)
const variables = [
    { name: 'PM2.5', unit: 'µg/m³', description: 'Bụi mịn (mục tiêu dự báo)', stations: ['s1', 's2', 's3'] },
    { name: 'PM10', unit: 'µg/m³', description: 'Bụi thô', stations: ['s1', 's2', 's3'] },
    { name: 'NO2', unit: 'µg/m³', description: 'Nitrogen dioxide', stations: ['s1', 's2'] },
    { name: 'O3', unit: 'µg/m³', description: 'Ozone', stations: ['s1', 's2', 's3'] },
    { name: 'SO2', unit: 'µg/m³', description: 'Lưu huỳnh dioxide', stations: ['s1', 's3'] }, 
    { name: 'CO', unit: 'µg/m³', description: 'Carbon monoxide', stations: ['s1', 's2', 's3'] },
    { name: 'Temp', unit: '°C', description: 'Nhiệt độ', stations: ['s1', 's2', 's3'] },
    { name: 'Humid', unit: '%', description: 'Độ ẩm', stations: ['s1', 's2', 's3'] }
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
}
// --------------------------------------------------------------------

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
            
            // Cấu trúc Grid cho Heatmap
            container.style.display = 'grid';
            container.style.gridTemplateColumns = `max-content repeat(${apiVars.length}, 1fr)`;
            container.style.gap = '2px';
            
            // Ô góc trên cùng bên trái (trống)
            container.appendChild(document.createElement('div'));
            
            // Hàng tiêu đề ngang (Áp dụng formatSubscript)
            apiVars.forEach(variable => {
                const headerCell = document.createElement('div');
                headerCell.className = 'heatmap-header-cell';
                headerCell.textContent = formatSubscript(variable);
                container.appendChild(headerCell);
            });
            
            // Dữ liệu cho từng hàng
            apiVars.forEach((rowVar, rowIndex) => {
                // Nhãn của hàng dọc (Áp dụng formatSubscript)
                const rowLabel = document.createElement('div');
                rowLabel.className = 'heatmap-row-label';
                rowLabel.textContent = formatSubscript(rowVar);
                container.appendChild(rowLabel);
                
                // Các ô giá trị
                apiVars.forEach((colVar, colIndex) => {
                    const cell = document.createElement('div');
                    cell.className = 'heatmap-cell';
                    
                    const value = matrix[rowIndex][colIndex];
                    cell.textContent = value.toFixed(2); 
                    
                    const absValue = Math.abs(value);
                    let bgColor, textColor;

                    // Phân dải màu cho số dương
                    if (absValue >= 0.8) {
                        bgColor = '#00695c';   
                        textColor = '#ffffff'; 
                    } else if (absValue >= 0.6) {
                        bgColor = '#26a69a';   
                        textColor = '#ffffff'; 
                    } else if (absValue >= 0.4) {
                        bgColor = '#4db6ac';   
                        textColor = '#ffffff'; 
                    } else if (absValue >= 0.2) {
                        bgColor = '#80cbc4';   
                        textColor = '#013a59'; 
                    } else {
                        bgColor = '#e0f2f1';   
                        textColor = '#013a59'; 
                    }

                    // Phân dải màu cho số âm
                    if (value < 0) {
                        if (absValue >= 0.8) {
                            bgColor = '#b71c1c';   
                            textColor = '#ffffff'; 
                        } else if (absValue >= 0.6) {
                            bgColor = '#e53935';   
                            textColor = '#ffffff'; 
                        } else if (absValue >= 0.4) {
                            bgColor = '#ef5350';   
                            textColor = '#ffffff'; 
                        } else if (absValue >= 0.2) {
                            bgColor = '#ef9a9a';   
                            textColor = '#013a59'; 
                        } else {
                            bgColor = '#ffebee';   
                            textColor = '#013a59'; 
                        }
                    }

                    cell.style.backgroundColor = bgColor;
                    cell.style.color = textColor;
                    
                    // Tooltip hiển thị khi rê chuột
                    const fRow = formatSubscript(rowVar);
                    const fCol = formatSubscript(colVar);
                    cell.title = `Tương quan giữa ${fRow} và ${fCol}:\n${value.toFixed(4)}`;
                    
                    container.appendChild(cell);
                });
            });
        })
        .catch(error => {
            console.error('Lỗi khi tải Heatmap:', error);
            container.innerHTML = '<div style="color: red;">Không thể kết nối Server để lấy dữ liệu tương quan.</div>';
        });
}

// 3. Hàm render giao diện Danh sách Biến (Lưới / Bảng)
function renderVariableView() {
    const container = document.querySelector('.variable-table-container');
    if (!container) return;

    // Lọc danh sách biến dựa trên trạm đang chọn
    const filteredVars = variables.filter(v => v.stations.includes(currentStation));

    if (currentMode === 'list') {
        // --- VẼ DẠNG DANH SÁCH (BẢNG) ---
        let html = `
            <table class="variable-table">
                <thead>
                    <tr>
                        <th>Biến</th>
                        <th>Đơn vị</th>
                        <th>Mô tả</th>
                    </tr>
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
        // --- VẼ DẠNG LƯỚI (THẺ CARD) ---
        let html = `<div class="variable-grid">`;
        filteredVars.forEach(variable => {
            html += `
                <div class="variable-card">
                    <div class="var-card-name">${formatSubscript(variable.name)}</div>
                    <div class="var-card-unit">${variable.unit}</div>
                    <div class="var-card-desc">${variable.description}</div>
                </div>
            `;
        });
        html += `</div>`;
        container.innerHTML = html;
    }
}

// 4. Khởi tạo Dropdown chuyển đổi Lưới/Danh sách & Chọn Trạm
function setupDropdowns() {
    const modeDropdown = new Dropdown('modeDropdown', {
        items: [
            { value: 'list', text: 'Danh sách' },
            { value: 'grid', text: 'Lưới' }
        ],
        defaultItem: 'list',
        onSelect: function(value) {
            currentMode = value; 
            renderVariableView(); // Gọi lệnh vẽ lại màn hình
        }
    });

    const stationDropdown = new Dropdown('stationDropdown', {
        items: [
            { value: 's1', text: 'S1' },
            { value: 's2', text: 'S2' },
            { value: 's3', text: 'S3' }
        ],
        defaultItem: 's1',
        onSelect: function(value) {
            currentStation = value;
            renderVariableView(); // Gọi lệnh vẽ lại màn hình
        }
    });
}

// 5. Load dữ liệu CSV gốc vào bảng dưới cùng
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

                // Tạo Tiêu đề cột bảng (Áp dụng formatSubscript)
                const columns = Object.keys(data[0]);
                tableHead.innerHTML = '';
                columns.forEach(col => {
                    const th = document.createElement('th');
                    th.textContent = formatSubscript(col);
                    tableHead.appendChild(th);
                });

                // Tạo Nội dung bảng (Dữ liệu gốc giữ nguyên)
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
        .catch(error => {
            console.error('Lỗi khi fetch data:', error);
            tableBody.innerHTML = '<tr><td colspan="10" style="color:red; text-align:center;">Không thể kết nối đến máy chủ.</td></tr>';
        });
}

// 6. Khởi động mọi thứ khi tải trang
document.addEventListener('DOMContentLoaded', function() {
    createHeatmap();
    setupDropdowns();
    renderVariableView(); // Thay cho populateVariableTable cũ
    loadDataset();
});