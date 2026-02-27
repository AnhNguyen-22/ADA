/**
 * Model Evaluation Page - Frontend JS
 * Handles API calls and UI interactions
 */

// ==========================================
// Configuration
// ==========================================
// Dynamic API BASE URL - works for same origin
const API_BASE_URL = (() => {
    // If backend is on same server, use relative path
    // Otherwise use full URL to localhost:5000
    const currentProtocol = window.location.protocol;  // http: or https:
    const currentHost = window.location.hostname;      // localhost or domain
    const backendPort = '5000';
    
    // If frontend is on same machine as backend
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `${currentProtocol}//127.0.0.1:${backendPort}/api`;
    } else if (currentHost === '0.0.0.0') {
        return `${currentProtocol}//127.0.0.1:${backendPort}/api`;
    } else {
        // For production: assume backend is on same server
        // Adjust this line for your production domain
        return `${currentProtocol}//${currentHost}/api`;
    }
})();

console.log('🔌 API Base URL:', API_BASE_URL);

let currentChart = null;
let stationDropdown = null;

// ==========================================
// Initialize on page load
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Model Evaluation Page - Initializing...');
    console.log('📍 Window location:', window.location.href);
    
    try {
        // Initialize dropdown
        await initializeDropdown();
        
        // Load initial data
        await loadModelData('s1');
        
        // Setup btn-create listener
        setupCreateButtonListener();
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showErrorMessage('Lỗi khởi tạo trang. Vui lòng F5 tải lại.');
    }
});

// ==========================================
// Initialize Dropdown
// ==========================================
async function initializeDropdown() {
    try {
        console.log('📡 Fetching stations from API...');
        
        // Fetch available stations from API
        const response = await fetch(`${API_BASE_URL}/model-evaluation/stations`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✓ Stations fetched:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to fetch stations');
        }
        
        const stations = result.stations;
        const items = stations.map(station => ({
            value: station.code,
            text: station.name
        }));
        
        // Initialize dropdown with fetched stations
        stationDropdown = new Dropdown('station-dropdown', {
            items: items,
            defaultItem: 's1',
            onSelect: (stationCode) => {
                // When user selects a station, load its data
                console.log('👤 User selected station:', stationCode);
                loadModelData(stationCode);
            }
        });
        
        console.log('✓ Dropdown initialized with stations:', stations);
        
    } catch (error) {
        console.error('❌ Error initializing dropdown:', error);
        showErrorMessage(`Lỗi tải danh sách trạm: ${error.message}`);
    }
}

// ==========================================
// Handle Station Change
// ==========================================
function onStationChanged() {
    // Get selected station code from dropdown
    const selectedValue = stationDropdown?.getValue?.();
    
    if (selectedValue) {
        console.log('Station changed to:', selectedValue);
        loadModelData(selectedValue);
    }
}

