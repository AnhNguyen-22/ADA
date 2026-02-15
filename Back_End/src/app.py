from flask import Flask
from flask_cors import CORS

from routes.auth import auth_bp
from routes.dataset import dataset_bp  # <-- Thêm dòng này

app = Flask(__name__)
CORS(app) 

# Đăng ký các Router
app.register_blueprint(auth_bp)
app.register_blueprint(dataset_bp)     # <-- Thêm dòng này

if __name__ == '__main__':
    print("Server Back-End đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)