import os
import json

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

def display(obj):
    """Hàm hiển thị đơn giản, đủ dùng khi chạy bằng python trong terminal."""
    print(obj)

# Bật/tắt phần vẽ dashboard matplotlib (mặc định: KHÔNG vẽ, chỉ in ra terminal)
ENABLE_PLOT = False

# ==================================================================================
# KPI DASHBOARD CALCULATION
# ==================================================================================
print("\n" + "="*100)
print("TÍNH TOÁN CÁC CHỈ SỐ KPI")
print("="*100)

# Sử dụng dữ liệu sau khi đã làm sạch outlier (đọc từ file CSV đã lưu)
df_kpi = pd.read_csv("data/overview/df_after_step_7_outlier_clean.csv")

# ----------------------------------------------------------------------------------
# HÀM PHỤ: PHÂN LOẠI MỨC ĐỘ PM2.5 THEO NGƯỠNG WHO 24H (15 µg/m³ và các mốc mở rộng)
# ----------------------------------------------------------------------------------
def classify_pm25_level(value: float):
    """
    Trả về (level_en, level_vi, risk_code)
    risk_code dùng để map màu: 'good' | 'moderate' | 'unhealthy'
    """
    if pd.isna(value):
        return "Unknown", "Không xác định", "moderate"

    if value <= 15:
        return "Healthy", "Tốt", "good"
    elif value <= 45:
        return "Fair", "Trung bình", "moderate"
    elif value <= 75:
        return "Unhealthy", "Kém", "unhealthy"
    elif value <= 100:
        return "Very Unhealthy", "Rất kém", "unhealthy"
    else:
        return "Hazardous", "Nguy hại", "unhealthy"


# KPI 1: SỐ TRẠM HIỆN CÓ
num_stations = df_kpi['Station_No'].nunique()
print(f"\n1️⃣ SỐ TRẠM HIỆN CÓ: {num_stations} khu vực")

from typing import Optional

# KPI 2: TRẠM Ô NHIỄM NHẤT (theo trung bình PM2.5)
most_polluted_station: Optional[int] = None
most_polluted_value: Optional[float] = None
most_polluted_type: Optional[str] = None

# Mapping S1..S6 -> loại khu vực (theo map ở frontend)
STATION_TYPE_MAP = {
    1: "Giao thông",
    2: "Dân cư",
    3: "Công nghiệp",
    4: "Dân cư",
    5: "Giao thông",
    6: "Công nghiệp",
}

# Dữ liệu xếp hạng theo PM2.5 trung bình cho 6 trạm
ranking_labels: list[str] = []
ranking_values: list[float] = []

# Dữ liệu số giờ trong ngày PM2.5 > 15 µg/m³ cho top 3 trạm tệ nhất
hours_above_threshold_labels: list[str] = []
hours_above_threshold_values: list[int] = []

if 'PM2.5' in df_kpi.columns:
    station_avg_pm25 = (df_kpi.groupby('Station_No')['PM2.5']
                        .mean()
                        .sort_values(ascending=False))
    
    most_polluted_station = int(station_avg_pm25.index[0])
    most_polluted_value = float(station_avg_pm25.iloc[0])
    most_polluted_type = STATION_TYPE_MAP.get(most_polluted_station)
    
    print(f"\n2️⃣ TRẠM Ô NHIỄM NHẤT: Station {most_polluted_station}")
    print(f"   → Trung bình PM2.5: {most_polluted_value:.2f} µg/m³")
    if most_polluted_type:
        print(f"   → Loại khu vực: {most_polluted_type}")
    
    # Chuẩn bị dữ liệu xếp hạng cho cả 6 trạm (hoặc tất cả trạm có dữ liệu)
    for station, avg_pm in station_avg_pm25.items():
        ranking_labels.append(f"S{int(station)}")
        ranking_values.append(float(avg_pm))

avg_pm25_today: Optional[float] = None
avg_pm25_yesterday: Optional[float] = None
change: Optional[float] = None
change_pct: Optional[float] = None
arrow: Optional[str] = None

