/**
 * Station Tracking API Integration
 * Kết nối backend API với chart functions trong HTML.
 *
 * Logic:
 *   1. Thử kết nối backend → lấy danh sách trạm thật
 *   2. Xây dựng bảng map: mock ID (s1..s6) ↔ API ID thật
 *   3. Mỗi khi chọn trạm → dùng API ID thật để fetch data
 *   4. Không có backend → giữ mock data, trang vẫn chạy bình thường
 */

console.log('🚀 Loading Station API...');

const API_BASE = 'http://127.0.0.1:5000';

// Map từ mock ID (s1, s2...) → API ID thật (được build sau khi fetch stations)
// VD: { s1: '1', s2: '2' } hoặc { s1: 'station_1' } tuỳ backend
let apiIdMap = {};          // mockId → apiId
let apiStationsCache = [];  // danh sách stations từ API

// ─── Helpers ────────────────────────────────────────────────────────────────

async function apiRequest(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    return response.json();
}

function showNotification(message, type = 'error') {
    document.querySelectorAll('.api-notification').forEach(el => el.remove());

    const styles = {
        success: { bg: '#4caf50', icon: '✓' },
        error:   { bg: '#ff5252', icon: '⚠️' },
        info:    { bg: '#2196F3', icon: 'ℹ️' }
    };
    const { bg, icon } = styles[type] || styles.error;

    const notif = document.createElement('div');
    notif.className = 'api-notification';
    notif.style.cssText = `
        position:fixed;top:20px;right:20px;background:${bg};color:#fff;
        padding:14px 18px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,.3);
        z-index:100000;font-size:14px;max-width:400px;
    `;
    notif.innerHTML = `${icon} ${message}`;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), type === 'success' ? 3000 : 8000);
}

// ─── API calls ───────────────────────────────────────────────────────────────

async function testConnection() {
    try {
        await apiRequest('/health');
        return true;
    } catch {
        return false;
    }
}

async function getAllStations() {
    const result = await apiRequest('/api/stations');
    return result.data || result.stations || [];
}

async function getStationPM25(apiId, limit = 12) {
    const result = await apiRequest(`/api/stations/${apiId}/pm25?limit=${limit}`);
    return result.data || result;
}

async function getStationDetail(apiId) {
    const result = await apiRequest(`/api/stations/${apiId}`);
    return result.data || result;
}

async function getStationComparison(apiId) {
    const result = await apiRequest(`/api/stations/${apiId}/comparison`);
    return result.data || result;
}

// ─── Build mapping mock ↔ API ID ─────────────────────────────────────────────
/**
 * Cố gắng match station từ API với mock ID (s1..s6).
 * Thử các heuristic theo thứ tự:
 *   1. station.id === mockId (vd 's1' === 's1')
 *   2. station.id === mockId.slice(1) (vd '1' từ 's1')
 *   3. station.name chứa số cuối của mockId (vd name='Station 1' ↔ s1)
 *   4. Không match được → dùng index (trạm thứ N ↔ sN)
 */
function buildIdMap(stations) {
    const mockIds = ['s1', 's2', 's3', 's4', 's5', 's6'];
    const map = {};

    mockIds.forEach((mockId, i) => {
        const num = mockId.slice(1); // '1', '2', ...

        // Tìm station phù hợp
        let matched = stations.find(s =>
            String(s.id).toLowerCase() === mockId ||          // s1 === s1
            String(s.id) === num ||                            // 1 === 1
            String(s.id).toLowerCase() === `station_${num}` || // station_1
            (s.name && String(s.name).includes(` ${num}`))    // "Station 1"
        );

        // Fallback: dùng theo index
        if (!matched && stations[i]) matched = stations[i];

        if (matched) {
            map[mockId] = String(matched.id);
        }
    });

    console.log('📋 ID map built:', map);
    return map;
}

// ─── Cập nhật toàn bộ UI từ data API ─────────────────────────────────────────

async function loadStationData(mockId) {
    // Dùng API ID thật nếu có, fallback về mockId
    const apiId = apiIdMap[mockId] || mockId;
    console.log(`📊 Loading station mockId=${mockId} → apiId=${apiId}`);

    try {
        const [pm25, detail] = await Promise.all([
            getStationPM25(apiId, 12).catch(() => null),
            getStationDetail(apiId).catch(() => null)
        ]);

        console.log('✅ API data received:', { pm25, detail });

        if (typeof window.updateStationFromAPI === 'function') {
            window.updateStationFromAPI(mockId, pm25, detail);
            showNotification(`✅ Trạm ${mockId.toUpperCase()} đã tải từ API`, 'success');
        } else {
            // Fallback thủ công
            if (pm25?.average != null) {
                const el = document.querySelector('.section-subtitle');
                if (el) el.textContent = `Trung bình ~ ${pm25.average.toFixed(1)} µg/m³`;
                const g = document.getElementById('gauge-value');
                if (g) g.textContent = Math.round(pm25.average);
            }
            document.querySelectorAll('#station-name-display')
                .forEach(el => { el.textContent = mockId.toUpperCase(); });
        }

    } catch (error) {
        console.error(`❌ loadStationData(${mockId}) failed:`, error);
        showNotification(`Không tải được trạm ${mockId.toUpperCase()} từ API. Dùng mock data.`, 'info');
    }
}

