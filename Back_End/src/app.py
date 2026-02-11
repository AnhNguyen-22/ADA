from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
# CORS giúp Front-End (chạy ở port khác) có thể gọi được API của Back-End mà không bị trình duyệt chặn
CORS(app) 

# Dữ liệu tài khoản giả lập (Sau này bạn có thể kết nối đọc từ file CSV hoặc Database thực)
MOCK_USERS = {
    "japando2004@gmail.com": "japando2004",
    "mod@airsense.gov.vn": "mod123"
}

@app.route('/api/login', methods=['POST'])
def login():
    try:
        # Lấy dữ liệu Front-End gửi lên
        data = request.get_json()
        
        # Kiểm tra xem có dữ liệu không
        if not data:
            return jsonify({"status": "error", "message": "Không nhận được dữ liệu"}), 400

        email = data.get('email')
        password = data.get('password')

        # Kiểm tra xem Front-End có gửi thiếu trường nào không
        if not email or not password:
            return jsonify({"status": "error", "message": "Vui lòng nhập đầy đủ email và mật khẩu"}), 400

        # Xử lý logic đăng nhập
        if email in MOCK_USERS and MOCK_USERS[email] == password:
            return jsonify({
                "status": "success",
                "message": "Đăng nhập thành công!",
                "user": email
            }), 200
        else:
            return jsonify({
                "status": "error",
                "message": "Email hoặc mật khẩu không chính xác!"
            }), 401
            
    except Exception as e:
        # Bắt lỗi server nếu có sự cố bất ngờ
        return jsonify({"status": "error", "message": "Lỗi máy chủ: " + str(e)}), 500

if __name__ == '__main__':
    # Chạy server ở chế độ debug, port 5000
    print("Server Back-End đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)