# Dữ liệu cho biểu đồ xu hướng 7 ngày gần nhất (theo từng chỉ số)
trend_labels: Optional[list[str]] = None          # dùng cho PM2.5 (giữ tương thích)
trend_values: Optional[list[float]] = None        # dùng cho PM2.5 (giữ tương thích)
trend_multi = {}  # key: tên chỉ số (pm25, co, so2, ...) -> {labels: [...], values: [...]}

# Thông tin hiện tại của từng trạm để hiển thị trên bản đồ
stations_summary: list[dict] = []

# KPI 3: AVG PM2.5 TOÀN THÀNH PHỐ (so sánh hôm nay vs hôm qua)
if 'PM2.5' in df_kpi.columns and 'datetime' in df_kpi.columns:
    df_kpi['datetime'] = pd.to_datetime(df_kpi['datetime'], errors='coerce')
    df_kpi = df_kpi.dropna(subset=['datetime'])
    
    # Lấy mốc thời gian gần nhất có dữ liệu
    latest_ts = df_kpi['datetime'].max()          # kiểu Timestamp
    latest_date = latest_ts.date()                # kiểu date để hiển thị
    yesterday_date = (latest_ts - pd.Timedelta(days=1)).date()
    
    # Tính trung bình PM2.5 cho hôm nay
    today_data = df_kpi[df_kpi['datetime'].dt.date == latest_date]
    avg_pm25_today = today_data['PM2.5'].mean()
    
    # Tính trung bình PM2.5 cho hôm qua
    yesterday_data = df_kpi[df_kpi['datetime'].dt.date == yesterday_date]
    avg_pm25_yesterday = yesterday_data['PM2.5'].mean()
    
    # Tính sự thay đổi
    if pd.notna(avg_pm25_today) and pd.notna(avg_pm25_yesterday):
        change = float(avg_pm25_today - avg_pm25_yesterday)
        change_pct = (change / avg_pm25_yesterday) * 100 if avg_pm25_yesterday > 0 else 0.0
        arrow = "↑" if change > 0 else "↓" if change < 0 else "→"
        
        print(f"\n3️⃣ TRUNG BÌNH PM2.5 TOÀN THÀNH PHỐ")
        print(f"   📅 Ngày gần nhất: {latest_date}")
        print(f"   📊 Hôm nay: {avg_pm25_today:.2f} µg/m³")
        print(f"   📊 Hôm qua: {avg_pm25_yesterday:.2f} µg/m³")
        print(f"   {arrow} Thay đổi: {change:+.2f} µg/m³ ({change_pct:+.1f}%)")
    else:
        print(f"\n3️⃣ TRUNG BÌNH PM2.5: {avg_pm25_today:.2f} µg/m³")
        print("   ⚠️ Không có dữ liệu hôm qua để so sánh")

    # Chuẩn bị dữ liệu cho biểu đồ xu hướng 7 ngày gần nhất
    df_7days_for_json = df_kpi[df_kpi['datetime'] >= (latest_ts - pd.Timedelta(days=7))]

    # Danh sách chỉ số cần tính (mapping key JSON -> tên cột trong df)
    metric_columns = {
        "pm25": "PM2.5",
        "co": "CO",
        "co2": "CO2",
        "so2": "SO2",
        "tsp": "TSP",
        "temperature": "Temperature",
        "humidity": "Humidity",
        "o3": "O3",
    }

    for metric_key, col_name in metric_columns.items():
        if col_name in df_7days_for_json.columns:
            daily_avg_metric = df_7days_for_json.groupby(df_7days_for_json['datetime'].dt.date)[col_name].mean()
            if len(daily_avg_metric) > 0:
                metric_labels = [d.isoformat() for d in daily_avg_metric.index]
                metric_values = [float(v) for v in daily_avg_metric.values]
                trend_multi[metric_key] = {
                    "labels": metric_labels,
                    "values": metric_values,
                }

                # Giữ lại trường cũ trend_labels / trend_values cho PM2.5
                if metric_key == "pm25":
                    trend_labels = metric_labels
                    trend_values = metric_values

    # Chuẩn bị dữ liệu "hiện tại" cho từng trạm để hiển thị trên bản đồ
    # Lấy các bản ghi tại thời điểm mới nhất latest_ts
    df_latest = df_kpi[df_kpi['datetime'] == latest_ts]
    if not df_latest.empty:
        for _, row in df_latest.iterrows():
            station_id = int(row['Station_No'])
            pm25_now = float(row['PM2.5']) if pd.notna(row['PM2.5']) else None
            level_en, level_vi, risk_code = classify_pm25_level(pm25_now) if pm25_now is not None else ("Unknown", "Không xác định", "moderate")

            stations_summary.append(
                {
                    "id": station_id,
                    "name": f"S{station_id}",
                    "type": STATION_TYPE_MAP.get(station_id),
                    "pm25": pm25_now,
                    "level_en": level_en,
                    "level_vi": level_vi,
                    "risk": risk_code,  # 'good' | 'moderate' | 'unhealthy'
                }
            )

    # Tính số giờ trong ngày PM2.5 > 15 µg/m³ cho từng trạm và chọn top 3
    if 'PM2.5' in df_kpi.columns:
        # Lọc dữ liệu trong ngày gần nhất latest_date
        df_latest_day = df_kpi[df_kpi['datetime'].dt.date == latest_date]
        if not df_latest_day.empty:
            # Đếm số bản ghi (giờ) có PM2.5 > 15 cho mỗi trạm
            df_exceed = df_latest_day[df_latest_day['PM2.5'] > 15]
            hours_by_station = (
                df_exceed.groupby('Station_No')['PM2.5']
                .count()
                .sort_values(ascending=False)
            )

            # Lấy top 3 trạm tệ nhất
            top3 = hours_by_station.head(3)
            for station, hours in top3.items():
                hours_above_threshold_labels.append(f"S{int(station)}")
                hours_above_threshold_values.append(int(hours))

