# File: src/app.py
# This is the COMPLETE WORKING VERSION with proper CORS

from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
from routes.stations import stations_bp
from config.settings import DEBUG

def create_app():
    """Factory function để tạo Flask app"""
    app = Flask(__name__)
    
    # ==========================================
    # CRITICAL: Enable CORS for ALL routes
    # ==========================================
    # Method 1: Simple (enable for everything)
    CORS(app)
    
    # Method 2: Detailed (if you want more control)
    # CORS(app, resources={
    #     r"/*": {
    #         "origins": "*",
    #         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    #         "allow_headers": ["Content-Type", "Authorization"],
    #         "expose_headers": ["Content-Type"],
    #         "supports_credentials": False,
    #         "max_age": 3600
    #     }
    # })
    
    # Register blueprints
    app.register_blueprint(stations_bp, url_prefix='/api')
    
    # Health check endpoint with explicit CORS
    @app.route('/health', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def health_check():
        return jsonify({
            'status': 'healthy',
            'service': 'AirSense HCMC Backend',
            'version': '1.0.0'
        })
    
    # Root endpoint
    @app.route('/', methods=['GET', 'OPTIONS'])
    @cross_origin()
    def root():
        return jsonify({
            'message': 'AirSense HCMC API',
            'version': '1.0.0',
            'cors_enabled': True,
            'endpoints': {
                'health': '/health',
                'stations': '/api/stations',
                'station_detail': '/api/stations/<id>',
                'station_pm25': '/api/stations/<id>/pm25',
                'station_comparison': '/api/stations/<id>/comparison',
                'same_type_comparison': '/api/stations/<id>/same-type',
                'diff_type_comparison': '/api/stations/<id>/diff-type',
                'station_types': '/api/stations/types'
            }
        })
    
    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'success': False,
            'error': 'Endpoint not found',
            'message': str(error)
        }), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'message': str(error)
        }), 500
    
    # IMPORTANT: Add this after_request handler
    # This ensures CORS headers are added to ALL responses
    @app.after_request
    def add_cors_headers(response):
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response
    
    return app


# ==========================================
# If your routes.stations blueprint also needs CORS
# Make sure each route has @cross_origin() decorator
# ==========================================

# Example from routes/stations.py:
"""
from flask import Blueprint, jsonify
from flask_cors import cross_origin

stations_bp = Blueprint('stations', __name__)

@stations_bp.route('/stations', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_stations():
    # Your code here
    return jsonify({...})

@stations_bp.route('/stations/<station_id>', methods=['GET', 'OPTIONS'])
@cross_origin()
def get_station_detail(station_id):
    # Your code here
    return jsonify({...})
"""