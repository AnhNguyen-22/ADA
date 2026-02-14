from flask import Flask
from flask_cors import CORS

# Import Blueprint từ thư mục routes
from routes.auth import auth_bp

app = Flask(__name__)
CORS(app) 

# Đăng ký Blueprint để app nhận diện được đường dẫn /api/login
app.register_blueprint(auth_bp)

if __name__ == '__main__':
    print("Server Back-End đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)