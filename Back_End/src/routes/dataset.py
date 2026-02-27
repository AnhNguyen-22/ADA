from flask import jsonify

# API lấy danh sách biến
@dataset_bp.route('/api/dataset/variables', methods=['GET'])
def get_variables():
    variables = [
        { "name": 'PM2.5', "unit": 'µg/m³', "description": 'Bụi mịn (mục tiêu dự báo)' },
        { "name": 'PM10', "unit": 'µg/m³', "description": 'Bụi thô' },
        { "name": 'NO2', "unit": 'µg/m³', "description": 'Nitơ đioxit' },
        { "name": 'O3', "unit": 'µg/m³', "description": 'Ozon' },
        { "name": 'SO2', "unit": 'µg/m³', "description": 'Lưu huỳnh đioxit' },
        { "name": 'CO', "unit": 'µg/m³', "description": 'Cacbon monoxit' },
        { "name": 'Temp', "unit": '°C', "description": 'Nhiệt độ' },
        { "name": 'Humid', "unit": '%', "description": 'Độ ẩm' }
    ]
    return jsonify({"status": "success", "data": variables}), 200

# API lấy ma trận tương quan Heatmap
@dataset_bp.route('/api/dataset/correlation', methods=['GET'])
def get_correlation():
    matrix = [
        [1.0, 0.85, 0.3, 0.4, 0.2, 0.5, 0.1, 0.2],
        [0.85, 1.0, 0.4, 0.3, 0.1, 0.4, 0.2, 0.1],
        [0.3, 0.4, 1.0, 0.6, 0.5, 0.7, 0.2, 0.3],
        [0.4, 0.3, 0.6, 1.0, 0.4, 0.5, 0.6, -0.2],
        [0.2, 0.1, 0.5, 0.4, 1.0, 0.6, -0.1, 0.4],
        [0.5, 0.4, 0.7, 0.5, 0.6, 1.0, 0.3, 0.2],
        [0.1, 0.2, 0.2, 0.6, -0.1, 0.3, 1.0, -0.6],
        [0.2, 0.1, 0.3, -0.2, 0.4, 0.2, -0.6, 1.0]
    ]
    return jsonify({"status": "success", "matrix": matrix}), 200