// ==========================================
// Load Model Data from API
// ==========================================
async function loadModelData(stationCode) {
    try {
        console.log(`📥 Fetching data for station: ${stationCode}...`);
        console.log(`🔗 API URL: ${API_BASE_URL}/model-evaluation?station=${stationCode}`);
        
        // Fetch from API
        const response = await fetch(`${API_BASE_URL}/model-evaluation?station=${stationCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('✓ API Response:', result);
        
        if (!result.success) {
            throw new Error(result.error || 'Unknown API error');
        }
        
        const data = result.data;
        console.log('✓ Data loaded successfully:', data);
        
        // Update UI with fetched data
        updateModelTable(data.models);
        updateBestModelSection(data.best_model);
        updateAreaDifferenceSection(data.area_difference);
        updateChooseReasonSection(data.choose_reason);
        updateChart(data.models);
        
    } catch (error) {
        console.error('❌ Error loading model data:', error);
        console.error('   Message:', error.message);
        console.error('   Stack:', error.stack);
        
        let errorMsg = 'Không thể tải dữ liệu.';
        if (error.message.includes('Failed to fetch')) {
            errorMsg = 'Lỗi kế nối: Backend không phản hồi. Kiểm tra xem server có chạy tại ' + API_BASE_URL + ' không?';
        } else if (error.message.includes('HTTP 404')) {
            errorMsg = 'Lỗi 404: Trạm không tồn tại hoặc endpoint sai.';
        } else if (error.message.includes('HTTP')) {
            errorMsg = `Lỗi server: ${error.message}`;
        } else {
            errorMsg = `${error.message}`;
        }
        
        showErrorMessage(errorMsg);
    }
}

// ==========================================
// Update Model Comparison Table
// ==========================================
function updateModelTable(models) {
    const tbody = document.querySelector('.comparison-table tbody');
    if (!tbody) return;
    
    // Clear existing rows except header
    tbody.innerHTML = '';
    
    // Add model rows
    models.forEach(model => {
        const row = document.createElement('tr');
        
        const modelNameCell = document.createElement('td');
        modelNameCell.innerHTML = model.name + 
            (model.is_best ? '<span class="badge-best">Tốt nhất</span>' : '');
        
        const rmseCell = document.createElement('td');
        rmseCell.textContent = model.rmse.toFixed(1);
        
        const maeCell = document.createElement('td');
        maeCell.textContent = model.mae.toFixed(1);
        
        const r2Cell = document.createElement('td');
        r2Cell.textContent = model.r2.toFixed(3);
        
        row.appendChild(modelNameCell);
        row.appendChild(rmseCell);
        row.appendChild(maeCell);
        row.appendChild(r2Cell);
        
        tbody.appendChild(row);
    });
    
    console.log('✓ Table updated');
}

// ==========================================
// Update Best Model Section
// ==========================================
function updateBestModelSection(bestModel) {
    const modelNameElement = document.querySelector('.best-model-name');
    const descriptionElement = document.querySelector('.best-model-description');
    
    if (modelNameElement) {
        modelNameElement.textContent = bestModel.name;
    }
    
    if (descriptionElement) {
        descriptionElement.textContent = bestModel.description;
    }
    
    console.log('✓ Best model section updated');
}

// ==========================================
// Update Area Difference Section
// ==========================================
function updateAreaDifferenceSection(areaText) {
    const areaElement = document.querySelector('.area-difference-text');
    if (areaElement) {
        areaElement.textContent = areaText;
    }
    console.log('✓ Area difference section updated');
}

// ==========================================
// Update Choose Reason Section
// ==========================================
function updateChooseReasonSection(reasonText) {
    const reasonElement = document.querySelector('.reason-text');
    if (reasonElement) {
        reasonElement.textContent = reasonText;
    }
    console.log('✓ Choose reason section updated');
}

// ==========================================
// Update Chart
// ==========================================
function updateChart(models) {
    const ctx = document.getElementById('comparison-chart');
    if (!ctx || typeof Chart === 'undefined') {
        console.warn('Chart.js not available or canvas not found');
        return;
    }
    
    // Destroy old chart if exists
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Prepare data
    const labels = models.map(m => m.name);
    const rmseData = models.map(m => m.rmse);
    const maeData = models.map(m => m.mae);
    
    // Create new chart
    currentChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'RMSE',
                    data: rmseData,
                    backgroundColor: '#1565C0',
                    borderColor: '#0D47A1',
                    borderWidth: 2,
                    borderRadius: 8
                },
                {
                    label: 'MAE',
                    data: maeData,
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
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y.toFixed(2);
                        }
                    }
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
    
    console.log('✓ Chart updated');
}

// ==========================================
// Show Error Message
// ==========================================
function showErrorMessage(message) {
    console.error('⚠️ ' + message);
    alert(message);
}

// ==========================================
// Setup Create Button Listener
// ==========================================
function setupCreateButtonListener() {
    const createButton = document.querySelector('.btn-create');
    if (createButton) {
        createButton.addEventListener('click', function() {
            const selectedStation = stationDropdown?.getText?.();
            if (selectedStation) {
                console.log('📄 Create button clicked for station:', selectedStation);
                // Add your create logic here
                alert('Đang tạo báo cáo cho trạm: ' + selectedStation);
            } else {
                console.warn('⚠️ No station selected');
            }
        });
    }
}
