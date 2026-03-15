# AirSense HCMC

Hệ thống AirSense HCMC là một ứng dụng **giám sát và phân tích chất lượng không khí tại Thành phố Hồ Chí Minh**, hỗ trợ:
- **Người dân** theo dõi chất lượng không khí theo khu vực/trạm.
- **Cơ quan quản lý** tham khảo các phân tích, đánh giá mô hình và gợi ý chính sách dựa trên dữ liệu.

README này mô tả **tổng quan toàn dự án** (frontend, backend, dữ liệu) và cách chạy.

---

## 1. Cấu trúc tổng quan dự án

Các thành phần chính của project:

```
.
├── README.md              # Tài liệu mô tả dự án
├── Front_End/             # Giao diện web (HTML/CSS/JS)
│   ├── index.html
│   ├── pages/
│   ├── assets/
│   └── components/
├── Back_End/              # API backend (Python, xem requirements.txt)
│   ├── server.py
│   ├── requirements.txt
│   └── src/
│       ├── app.py
│       ├── config/
│       └── routes/
└── data/                  # Dữ liệu & kết quả xử lý/mô hình
    └── processed/
        ├── tplus_1h/
        ├── tplus_3h/
        ├── tplus_6h/
        ├── tplus_12h/
        ├── tplus_24h/
        ├── shap_*.png
        ├── recommendations_payload.json
        └── policy_suggestions_payload.json
```

---

## 2. Frontend (`Front_End/`)

Giao diện web được xây dựng bằng **HTML5 + CSS3 + JavaScript** (không cần build, có thể chạy trực tiếp bằng Live Server hoặc mở file HTML).

### 2.1. Cấu trúc thư mục frontend

```
Front_End/
├── index.html                 # Trang chủ / entry chính
├── pages/                     # Thư mục chứa các trang con
│   ├── login.html             # Trang đăng nhập
│   ├── overview.html          # Trang tổng quan
│   ├── station-tracking.html  # Trang theo dõi theo trạm
│   ├── recommendations.html   # Trang khuyến cáo
│   ├── dataset.html           # Trang dataset
│   ├── model-evaluation.html  # Trang đánh giá mô hình
│   └── policy-suggestions.html # Trang gợi ý chính sách
├── components/                # Component giao diện tái sử dụng
│   ├── sidebar.css / .js
│   └── dropdown.css / .js
└── assets/                    # Tài nguyên tĩnh
    ├── css/
    │   ├── main.css
    │   ├── overview.css
    │   ├── station-tracking.css
    │   ├── recommendations.css
    │   ├── dataset.css
    │   ├── model-evaluation.css
    │   ├── policy-suggestions.css
    │   └── login.css
    └── js/
        ├── login.js
        ├── overview.js
        ├── station-tracking.js
        ├── recommendations.js
        ├── dataset.js
        ├── model-evaluation.js
        └── policy-suggestions.js
```

### 2.2. Chức năng các trang chính

- **Trang đăng nhập** (`pages/login.html`):  
  - Màn hình đăng nhập dành cho người dùng chế độ quản lý.

- **Trang tổng quan** (`pages/overview.html`):  
  - Hiển thị tổng quan chất lượng không khí theo khu vực.  
  - Thống kê các trạm quan trắc.  
  - Biểu đồ, bản đồ các trạm.

- **Trang theo dõi theo trạm** (`pages/station-tracking.html`):  
  - Theo dõi chi tiết từng trạm.  
  - Hiển thị dữ liệu theo thời gian.

- **Trang khuyến cáo** (`pages/recommendations.html`):  
  - Hiển thị các khuyến cáo theo mức độ ô nhiễm.  
  - Hướng dẫn hành vi cho người dân.

- **Trang Dataset** (`pages/dataset.html`):  
  - Xem/duyệt dataset đầu vào.  
  - Có thể mở rộng thêm chức năng xuất/nhập dữ liệu.

- **Trang đánh giá mô hình** (`pages/model-evaluation.html`):  
  - Trình bày kết quả đánh giá mô hình (accuracy, MAE, RMSE, …).  
  - Có thể hiển thị các biểu đồ, hình ảnh SHAP từ thư mục `data/processed`.

- **Trang gợi ý chính sách** (`pages/policy-suggestions.html`):  
  - Gợi ý các chính sách/can thiệp để cải thiện chất lượng không khí.  
  - Có thể dựa trên kết quả phân tích mô hình & dữ liệu.

