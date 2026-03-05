import os
from typing import Optional, Dict, Any, List

import pandas as pd
from flask import Blueprint, jsonify


bp = Blueprint("overview_api", __name__)


# =============================================================================
# Paths
# =============================================================================
# File hiện tại: Back_End/src/routes/overview_api.py
# Muốn ra project root (ADA/ADA) => đi lên 4 cấp:
#   routes -> src -> Back_End -> (project root)
# Back_End/src/routes/overview_api.py -> đi lên 4 cấp -> ADA/ADA (project root)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
CSV_PATH = os.path.join(BASE_DIR, "data", "processed", "df_after_step_7_outlier_clean.csv")


# Mapping S1..S6 -> loại khu vực (theo map ở frontend)
STATION_TYPE_MAP = {
    1: "Giao thông",
    2: "Dân cư",
    3: "Công nghiệp",
    4: "Dân cư",
    5: "Giao thông",
    6: "Công nghiệp",
}


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


def _safe_float(x: Optional[float]) -> Optional[float]:
    if x is None or pd.isna(x):
        return None
    return float(x)


def compute_overview_kpis() -> Dict[str, Any]:
    """
    Tính toán toàn bộ KPI cho trang overview, trả về dict
    có cùng cấu trúc như file overview_kpi.json trước đây.
    """
    if not os.path.exists(CSV_PATH):
        return {
            "error": "Overview CSV not found",
            "csv_path": CSV_PATH,
        }

    df_kpi = pd.read_csv(CSV_PATH)
    # DEBUG: in tên cột để kiểm tra (xóa sau khi xác nhận)
    print(f"[DEBUG] CSV loaded: {len(df_kpi)} rows")
    print(f"[DEBUG] Columns: {list(df_kpi.columns)}")
    print(f"[DEBUG] CSV_PATH used: {CSV_PATH}")

    # -----------------------------
    # KPI 1: số trạm hiện có
    # -----------------------------
    num_stations = int(df_kpi["Station_No"].nunique()) if "Station_No" in df_kpi.columns else 0

    # -----------------------------
    # KPI 2: trạm ô nhiễm nhất + ranking
    # -----------------------------
    most_polluted_station: Optional[int] = None
    most_polluted_value: Optional[float] = None
    most_polluted_type: Optional[str] = None

    ranking_labels: List[str] = []
    ranking_values: List[float] = []

    if "PM2.5" in df_kpi.columns and "Station_No" in df_kpi.columns:
        station_avg_pm25 = (
            df_kpi.groupby("Station_No")["PM2.5"]
            .mean()
            .sort_values(ascending=False)
        )
        if len(station_avg_pm25) > 0:
            most_polluted_station = int(station_avg_pm25.index[0])
            most_polluted_value = float(station_avg_pm25.iloc[0])
            most_polluted_type = STATION_TYPE_MAP.get(most_polluted_station)

            for station, avg_pm in station_avg_pm25.items():
                ranking_labels.append(f"S{int(station)}")
                ranking_values.append(float(avg_pm))

    # -----------------------------
    # KPI 3: trung bình PM2.5 hôm nay / hôm qua
    # + trend 7 ngày, + thông tin từng trạm
    # -----------------------------
    avg_pm25_today: Optional[float] = None
    avg_pm25_yesterday: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    arrow: Optional[str] = None

    trend_labels: Optional[List[str]] = None
    trend_values: Optional[List[float]] = None
    trend_multi: Dict[str, Dict[str, List[Any]]] = {}

    stations_summary: List[Dict[str, Any]] = []
    hours_above_threshold_labels: List[str] = []
    hours_above_threshold_values: List[int] = []

    if "PM2.5" in df_kpi.columns and "datetime" in df_kpi.columns:
        df_kpi["datetime"] = pd.to_datetime(df_kpi["datetime"], errors="coerce")
        df_kpi = df_kpi.dropna(subset=["datetime"])

        if not df_kpi.empty:
            latest_ts = df_kpi["datetime"].max()
            latest_date = latest_ts.date()
            yesterday_date = (latest_ts - pd.Timedelta(days=1)).date()

            today_data = df_kpi[df_kpi["datetime"].dt.date == latest_date]
            yesterday_data = df_kpi[df_kpi["datetime"].dt.date == yesterday_date]

            if not today_data.empty:
                avg_pm25_today = today_data["PM2.5"].mean()
            if not yesterday_data.empty:
                avg_pm25_yesterday = yesterday_data["PM2.5"].mean()

            if pd.notna(avg_pm25_today) and pd.notna(avg_pm25_yesterday):
                change = float(avg_pm25_today - avg_pm25_yesterday)
                change_pct = (
                    (change / avg_pm25_yesterday) * 100
                    if avg_pm25_yesterday > 0
                    else 0.0
                )
                arrow = "↑" if change > 0 else "↓" if change < 0 else "→"

            # Trend 7 ngày gần nhất cho nhiều chỉ số
            df_7days_for_json = df_kpi[
                df_kpi["datetime"] >= (latest_ts - pd.Timedelta(days=7))
            ]

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
                    daily_avg_metric = df_7days_for_json.groupby(
                        df_7days_for_json["datetime"].dt.date
                    )[col_name].mean()
                    if len(daily_avg_metric) > 0:
                        metric_labels = [d.isoformat() for d in daily_avg_metric.index]
                        metric_values = [float(v) for v in daily_avg_metric.values]
                        trend_multi[metric_key] = {
                            "labels": metric_labels,
                            "values": metric_values,
                        }
                        if metric_key == "pm25":
                            trend_labels = metric_labels
                            trend_values = metric_values

            # Thông tin hiện tại từng trạm tại thời điểm latest_ts
            df_latest = df_kpi[df_kpi["datetime"] == latest_ts]
            if not df_latest.empty and "Station_No" in df_latest.columns:
                for _, row in df_latest.iterrows():
                    station_id = int(row["Station_No"])
                    pm25_now = (
                        float(row["PM2.5"])
                        if "PM2.5" in row and pd.notna(row["PM2.5"])
                        else None
                    )
                    if pm25_now is not None:
                        level_en, level_vi, risk_code = classify_pm25_level(pm25_now)
                    else:
                        level_en, level_vi, risk_code = (
                            "Unknown",
                            "Không xác định",
                            "moderate",
                        )

                    stations_summary.append(
                        {
                            "id": station_id,
                            "name": f"S{station_id}",
                            "type": STATION_TYPE_MAP.get(station_id),
                            "pm25": pm25_now,
                            "level_en": level_en,
                            "level_vi": level_vi,
                            "risk": risk_code,
                        }
                    )

            # Số giờ trong ngày PM2.5 > 15 µg/m³ cho từng trạm (top 3)
            if "PM2.5" in df_kpi.columns:
                df_latest_day = df_kpi[df_kpi["datetime"].dt.date == latest_date]
                if not df_latest_day.empty:
                    df_exceed = df_latest_day[df_latest_day["PM2.5"] > 15]
                    hours_by_station = (
                        df_exceed.groupby("Station_No")["PM2.5"]
                        .count()
                        .sort_values(ascending=False)
                    )
                    top3 = hours_by_station.head(3)
                    for station, hours in top3.items():
                        hours_above_threshold_labels.append(f"S{int(station)}")
                        hours_above_threshold_values.append(int(hours))

    # Đóng gói kết quả, giữ cùng schema như JSON cũ
    kpi_data: Dict[str, Any] = {
        "num_stations": int(num_stations),
        "most_polluted_station": most_polluted_station,
        "most_polluted_value": _safe_float(most_polluted_value),
        "most_polluted_type": most_polluted_type,
        "avg_pm25_today": _safe_float(avg_pm25_today),
        "avg_pm25_yesterday": _safe_float(avg_pm25_yesterday),
        "change": _safe_float(change),
        "change_pct": _safe_float(change_pct),
        "arrow": arrow,
        "trend_labels": trend_labels,
        "trend_values": trend_values,
        "trend_multi": trend_multi if trend_multi else None,
        "stations": stations_summary if stations_summary else None,
        "ranking_labels": ranking_labels if ranking_labels else None,
        "ranking_values": ranking_values if ranking_values else None,
        "hours_above_threshold_labels": hours_above_threshold_labels
        if hours_above_threshold_labels
        else None,
        "hours_above_threshold_values": hours_above_threshold_values
        if hours_above_threshold_values
        else None,
    }

    return kpi_data


@bp.get("/overview")
def get_overview():
    """
    API cho trang overview:
    - URL đầy đủ: /api/overview (được mount với url_prefix="/api")
    - Tính toán KPI từ CSV và trả về JSON cho frontend.
    """
    try:
        data = compute_overview_kpis()

        # Nếu không tìm thấy CSV -> 404 cho FE dễ debug
        if "error" in data and data.get("error") == "Overview CSV not found":
            return jsonify(data), 404

        return jsonify(data)
    except Exception as e:
        return jsonify(
            {
                "error": "Failed to compute overview KPI",
                "exception": str(e),
            }
        ), 500