// ─── Cập nhật dropdown với tên trạm thật từ API ──────────────────────────────

function syncDropdownWithAPI(stations) {
    if (!window.stationDropdown?.updateItems) return;

    // Map ngược: apiId → mockId (để giữ value = mockId cho chart functions)
    const reverseMap = {};
    Object.entries(apiIdMap).forEach(([mock, api]) => { reverseMap[api] = mock; });

    const items = stations.map(s => {
        const apiId = String(s.id);
        const mockId = reverseMap[apiId] || apiId;
        return {
            value: mockId,           // vẫn dùng mockId (s1..s6) làm value để chart hoạt động
            text: s.name || s.id    // tên thật từ API làm label hiển thị
        };
    });

    window.stationDropdown.updateItems(items);
    console.log('✅ Dropdown synced with API station names');
}

// ─── Lắng nghe dropdown đổi trạm ─────────────────────────────────────────────
/**
 * Dropdown HTML gọi onSelect(value) với value = mockId (s1..s6)
 * rồi cập nhật station-name-display.
 * Ta dùng MutationObserver để bắt thay đổi đó và fetch API data.
 */
function observeStationChange() {
    const nameEl = document.getElementById('station-name-display');
    if (!nameEl) return;

    let lastStation = '';

    const obs = new MutationObserver(() => {
        const newText = nameEl.textContent.trim().toLowerCase();
        if (!newText || newText === lastStation) return;
        lastStation = newText;

        // newText có thể là 's1' hoặc 'S1' → chuẩn hoá về 's1'
        const mockId = newText.startsWith('s') ? newText : `s${newText}`;

        // Chỉ fetch nếu đã có apiIdMap (tức là backend đang kết nối)
        if (Object.keys(apiIdMap).length === 0) return;

        console.log(`🔄 Station changed → ${mockId}, syncing API...`);
        loadStationData(mockId);
    });

    obs.observe(nameEl, { childList: true, characterData: true, subtree: true });
    console.log('👁️ MutationObserver active on station-name-display');
}

// ─── Init ────────────────────────────────────────────────────────────────────

async function initPage() {
    console.log('🔄 Initializing Station API...');

    const connected = await testConnection();
    if (!connected) {
        console.warn('⚠️ Backend không kết nối — dùng mock data.');
        showNotification('Backend chưa kết nối — đang hiển thị mock data.', 'info');
        return;
    }

    showNotification('Đã kết nối backend!', 'success');

    // Lấy danh sách trạm
    let stations = [];
    try {
        stations = await getAllStations();
        apiStationsCache = stations;
        console.log(`✅ ${stations.length} stations from API:`, stations);
    } catch (err) {
        console.error('❌ Không lấy được danh sách trạm:', err);
        showNotification('Không lấy được danh sách trạm từ API.', 'error');
        return;
    }

    if (stations.length === 0) {
        showNotification('API không trả về trạm nào — dùng mock data.', 'info');
        return;
    }

    // Build mapping mock ID ↔ API ID
    apiIdMap = buildIdMap(stations);

    // Cập nhật tên trạm trong dropdown từ API
    syncDropdownWithAPI(stations);

    // Load trạm đang chọn (mặc định s1)
    const nameEl = document.getElementById('station-name-display');
    const currentText = (nameEl?.textContent?.trim() || 'S1').toLowerCase();
    const currentMockId = currentText.startsWith('s') ? currentText : `s${currentText}`;
    const targetMockId = apiIdMap[currentMockId] ? currentMockId : Object.keys(apiIdMap)[0];

    await loadStationData(targetMockId || 's1');
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

function bootstrap() {
    observeStationChange(); // Setup observer trước
    initPage();             // Sau đó init (populate apiIdMap)
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
} else {
    bootstrap();
}

// Debug helpers
window.API = {
    test: testConnection,
    getStations: getAllStations,
    getStation: getStationDetail,
    getPM25: getStationPM25,
    load: loadStationData,
    idMap: () => apiIdMap,
    stations: () => apiStationsCache
};

console.log('✅ Station API ready');
console.log('💡 Debug: API.idMap() để xem mapping, API.stations() để xem API stations');