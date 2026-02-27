"""
Model Evaluation API Routes
Provides endpoints for model comparison and evaluation metrics
"""

from flask import Blueprint, jsonify, request
from flask_cors import cross_origin

bp = Blueprint('model_evaluation', __name__, url_prefix='/api')

# ====================================================
# Sample data to simulate database
# In production, replace with actual DB queries
# ====================================================
MODEL_DATA = {
    "s1": {
        "station_name": "S1 - Giao thông",
        "station_code": "s1",
        "area_type": "Traffic",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 9.3,
                "mae": 10.0,
                "r2": 0.85,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 8.5,
                "mae": 9.2,
                "r2": 0.87,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 7.8,
                "mae": 8.5,
                "r2": 0.91,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Là mô hình Machine Learning dựa trên Gradient Boosting, đạt hiệu suất cao nhất với R² = 0.91. Phù hợp nhất cho dự báo chất lượng không khí tại khu vực giao thông."
        },
        "area_difference": "Traffic thường biến động theo giờ → khó hơn Residential",
        "choose_reason": "ưu tiên R² cao (0.91) và RMSE/MAE thấp, đồng thời ổn định khi áp dụng đa trạm"
    },
    "s2": {
        "station_name": "S2 - Dân cư",
        "station_code": "s2",
        "area_type": "Residential",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 6.2,
                "mae": 5.8,
                "r2": 0.89,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 5.5,
                "mae": 5.0,
                "r2": 0.92,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 5.1,
                "mae": 4.6,
                "r2": 0.94,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Mô hình tốt nhất cho khu vực dân cư với R² = 0.94. Biến động thấp hơn khu vực giao thông, dễ dự báo hơn."
        },
        "area_difference": "Khu vực dân cư ổn định hơn, biến động nhỏ → dễ dự báo",
        "choose_reason": "R² cao (0.94) với RMSE/MAE thấp nhất, hiệu suất vượt trội"
    },
    "s3": {
        "station_name": "S3 - Công nghiệp",
        "station_code": "s3",
        "area_type": "Industrial",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 11.5,
                "mae": 12.3,
                "r2": 0.79,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 10.2,
                "mae": 11.0,
                "r2": 0.84,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 9.4,
                "mae": 10.1,
                "r2": 0.87,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Mô hình cho khu vực công nghiệp với R² = 0.87. Khu vực này phức tạp hơn do ảnh hưởng của các nguồn thải công nghiệp."
        },
        "area_difference": "Khu vực công nghiệp phức tạp với sự thay đổi không dự đoán được từ các nguồn thải",
        "choose_reason": "R² tối ưu (0.87) cân bằng giữa độ chính xác và khả năng áp dụng thực tế"
    },
    "s4": {
        "station_name": "S4 - Dân cư khu vực 2",
        "station_code": "s4",
        "area_type": "Residential",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 7.1,
                "mae": 6.5,
                "r2": 0.88,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 6.0,
                "mae": 5.4,
                "r2": 0.91,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 5.5,
                "mae": 4.9,
                "r2": 0.93,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Mô hình tốt nhất cho khu vực dân cư 2 với R² = 0.93. Hiệu suất cao nhất trong tất cả các trạm dân cư."
        },
        "area_difference": "Khu vực dân cư ổn định, biến động nhỏ, dễ dự báo",
        "choose_reason": "R² cao (0.93) là cao nhất, RMSE/MAE thấp nhất"
    },
    "s5": {
        "station_name": "S5 - Công nghiệp khu vực 2",
        "station_code": "s5",
        "area_type": "Industrial",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 12.3,
                "mae": 13.1,
                "r2": 0.77,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 10.8,
                "mae": 11.5,
                "r2": 0.82,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 9.9,
                "mae": 10.6,
                "r2": 0.85,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Mô hình cho khu vực công nghiệp 2 với R² = 0.85. Phức tạp hơn dân cư nhưng tốt hơn S3 về hiệu suất."
        },
        "area_difference": "Khu vực công nghiệp với nhiều biến động từ các khí thải công nhân",
        "choose_reason": "R² = 0.85 tốt nhất, cân bằng độ chính xác và ổn định"
    },
    "s6": {
        "station_name": "S6 - Thương mại & Hỗn hợp",
        "station_code": "s6",
        "area_type": "Commercial",
        "models": [
            {
                "name": "Linear Regression",
                "rmse": 8.2,
                "mae": 7.8,
                "r2": 0.86,
                "is_best": False
            },
            {
                "name": "Random Forest",
                "rmse": 7.1,
                "mae": 6.6,
                "r2": 0.89,
                "is_best": False
            },
            {
                "name": "XGBoost",
                "rmse": 6.5,
                "mae": 5.9,
                "r2": 0.91,
                "is_best": True
            }
        ],
        "best_model": {
            "name": "XGBOOST",
            "description": "Mô hình cho khu vực thương mại với R² = 0.91. Điểm giao thương, mua bán tạo biến động trung bình."
        },
        "area_difference": "Khu vực thương mại có biến động trung bình từ giao thông khách và hàng hóa",
        "choose_reason": "R² = 0.91 rất tốt, RMSE/MAE cân bằng tốt"
    }
}

# ====================================================
# Routes
# ====================================================

@bp.route('/model-evaluation', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_model_evaluation():
    """
    GET /api/model-evaluation?station=s1
    
    Query params:
    - station: station code (s1, s2, s3, s4, s5, s6) - default: s1
    
    Returns evaluation data for the specified station
    """
    try:
        station = request.args.get('station', 's1').lower()
        
        # Validate station
        if station not in MODEL_DATA:
            return jsonify({
                "error": "Station not found",
                "available_stations": list(MODEL_DATA.keys())
            }), 404
        
        data = MODEL_DATA[station]
        
        return jsonify({
            "success": True,
            "data": data,
            "available_stations": [
                {"code": key, "name": MODEL_DATA[key]["station_name"]} 
                for key in MODEL_DATA.keys()
            ]
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@bp.route('/model-evaluation/stations', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_evaluation_stations():
    """
    GET /api/model-evaluation/stations
    
    Returns list of available stations for model evaluation
    """
    try:
        stations = [
            {
                "code": key,
                "name": MODEL_DATA[key]["station_name"],
                "area_type": MODEL_DATA[key]["area_type"]
            }
            for key in MODEL_DATA.keys()
        ]
        
        return jsonify({
            "success": True,
            "stations": stations
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@bp.route('/model-evaluation/<station_code>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_station_evaluation(station_code):
    """
    GET /api/model-evaluation/<station_code>
    
    Returns evaluation data for specific station
    Example: /api/model-evaluation/s1
    """
    try:
        station_code = station_code.lower()
        
        if station_code not in MODEL_DATA:
            return jsonify({
                "error": "Station not found",
                "available_stations": list(MODEL_DATA.keys())
            }), 404
        
        data = MODEL_DATA[station_code]
        
        return jsonify({
            "success": True,
            "data": data
        }), 200
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500
