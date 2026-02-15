// 1. Dữ liệu các biến (Giữ nguyên description, cập nhật Link ảnh mới)
const variables = [
    { 
        name: 'PM2.5', 
        unit: 'µg/m³', 
        fullName: 'Particulate Matter 2.5 - Bụi mịn PM2.5',
        phonetic: '/pɑːrˈtɪkjələt ˈmætər tuː pɔɪnt faɪv/',
        description: 'Các hạt bụi siêu nhỏ có đường kính dưới 2.5 micromet, có thể xâm nhập sâu vào phổi và máu.', 
        image: '../assets/img/dataset_grid_PM.jpg', 
        imagePosition: '7% center',
        imageSize: '180%',
    },
    { 
        name: 'PM10', 
        unit: 'µg/m³', 
        fullName: 'Particulate Matter 10 - Bụi mịn PM10',
        phonetic: '/pɑːrˈtɪkjələt ˈmætər ten/',
        description: 'Các hạt bụi có đường kính dưới 10 micromet, bao gồm bụi, phấn hoa và nấm mốc. Gây kích ứng niêm mạc mắt, mũi, họng; tích tụ trong các phế quản lớn.', 
        image: '../assets/img/dataset_grid_PM.jpg',
        imagePosition: '80% center',
        imageSize: '160%',
    },
    { 
        name: 'NO2', 
        unit: 'µg/m³', 
        fullName: 'Nitrogen dioxide',
        phonetic: '/ˈnaɪtrədʒən daɪˈɒksaɪd/',
        description: 'Chất khí màu nâu đỏ, có mùi gắt, phát sinh chủ yếu từ khí thải phương tiện giao thông.Làm giảm chức năng phổi, tăng nguy cơ hen suyễn và là tác nhân chính gây mưa axit.', 
        image: '../assets/img/dataset_grid_NO2.jpg',
        imagePosition: 'left center',
        imageSize: '300%',
    },
    { 
        name: 'O3', 
        unit: 'µg/m³', 
        fullName: 'Ozone',
        phonetic: '/ˈəʊzəʊn/',
        description: 'Chất ô nhiễm thứ cấp do ánh sáng mặt trời phản ứng với khí thải. Gây sưng viêm phổi, khó thở và đau ngực.', 
        image: '../assets/img/dataset_grid_O3.webp',
        imagePosition: 'leftcenter',
        imageSize: 'cover',
    },
    { 
        name: 'SO2', 
        unit: 'µg/m³', 
        fullName: 'Sulfur (Lưu Huỳnh) dioxide',
        phonetic: '/ˈsʌlfər daɪˈɒksaɪd/',
        description: 'Sản phẩm của quá trình đốt cháy nhiên liệu hóa thạch, có mùi hắc đặc trưng. Gây kích ứng đường hô hấp cực mạnh, viêm phế quản cấp tính và phá hủy hệ sinh thái.', 
        image: '../assets/img/dataset_grid_SO2.jpg',
        imagePosition: 'left center',
        imageSize: 'cover'
    },
    { 
        name: 'CO', 
        unit: 'µg/m³', 
        fullName: 'Carbon monoxide',
        phonetic: '/ˈkɑːrbən mɒnˈɒksaɪd/',
        description: 'Khí không màu, không mùi, sinh ra do sự cháy không hoàn toàn của carbon. Ngăn cản máu vận chuyển oxy, gây đau đầu, chóng mặt và ngạt khí.', 
        image: '../assets/img/dataset_grid_CO.webp',
        imagePosition: 'center',
        imageSize: 'cover'
    },
    { 
        name: 'Temp', 
        unit: '°C', 
        fullName: 'Temperature - Nhiệt độ',
        phonetic: '/ˈtemprətʃər/',
        description: 'Yếu tố khí tượng quan trọng. Nhiệt độ cao thúc đẩy các phản ứng hóa học tạo Ozon và giữ các hạt bụi treo lơ lửng.', 
        image: '../assets/img/dataset_grid_Temp.jfif',
        imagePosition: 'center',
        imageSize: 'cover'
    },
    { 
        name: 'Humid', 
        unit: '%', 
        fullName: 'Humidity - Độ ẩm',
        phonetic: '/hjuːˈmɪdəti/',
        description: 'Độ ẩm không khí. Tác động: Ảnh hưởng đến khả năng phân tán bụi; độ ẩm cao thường đi kèm với việc tích tụ các sol khí gây mù quang hóa.', 
        image: '../assets/img/dataset_grid_Humid.jfif',
        imagePosition: 'center',
        imageSize: 'cover'
    }
];

// Biến toàn cục cho giao diện Danh sách/Lưới
let currentMode = 'grid'; // Mặc định hiển thị ở Lưới

