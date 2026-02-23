
# Project root (ProjectADA_AirSense)
from pathlib import Path
import os

# Start from this file
BASE_DIR = Path(__file__).resolve()

# Tìm thư mục gốc có chứa folder data/raw (tránh while vô hạn)
root = BASE_DIR
for _ in range(12):  # đi lên tối đa 12 cấp
    if (root / "data" / "raw").exists():
        BASE_DIR = root
        break
    root = root.parent
else:
    # fallback: lấy thư mục Back_End (settings.py nằm ở Back_End/src/config/)
    BASE_DIR = Path(__file__).resolve().parents[2]

DATA_DIR = BASE_DIR / "data" / "raw"
CSV_FILE = DATA_DIR / "AirQualityHoChiMinhCity.csv"

DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', 5000))

# CORS settings
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')


# Station metadata
STATION_METADATA = {
    '1': {
        'name': 'S1 - Giao thông',
        'type': 'traffic',
        'location': 'Quận 1, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu vực giao thông đông đúc'
    },
    '2': {
        'name': 'S2 - Công nghiệp',
        'type': 'industrial',
        'location': 'Quận 12, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu công nghiệp'
    },
    '3': {
        'name': 'S3 - Dân cư',
        'type': 'residential',
        'location': 'Quận 3, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu dân cư'
    },
    '4': {
        'name': 'S4 - Giao thông',
        'type': 'traffic',
        'location': 'Quận 7, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu vực giao thông'
    },
    '5': {
        'name': 'S5 - Công nghiệp',
        'type': 'industrial',
        'location': 'Quận Bình Tân, TP.HCM',
        'description': 'Trạm đo chất lượng không khí tại khu công nghiệp'
    }
}

# AQI thresholds
WHO_GUIDELINE_PM25 = 15  # µg/m³

# Type labels in Vietnamese
TYPE_LABELS_VI = {
    'traffic': 'Giao thông',
    'industrial': 'Công nghiệp',
    'residential': 'Dân cư'
}