# ------------------------------------------------------------------------------
# GHI KẾT QUẢ KPI RA FILE JSON CHO FRONTEND SỬ DỤNG
# ------------------------------------------------------------------------------
try:
    # Thư mục lưu file JSON (tương đối so với thư mục chạy script)
    kpi_output_dir = os.path.join("data", "overview")
    os.makedirs(kpi_output_dir, exist_ok=True)

    kpi_data = {
        "num_stations": int(num_stations),
        "most_polluted_station": most_polluted_station,
        "most_polluted_value": most_polluted_value,
        "most_polluted_type": most_polluted_type,
        "avg_pm25_today": float(avg_pm25_today) if avg_pm25_today is not None and pd.notna(avg_pm25_today) else None,
        "avg_pm25_yesterday": float(avg_pm25_yesterday) if avg_pm25_yesterday is not None and pd.notna(avg_pm25_yesterday) else None,
        "change": float(change) if change is not None else None,
        "change_pct": float(change_pct) if change_pct is not None else None,
        "arrow": arrow,
        "trend_labels": trend_labels,
        "trend_values": trend_values,
        "trend_multi": trend_multi if trend_multi else None,
        "stations": stations_summary if stations_summary else None,
        "ranking_labels": ranking_labels if ranking_labels else None,
        "ranking_values": ranking_values if ranking_values else None,
        "hours_above_threshold_labels": hours_above_threshold_labels if hours_above_threshold_labels else None,
        "hours_above_threshold_values": hours_above_threshold_values if hours_above_threshold_values else None,
    }

    kpi_json_path = os.path.join(kpi_output_dir, "overview_kpi.json")
    with open(kpi_json_path, "w", encoding="utf-8") as f:
        json.dump(kpi_data, f, ensure_ascii=False, indent=2)

    print(f"💾 Đã ghi KPI ra file JSON cho frontend: {kpi_json_path}")
except Exception as e:
    print(f"⚠️ Lỗi khi ghi file KPI JSON cho frontend: {e}")

print("\n✅ Hoàn thành tính toán KPI (chỉ in ra terminal / ghi JSON, không mở cửa sổ matplotlib)!")