import csv
import os
from flask import Blueprint, request, jsonify

auth_bp = Blueprint('auth', __name__)

# --- BIẾN ĐỔI THÀNH ĐƯỜNG DẪN TƯƠNG ĐỐI ---
# 1. Lấy đường dẫn tuyệt đối của file auth.py hiện tại
current_dir = os.path.dirname(os.path.abspath(__file__)) 

# 2. Đi ngược lên 3 cấp để ra thư mục gốc ADA (routes -> src -> Back_End -> ADA)
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))

# 3. Kết hợp với đường dẫn tới file csv trong thư mục data
CSV_FILE_PATH = os.path.join(root_dir, 'data', 'ada_user.csv')
# ------------------------------------------

@auth_bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        user_found = False
        fullname = ""

        # Mở file CSV bằng đường dẫn tương đối đã cấu hình
        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for row in reader:
                # Kiểm tra tài khoản và mật khẩu
                if row.get('user') == email and row.get('password') == password:
                    user_found = True
                    fullname = row.get('fullname') # Lấy tên đầy đủ từ file
                    break

        if user_found:
            return jsonify({
                "status": "success",
                "message": f"Chào mừng {fullname} đã đăng nhập thành công!"
            }), 200
        else:
            return jsonify({
                "status": "error", 
                "message": "Email hoặc mật khẩu không chính xác!"
            }), 401

    except FileNotFoundError:
        return jsonify({"status": "error", "message": f"Không tìm thấy file tại: {CSV_FILE_PATH}"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": f"Lỗi hệ thống: {str(e)}"}), 500