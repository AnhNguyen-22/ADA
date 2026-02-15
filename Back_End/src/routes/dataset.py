import math
import csv
import os
from flask import Blueprint, jsonify

dataset_bp = Blueprint('dataset', __name__)

# Tự động tìm đường dẫn tới file AirQualityHoChiMinhCity.csv
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
CSV_FILE_PATH = os.path.join(root_dir, 'data', 'raw', 'AirQualityHoChiMinhCity.csv')

@dataset_bp.route('/api/dataset', methods=['GET'])
def get_dataset():
    try:
        data = []
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for i, row in enumerate(reader):
                if i >= 500:  
                    break
                row = {k.replace('Temperature', 'Temp').replace('Humidity', 'Humid'): v for k, v in row.items()}
                data.append(row)
        
        return jsonify({
            "status": "success",
            "data": data,
            "total_loaded": len(data)
        }), 200

    except FileNotFoundError:
        return jsonify({"status": "error", "message": f"Không tìm thấy file tại: {CSV_FILE_PATH}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500
    
@dataset_bp.route('/api/correlation', methods=['GET'])
def get_correlation():
    try:
        data_cols = {}
        # CẬP NHẬT: Đã thêm 'Temperature' và 'Humidity' vào danh sách tìm kiếm
        target_keys = ['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO', 'Temperature', 'Humidity']
        found_cols = []

        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            headers = reader.fieldnames
            
            # Lọc ra những cột thực sự tồn tại trong file CSV của bạn
            found_cols = [col for col in headers if col in target_keys]
            for col in found_cols:
                data_cols[col] = []
                
            for row in reader:
                for col in found_cols:
                    try:
                        data_cols[col].append(float(row[col]))
                    except (ValueError, TypeError):
                        pass 
        
        # Hàm tính Tương quan Pearson
        def calculate_pearson(x, y):
            n = min(len(x), len(y))
            if n <= 1: return 0
            
            sum_x = sum(x[:n])
            sum_y = sum(y[:n])
            sum_xy = sum(x[i]*y[i] for i in range(n))
            sum_x2 = sum(x[i]**2 for i in range(n))
            sum_y2 = sum(y[i]**2 for i in range(n))
            
            numerator = n * sum_xy - sum_x * sum_y
            denominator = math.sqrt((n * sum_x2 - sum_x**2) * (n * sum_y2 - sum_y**2))
            
            if denominator == 0: return 0
            return round(numerator / denominator, 2)
        
        # Tạo ma trận
        matrix = []
        for var1 in found_cols:
            row_data = []
            for var2 in found_cols:
                corr = calculate_pearson(data_cols[var1], data_cols[var2])
                row_data.append(corr)
            matrix.append(row_data)
            
        return jsonify({
            "status": "success",
            "variables": found_cols,
            "matrix": matrix
        }), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500