### 2.3. Components chung

- **Sidebar / Navigation** (trong `components/`):  
  - Thanh điều hướng dùng chung cho hầu hết các trang.  
  - Style và logic được tách trong các file CSS/JS riêng để tái sử dụng.

- **Dropdown / Filter component**:  
  - Dùng để chọn trạm, khung thời gian, chế độ hiển thị,...

---

## 3. Backend (`Back_End/`)

Backend được viết bằng **Python**.  
Các thư viện cụ thể được khai báo trong `Back_End/requirements.txt`.

### 3.1. Cấu trúc chính

```
Back_End/
├── server.py                  # Điểm khởi chạy server (API)
├── requirements.txt           # Danh sách thư viện Python
└── src/
    ├── app.py                 # Khởi tạo ứng dụng backend
    ├── config/
    │   └── settings.py        # Cấu hình chung (ví dụ: URL DB, API keys, ...)
    └── routes/
        ├── stations.py        # API cho trạm quan trắc
        ├── recommendations.py # API khuyến nghị
        └── policy_suggestions.py # API gợi ý chính sách
```

Trong triển khai thực tế, các route có thể:
- Cung cấp dữ liệu cho các trang frontend (overview, tracking, recommendations, policy-suggestions, …).
- Đọc dữ liệu từ thư mục `data/processed` hoặc từ nguồn dữ liệu gốc (DB, file, …).

---

## 4. Dữ liệu & mô hình (`data/`)

Thư mục `data/processed/` chứa:

- **Các file ảnh SHAP** (`shap_*.png`, `tplus_*h/shap_*.png`):  
  - Mô tả mức độ đóng góp của các feature vào dự đoán chất lượng không khí ở các mốc thời gian khác nhau (t+1h, t+3h, t+6h, ...).

- **`recommendations_payload.json`**:  
  - Dữ liệu JSON phục vụ API khuyến nghị.

- **`policy_suggestions_payload.json`**:  
  - Dữ liệu JSON phục vụ gợi ý chính sách.

Frontend có thể gọi backend để lấy những dữ liệu này và hiển thị trên các trang tương ứng.

---

## 5. Cách cài đặt & chạy

### 5.1. Yêu cầu chung

- Python 3.9+ (khuyến nghị)  
- Trình duyệt web (Chrome/Edge/Firefox)  
- VSCode hoặc IDE tương tự (khuyến nghị cài extension **Live Server** để chạy frontend)

### 5.2. Chạy backend (API)

1. Mở terminal tại thư mục gốc dự án (chứa `Back_End/`, `Front_End/`, `data/`).  
2. Di chuyển vào thư mục backend:

   ```bash
   cd Back_End
   ```

3. (Khuyến nghị) Tạo virtualenv và cài thư viện:

   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

4. Chạy server (ví dụ):

   ```bash
   python server.py
   ```

   Sau khi chạy, backend sẽ lắng nghe trên một port (ví dụ `http://localhost:8000` hoặc `http://127.0.0.1:5000` tùy theo hiện thực trong `server.py`).

### 5.3. Chạy frontend

1. Mở thư mục `Front_End/` trong VSCode.  
2. Nếu có sử dụng font custom, cài đặt font trước (nếu dự án có thư mục `assets/fonts/...`).  
3. Cài extension **Live Server** (VSCode).  
4. Chuột phải vào `index.html` (hoặc `pages/overview.html` / `pages/login.html`) → chọn **"Open with Live Server"**.  
5. Đảm bảo URL gọi API trong các file JS (ví dụ `assets/js/overview.js`, `assets/js/station-tracking.js`, ...) trỏ đúng tới địa chỉ backend (ví dụ `http://localhost:8000`).

---

## 6. Chế độ hoạt động

Hệ thống hỗ trợ 2 nhóm người dùng chính:

- **Chế độ công khai**:
  - Xem thông tin chất lượng không khí tổng quan.  
  - Xem biểu đồ, bản đồ, khuyến cáo cơ bản.

- **Chế độ quản lý** (đăng nhập qua `login.html`):
  - Truy cập thêm các trang về dataset, đánh giá mô hình, gợi ý chính sách.  
  - Có thể mở rộng thêm các chức năng quản trị (CRUD dữ liệu, cấu hình mô hình, ...).