// --- HÀM TIỆN ÍCH: Tự động chuyển đổi số thành chỉ số dưới (Subscript) ---
function formatSubscript(str) {
    if (!str) return '';
    return str
        .replace('O3', 'O₃')
        .replace('NO2', 'NO₂')
        .replace('SO2', 'SO₂');
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

// 3. Render danh sách biến (Chế độ Danh sách/Lưới)
function renderVariableView() {
    const container = document.querySelector('.variable-table-container');
    if (!container) return;

    if (currentMode === 'list') {
        // Áp dụng cuộn ngang cho bảng Danh sách
        container.style.overflowX = 'auto';
        
        let html = `
            <table class="variable-table">
                <thead>
                    <tr>
                        <th style="white-space: nowrap;">Biến</th>
                        <th style="white-space: nowrap;">Đơn vị</th>
                        <th style="white-space: nowrap;">Ý nghĩa</th>
                        <th>Mô tả</th>
                    </tr>
                </thead>
                <tbody>
        `;
        variables.forEach(v => {
            html += `
                <tr>
                    <td><strong>${formatSubscript(v.name)}</strong></td>
                    <td>${v.unit}</td>
                    <td>${v.fullName}</td>
                    <td>${v.description}</td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
        
    } else {
        // TẮT cuộn ngang ở chế độ Lưới để Popover không bị cắt xén
        container.style.overflow = 'visible';
        
        let html = `<div class="variable-grid">`;
        variables.forEach(v => {
            const pos = v.imagePosition || 'center';
            const size = v.imageSize || 'cover';
            html += `
                <div class="variable-card">
                    <div class="var-card-name">${formatSubscript(v.name)}</div>
                    <div class="var-card-unit">${v.unit}</div>
                    <div class="var-card-desc">${v.description.substring(0, 45)}...</div>
                    <div class="var-explanation-popover">
                        <div class="popover-left">
                            <h4 class="popover-title">${formatSubscript(v.name)}</h4>
                            <p class="popover-full">${v.fullName}</p>
                            <p class="popover-text">${v.description}</p>
                        </div>
                        <div class="popover-right" style="background-image: url('${v.image}'); background-position: ${pos}; background-size: ${size};"></div>
                    </div>
                </div>`;
        });
        html += `</div>`;
        container.innerHTML = html;

        // Xử lý Flip Popover
        const cards = container.querySelectorAll('.variable-card');
        cards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                const popover = card.querySelector('.var-explanation-popover');
                const cardRect = card.getBoundingClientRect();
                if (window.innerWidth - cardRect.right < 470) popover.classList.add('popover-flip');
                else popover.classList.remove('popover-flip');
            });
        });
    }
}

// 4. Khởi tạo Dropdown (Đã xóa Dropdown Trạm)
function setupDropdowns() {
    new Dropdown('modeDropdown', {
        items: [
            { value: 'grid', text: 'Lưới' }, 
            { value: 'list', text: 'Danh sách' }
        ],
        defaultItem: 'grid', // Đặt mặc định chọn Lưới
        onSelect: function(value) {
            currentMode = value; 
            renderVariableView();
        }
    });
}

// Hàm bổ trợ để định dạng số (Max 3 chữ số thập phân + dấu ...)
function formatTableData(val) {
    if (val === null || val === undefined || val === "") return "-";
    let strVal = val.toString();
    if (!isNaN(val) && strVal.includes('.')) {
        let parts = strVal.split('.');
        if (parts[1].length > 3) {
            return parseFloat(val).toFixed(3) + "...";
        }
    }
    return val;
}

// 5. Load dữ liệu CSV gốc vào bảng
// Hàm tải dữ liệu chi tiết
function loadDataset() {
    fetch('http://127.0.0.1:5000/api/dataset')
        .then(res => res.json())
        .then(result => {
            if (result.status !== 'success') return;
            const data = result.data;
            const head = document.getElementById('tableHead');
            const body = document.getElementById('tableBody');
            
            if (data.length === 0) return;

            const cols = Object.keys(data[0]);
            
            // --- VẼ HEADER ---
            head.innerHTML = '';
            cols.forEach(c => {
                const th = document.createElement('th');
                th.textContent = formatSubscript(c);
                head.appendChild(th); 
            });

            // --- VẼ BODY ---
            body.innerHTML = ''; 
            data.forEach(row => {
                const tr = document.createElement('tr');
                cols.forEach(c => {
                    const td = document.createElement('td');
                    
                    const rawValue = row[c]; 
                    const formattedValue = formatTableData(rawValue); 

                    td.textContent = formattedValue;
                    
                    if (formattedValue.toString().includes('...')) {
                        td.title = rawValue; 
                        td.style.cursor = 'help'; 
                    }

                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        })
        .catch(err => {
            console.error("Lỗi tải bảng chi tiết:", err);
            // Đổi chữ cảnh báo thành màu trắng để dễ đọc trên nền trong suốt
            document.getElementById('tableBody').innerHTML = '<tr><td colspan="10" style="color:#ffffff; text-align:center; padding: 20px;">Lỗi tải dữ liệu. Bạn hãy kiểm tra xem Server Python đã được bật chưa nhé!</td></tr>';
        });
}

// 6. Khởi chạy
document.addEventListener('DOMContentLoaded', function() {
    createHeatmap();
    setupDropdowns();
    renderVariableView();
    loadDataset();
});