# AirSense HCMC

Hệ thống quản lý và giám sát chất lượng không khí tại Thành phố Hồ Chí Minh.

## Cấu trúc dự án

```
06_gen_html/
├── index.html                 # Trang chủ
├── pages/                     # Thư mục chứa các trang
│   ├── login.html            # Trang đăng nhập
│   ├── overview.html         # Trang tổng quan
│   ├── station-tracking.html # Trang theo dõi theo trạm
│   ├── recommendations.html  # Trang khuyến cáo
│   ├── dataset.html         # Trang dataset
│   ├── model-evaluation.html # Trang đánh giá mô hình
│   └── policy-suggestions.html # Trang gợi ý chính sách
├── components/                # Thư mục chứa các component tái sử dụng
│   └── sidebar.html         # Component sidebar (thanh điều hướng)
└── assets/                    # Thư mục tài nguyên
    ├── css/
    │   └── main.css          # File CSS chính
    └── js/
        └── main.js           # File JavaScript chính
```

## Danh sách các trang

### 1. Trang đăng nhập (`pages/login.html`)
- Trang đăng nhập vào hệ thống

### 2. Trang tổng quan (`pages/overview.html`)
- Hiển thị tổng quan về chất lượng không khí
- Thống kê các trạm quan sát
- Biểu đồ và bản đồ các trạm

### 3. Trang theo dõi theo trạm (`pages/station-tracking.html`)
- Theo dõi chi tiết từng trạm quan sát
- Dữ liệu theo thời gian thực

### 4. Trang khuyến cáo (`pages/recommendations.html`)
- Các khuyến cáo về chất lượng không khí
- Hướng dẫn cho người dùng

### 5. Trang Dataset (`pages/dataset.html`)
- Quản lý và xem dữ liệu dataset
- Xuất/nhập dữ liệu

### 6. Trang đánh giá mô hình (`pages/model-evaluation.html`)
- Đánh giá hiệu suất các mô hình dự đoán
- Thống kê và phân tích mô hình

### 7. Trang gợi ý chính sách (`pages/policy-suggestions.html`)
- Gợi ý các chính sách cải thiện chất lượng không khí
- Phân tích và đề xuất

## Chế độ hoạt động

Hệ thống hỗ trợ 2 chế độ:
- **Công khai**: Xem thông tin công khai về chất lượng không khí
- **Quản lý**: Quản lý và điều hành hệ thống (yêu cầu đăng nhập)

## Công nghệ sử dụng

- HTML5
- CSS3
- JavaScript

## Hướng dẫn sử dụng

1. Mở file `index.html` hoặc `pages/login.html` trong trình duyệt
2. Đăng nhập vào hệ thống (nếu ở chế độ quản lý)
3. Chọn trang cần xem từ menu điều hướng

## Components

### Sidebar (`components/sidebar.html`)
- Component sidebar (thanh điều hướng) dùng chung cho các trang
- Chứa logo, nút chuyển đổi chế độ (Công khai/Quản lý), menu điều hướng và thông tin người dùng
- Có thể được include vào các trang bằng JavaScript hoặc server-side rendering

## Ghi chú

- Tất cả các trang hiện tại đang ở trạng thái trống, sẵn sàng để thêm nội dung
- File CSS và JavaScript đã được thiết lập sẵn trong thư mục `assets/`
- Component sidebar được đặt trong thư mục `components/` để dễ quản lý và tái sử dụng
