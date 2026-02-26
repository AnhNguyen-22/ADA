/**
 * Station Tracking API Integration - SIMPLIFIED VERSION
 * This version is simpler and will work if backend is running
 */

console.log('🚀 Loading Station API...');

// API Configuration
const API_BASE = 'http://127.0.0.1:5000';

/**
 * Simple fetch wrapper with error handling
 */
async function apiRequest(endpoint) {
    try {
        console.log(`📡 Fetching: ${API_BASE}${endpoint}`);
        
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ Success:`, data);
        return data;
        
    } catch (error) {
        console.error(`❌ Error fetching ${endpoint}:`, error);
        throw error;
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'error') {
    // Remove old notifications
    document.querySelectorAll('.api-notification').forEach(el => el.remove());
    
    const colors = {
        success: { bg: '#4caf50', icon: '✓' },
        error: { bg: '#ff5252', icon: '⚠️' }
    };
    
    const { bg, icon } = colors[type] || colors.error;
    
    const notif = document.createElement('div');
    notif.className = 'api-notification';
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 100000;
        font-size: 14px;
        max-width: 400px;
    `;
    notif.innerHTML = `${icon} ${message}`;
    
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), type === 'success' ? 3000 : 8000);
}

/**
 * Test backend connection
 */
async function testConnection() {
    try {
        const health = await apiRequest('/health');
        console.log('✅ Backend connected:', health);
        showNotification('Backend connected successfully!', 'success');
        return true;
    } catch (error) {
        console.error('❌ Cannot connect to backend:', error);
        showNotification(`Cannot connect to backend at ${API_BASE}`, 'error');
        return false;
    }
}

/**
 * Get all stations
 */
async function getAllStations() {
    try {
        const result = await apiRequest('/api/stations');
        return result.data || result.stations || [];
    } catch (error) {
        showNotification('Failed to load stations', 'error');
        return [];
    }
}

/**
 * Get station detail
 */
async function getStationDetail(stationId) {
    try {
        const result = await apiRequest(`/api/stations/${stationId}`);
        return result.data || result;
    } catch (error) {
        showNotification(`Failed to load station ${stationId}`, 'error');
        return null;
    }
}

/**
 * Get PM2.5 data
 */
async function getStationPM25(stationId, limit = 24) {
    try {
        const result = await apiRequest(`/api/stations/${stationId}/pm25?limit=${limit}`);
        return result.data || result;
    } catch (error) {
        showNotification(`Failed to load PM2.5 data`, 'error');
        return null;
    }
}

/**
 * Get comparison data
 */
async function getStationComparison(stationId) {
    try {
        const result = await apiRequest(`/api/stations/${stationId}/comparison`);
        return result.data || result;
    } catch (error) {
        console.error('Comparison error:', error);
        return null;
    }
}

/**
 * Initialize page
 */
async function initPage() {
    console.log('🔄 Initializing page...');
    
    // Test connection first
    const connected = await testConnection();
    
    if (!connected) {
        console.error('❌ Backend not connected');
        return;
    }
    
    // Load stations
    console.log('📊 Loading stations...');
    const stations = await getAllStations();
    
    if (stations.length === 0) {
        showNotification('No stations found', 'error');
        return;
    }
    
    console.log(`✅ Loaded ${stations.length} stations:`, stations);
    
    // Update UI with station data
    updateStationsDropdown(stations);
    
    // Load first station
    if (stations[0]) {
        const firstId = stations[0].id;
        console.log(`📍 Loading first station: ${firstId}`);
        await loadStationData(firstId);
    }
}

/**
 * Update dropdown with real stations
 */
function updateStationsDropdown(stations) {
    console.log('🔄 Updating dropdown with stations:', stations);
    
    // If you have a dropdown instance
    if (window.stationDropdown && typeof window.stationDropdown.updateItems === 'function') {
        const items = stations.map(s => ({
            value: s.id,
            text: `${s.name || s.id}`
        }));
        window.stationDropdown.updateItems(items);
    }
}

/**
 * Load station data
 */
async function loadStationData(stationId) {
    console.log(`📊 Loading station ${stationId}...`);
    
    try {
        const [detail, pm25, comparison] = await Promise.all([
            getStationDetail(stationId),
            getStationPM25(stationId, 24),
            getStationComparison(stationId)
        ]);
        
        console.log('Station data loaded:', { detail, pm25, comparison });
        
        // Update UI
        if (pm25 && pm25.average) {
            const avgElement = document.querySelector('.section-subtitle');
            if (avgElement) {
                avgElement.textContent = `Trung bình ~ ${pm25.average.toFixed(1)} µg/m³`;
            }
            
            const gaugeElement = document.getElementById('gauge-value');
            if (gaugeElement) {
                gaugeElement.textContent = Math.round(pm25.average);
            }
        }
        
        // Update station name displays
        const stationNameElements = document.querySelectorAll('#station-name-display');
        stationNameElements.forEach(el => {
            el.textContent = stationId.toUpperCase();
        });
        
        showNotification(`Station ${stationId} loaded`, 'success');
        
    } catch (error) {
        console.error('Failed to load station data:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
} else {
    initPage();
}

// Export for console debugging
window.API = {
    test: testConnection,
    getStations: getAllStations,
    getStation: getStationDetail,
    getPM25: getStationPM25,
    getComparison: getStationComparison,
    load: loadStationData
};

console.log('✅ Station API loaded');
console.log('💡 Debug in console: API.test() or API.getStations()');