from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime
import os

# Blueprint
stations_bp = Blueprint('stations', __name__)

# ===================================
# FIXED: CSV Path Configuration
# ===================================
# Lấy path từ Back_End/src/routes/stations.py
# → Back_End/src/routes → Back_End/src → Back_End → ProjectADA_AirSense → data/raw
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
CSV_FILE = os.path.join(BASE_DIR, 'data', 'raw', 'AirQualityHoChiMinhCity.csv')

print(f"[INFO] CSV Path: {CSV_FILE}")

# WHO Guideline
WHO_GUIDELINE_PM25 = 15

# Station Metadata
STATION_METADATA = {
    '1': {
        'name': 'S1 - Giao thông',
        'type': 'traffic',
        'location': 'Quận 1, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu vực giao thông đông đúc'
    },
    '2': {
        'name': 'S2 - Công nghiệp',
        'type': 'industrial',
        'location': 'Quận 12, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu công nghiệp'
    },
    '3': {
        'name': 'S3 - Dân cư',
        'type': 'residential',
        'location': 'Quận 3, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu dân cư'
    },
    '4': {
        'name': 'S4 - Giao thông',
        'type': 'traffic',
        'location': 'Quận 7, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu vực giao thông'
    },
    '5': {
        'name': 'S5 - Công nghiệp',
        'type': 'industrial',
        'location': 'Quận Bình Tân, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu công nghiệp'
    }
}

# Type labels in Vietnamese
TYPE_LABELS_VI = {
    'traffic': 'Giao thông',
    'industrial': 'Công nghiệp',
    'residential': 'Dân cư'
}

# Cache cho data
_data_cache = None

# ===================================
# Helper Functions
# ===================================

def load_data():
    """Load và cache dữ liệu từ CSV"""
    global _data_cache
    if _data_cache is None:
        try:
            # Kiểm tra file tồn tại
            if not os.path.exists(CSV_FILE):
                print(f"[ERROR] CSV file not found at: {CSV_FILE}")
                return None
            
            df = pd.read_csv(CSV_FILE)
            
            # Chuyển đổi date column thành datetime
            # Format: 23-02-21 21:00 → %y-%m-%d %H:%M
            df['date'] = pd.to_datetime(df['date'], format='%y-%m-%d %H:%M', errors='coerce')
            
            # Chuyển Station_No thành string
            df['Station_No'] = df['Station_No'].astype(str)
            
            _data_cache = df
            print(f"[SUCCESS] CSV loaded: {len(df)} rows, {len(df['Station_No'].unique())} stations")
            
        except Exception as e:
            print(f"[ERROR] Loading CSV: {e}")
            return None
    return _data_cache


def calculate_aqi_status(pm25_value):
    """Tính trạng thái AQI từ giá trị PM2.5"""
    if pm25_value <= 12:
        return {'status': 'good', 'label': 'Tốt', 'color': '#00e400'}
    elif pm25_value <= 35.4:
        return {'status': 'moderate', 'label': 'Trung bình', 'color': '#ffff00'}
    elif pm25_value <= 55.4:
        return {'status': 'poor', 'label': 'Kém', 'color': '#ff7e00'}
    elif pm25_value <= 150.4:
        return {'status': 'bad', 'label': 'Xấu', 'color': '#ff0000'}
    elif pm25_value <= 250.4:
        return {'status': 'very_bad', 'label': 'Rất xấu', 'color': '#8f3f97'}
    else:
        return {'status': 'hazardous', 'label': 'Nguy hại', 'color': '#7e0023'}


# ===================================
# API Endpoints
# ===================================

