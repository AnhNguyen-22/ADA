import csv
import os
from flask import Blueprint, request, jsonify

# ĐÂY CHÍNH LÀ DÒNG MÀ APP.PY ĐANG TÌM KIẾM:
auth_bp = Blueprint('auth', __name__)

current_dir = os.path.dirname(os.path.abspath(__file__)) 
root_dir = os.path.abspath(os.path.join(current_dir, "../../.."))
CSV_FILE_PATH = os.path.join(root_dir, 'data', 'ada_user.csv')

@auth_bp.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        user_found = False
        fullname = ""

        with open(CSV_FILE_PATH, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for row in reader:
                if row.get('user') == email and row.get('password') == password:
                    user_found = True
                    fullname = row.get('fullname', 'Bạn')
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