@stations_bp.route('/stations', methods=['GET'])
def get_stations():
    """1️⃣ Lấy danh sách tất cả các trạm"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        stations = []
        for station_id, metadata in STATION_METADATA.items():
            station_data = df[df['Station_No'] == station_id]
            if not station_data.empty:
                latest_pm25 = station_data['PM2.5'].iloc[-1]
                avg_pm25 = station_data['PM2.5'].mean()
                
                stations.append({
                    'id': station_id,
                    'name': metadata['name'],
                    'type': metadata['type'],
                    'type_label': TYPE_LABELS_VI.get(metadata['type'], metadata['type']),
                    'location': metadata['location'],
                    'latest_pm25': round(latest_pm25, 2),
                    'avg_pm25': round(avg_pm25, 2),
                    'status': calculate_aqi_status(latest_pm25)
                })
        
        return jsonify({
            'success': True,
            'data': stations,
            'total': len(stations)
        })
    except Exception as e:
        print(f"[ERROR] get_stations: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/<station_id>', methods=['GET'])
def get_station_detail(station_id):
    """2️⃣ Lấy thông tin chi tiết một trạm"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        if station_id not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
        
        station_data = df[df['Station_No'] == station_id]
        if station_data.empty:
            return jsonify({'success': False, 'error': 'No data for this station'}), 404
        
        metadata = STATION_METADATA[station_id]
        latest_pm25 = station_data['PM2.5'].iloc[-1]
        avg_pm25 = station_data['PM2.5'].mean()
        max_pm25 = station_data['PM2.5'].max()
        min_pm25 = station_data['PM2.5'].min()
        
        return jsonify({
            'success': True,
            'data': {
                'id': station_id,
                'name': metadata['name'],
                'type': metadata['type'],
                'type_label': TYPE_LABELS_VI.get(metadata['type'], metadata['type']),
                'location': metadata['location'],
                'description': metadata['description'],
                'current_pm25': round(latest_pm25, 2),
                'avg_pm25': round(avg_pm25, 2),
                'max_pm25': round(max_pm25, 2),
                'min_pm25': round(min_pm25, 2),
                'status': calculate_aqi_status(latest_pm25),
                'total_readings': len(station_data)
            }
        })
    except Exception as e:
        print(f"[ERROR] get_station_detail: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/<station_id>/pm25', methods=['GET'])
def get_station_pm25_data(station_id):
    """3️⃣ Lấy dữ liệu PM2.5 theo thời gian của một trạm"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        if station_id not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
        
        # Filter by station
        station_data = df[df['Station_No'] == station_id].copy()
        if station_data.empty:
            return jsonify({'success': False, 'error': 'No data for this station'}), 404
        
        # Sort by date
        station_data = station_data.sort_values('date')
        
        # Lấy tham số limit (số lượng record gần nhất)
        limit = request.args.get('limit', type=int)
        if limit:
            station_data = station_data.tail(limit)
        
        # Prepare time series data
        time_labels = station_data['date'].dt.strftime('%H:%M').tolist()
        pm25_values = station_data['PM2.5'].round(2).tolist()
        
        # Tính exceedance (vượt ngưỡng WHO)
        exceedance = station_data['PM2.5'].apply(
            lambda x: max(0, x - WHO_GUIDELINE_PM25)
        ).round(2).tolist()
        
        return jsonify({
            'success': True,
            'data': {
                'station_id': station_id,
                'station_name': STATION_METADATA[station_id]['name'],
                'time_labels': time_labels,
                'pm25_values': pm25_values,
                'exceedance': exceedance,
                'avg_pm25': round(station_data['PM2.5'].mean(), 2),
                'who_guideline': WHO_GUIDELINE_PM25,
                'total_points': len(pm25_values)
            }
        })
    except Exception as e:
        print(f"[ERROR] get_station_pm25_data: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/<station_id>/comparison', methods=['GET'])
def get_station_comparison(station_id):
    """4️⃣ So sánh trạm với WHO guideline và trung bình tất cả trạm"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        if station_id not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
        
        # Lấy avg của trạm hiện tại
        station_data = df[df['Station_No'] == station_id]
        if station_data.empty:
            return jsonify({'success': False, 'error': 'No data for this station'}), 404
        
        current_avg = station_data['PM2.5'].mean()
        
        # Lấy avg của tất cả trạm
        all_stations_avg = df['PM2.5'].mean()
        
        return jsonify({
            'success': True,
            'data': {
                'labels': ['WHO', STATION_METADATA[station_id]['name'], 'TB tất cả'],
                'values': [
                    WHO_GUIDELINE_PM25,
                    round(current_avg, 2),
                    round(all_stations_avg, 2)
                ]
            }
        })
    except Exception as e:
        print(f"[ERROR] get_station_comparison: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/<station_id>/same-type', methods=['GET'])
def get_same_type_comparison(station_id):
    """5️⃣ So sánh với các trạm cùng loại"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        if station_id not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
        
        current_type = STATION_METADATA[station_id]['type']
        
        # Lấy tham số compare_with (station_id khác hoặc 'all')
        compare_with = request.args.get('compare_with', 'all')
        
        # Lấy avg của trạm hiện tại
        current_avg = df[df['Station_No'] == station_id]['PM2.5'].mean()
        
        if compare_with == 'all':
            # So sánh với tất cả trạm cùng loại
            same_type_stations = [
                sid for sid, meta in STATION_METADATA.items()
                if meta['type'] == current_type
            ]
            
            labels = []
            values = []
            
            for sid in same_type_stations:
                station_avg = df[df['Station_No'] == sid]['PM2.5'].mean()
                labels.append(STATION_METADATA[sid]['name'])
                values.append(round(station_avg, 2))
            
            return jsonify({
                'success': True,
                'data': {
                    'mode': 'all',
                    'type': current_type,
                    'type_label': TYPE_LABELS_VI.get(current_type, current_type),
                    'labels': labels,
                    'values': values,
                    'stations': same_type_stations
                }
            })
        else:
            # So sánh với 1 trạm cụ thể
            if compare_with not in STATION_METADATA:
                return jsonify({'success': False, 'error': 'Compare station not found'}), 404
            
            compare_avg = df[df['Station_No'] == compare_with]['PM2.5'].mean()
            
            return jsonify({
                'success': True,
                'data': {
                    'mode': 'single',
                    'labels': [
                        'WHO',
                        STATION_METADATA[station_id]['name'],
                        STATION_METADATA[compare_with]['name']
                    ],
                    'values': [
                        WHO_GUIDELINE_PM25,
                        round(current_avg, 2),
                        round(compare_avg, 2)
                    ]
                }
            })
    except Exception as e:
        print(f"[ERROR] get_same_type_comparison: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/<station_id>/diff-type', methods=['GET'])
def get_diff_type_comparison(station_id):
    """6️⃣ So sánh với trạm khác loại"""
    try:
        df = load_data()
        if df is None:
            return jsonify({'error': 'Failed to load data'}), 500
        
        if station_id not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Station not found'}), 404
        
        current_type = STATION_METADATA[station_id]['type']
        current_avg = df[df['Station_No'] == station_id]['PM2.5'].mean()
        
        # Lấy tham số compare_with (station_id khác loại)
        compare_with = request.args.get('compare_with')
        
        if not compare_with:
            # Tìm trạm khác loại đầu tiên
            diff_type_stations = [
                sid for sid, meta in STATION_METADATA.items()
                if meta['type'] != current_type
            ]
            if diff_type_stations:
                compare_with = diff_type_stations[0]
            else:
                return jsonify({'success': False, 'error': 'No different type station found'}), 404
        
        if compare_with not in STATION_METADATA:
            return jsonify({'success': False, 'error': 'Compare station not found'}), 404
        
        if STATION_METADATA[compare_with]['type'] == current_type:
            return jsonify({'success': False, 'error': 'Compare station must be different type'}), 400
        
        compare_avg = df[df['Station_No'] == compare_with]['PM2.5'].mean()
        
        # Lấy danh sách tất cả trạm khác loại để FE tạo dropdown
        diff_type_stations = []
        for sid, meta in STATION_METADATA.items():
            if meta['type'] != current_type:
                diff_type_stations.append({
                    'id': sid,
                    'name': meta['name'],
                    'type': meta['type'],
                    'type_label': TYPE_LABELS_VI.get(meta['type'], meta['type'])
                })
        
        return jsonify({
            'success': True,
            'data': {
                'labels': [
                    'WHO',
                    STATION_METADATA[station_id]['name'],
                    STATION_METADATA[compare_with]['name']
                ],
                'values': [
                    WHO_GUIDELINE_PM25,
                    round(current_avg, 2),
                    round(compare_avg, 2)
                ],
                'available_stations': diff_type_stations,
                'current_compare': compare_with
            }
        })
    except Exception as e:
        print(f"[ERROR] get_diff_type_comparison: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@stations_bp.route('/stations/types', methods=['GET'])
def get_station_types():
    """7️⃣ Lấy danh sách các loại trạm"""
    try:
        types = {}
        for station_id, metadata in STATION_METADATA.items():
            station_type = metadata['type']
            if station_type not in types:
                types[station_type] = {
                    'type': station_type,
                    'label': TYPE_LABELS_VI.get(station_type, station_type),
                    'stations': []
                }
            types[station_type]['stations'].append({
                'id': station_id,
                'name': metadata['name']
            })
        
        return jsonify({
            'success': True,
            'data': list(types.values())
        })
    except Exception as e:
        print(f"[ERROR] get_station_types: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500