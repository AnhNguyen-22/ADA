import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS, cross_origin

def create_app():
    """
    MERGED VERSION:
    - UI serve (Front_End) like Version 1
    - API blueprints (stations + recommendations) like Version 2 + Version 1
    - Strong CORS (CORS(app) + after_request) like Version 2
    """

    # =========================
    # Paths (Version 1)
    # Back_End/src -> Back_End -> project root -> Front_End
    # =========================
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))   # Back_End
    project_root = os.path.abspath(os.path.join(backend_root, ".."))               # ADA/ADA (project root)
    frontend_root = os.path.join(project_root, "Front_End")

    app = Flask(__name__)

    # =========================
    # CORS (Version 2)
    # =========================
    CORS(app)

    @app.after_request
    def add_cors_headers(response):
        # Ensure CORS headers on ALL responses (even errors/static)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response

    # =========================
    # Register API blueprints
    # =========================

    # ---- stations blueprint (Version 2) ----
    # Try multiple import styles so it works regardless of your folder/module layout
    stations_bp = None
    try:
        # If your project uses Back_End/src/routes/stations.py with package path
        from Back_End.src.routes.stations import stations_bp as _stations_bp
        stations_bp = _stations_bp
    except Exception:
        try:
            # If your project uses src/routes/stations.py
            from Back_End.src.routes.stations import stations_bp as _stations_bp
            stations_bp = _stations_bp
        except Exception:
            try:
                # If your project uses routes/stations.py
                from routes.stations import stations_bp as _stations_bp
                stations_bp = _stations_bp
            except Exception:
                stations_bp = None

    if stations_bp is not None:
        app.register_blueprint(stations_bp, url_prefix="/api")

    # ---- recommendations blueprint (Version 1) ----
    recommendations_bp = None
    try:
        from Back_End.src.routes.recommendations import bp as _reco_bp
        recommendations_bp = _reco_bp
    except Exception:
        try:
            from Back_End.src.routes.recommendations import bp as _reco_bp
            recommendations_bp = _reco_bp
        except Exception:
            try:
                from routes.recommendations import bp as _reco_bp
                recommendations_bp = _reco_bp
            except Exception:
                recommendations_bp = None

    if recommendations_bp is not None:
        app.register_blueprint(recommendations_bp)  # blueprint already defines /api/recommendations in your code

    # ---- model_evaluation blueprint ----
    model_eval_bp = None
    try:
        from Back_End.src.routes.model_evaluation import bp as _model_eval_bp
        model_eval_bp = _model_eval_bp
    except Exception:
        try:
            from src.routes.model_evaluation import bp as _model_eval_bp
            model_eval_bp = _model_eval_bp
        except Exception:
            try:
                from routes.model_evaluation import bp as _model_eval_bp
                model_eval_bp = _model_eval_bp
            except Exception:
                model_eval_bp = None

    if model_eval_bp is not None:
        app.register_blueprint(model_eval_bp)  # blueprint defines /api/model-evaluation routes

    # =========================
    # API endpoints
    # =========================

    # Version 1 style health (keep)
    @app.get("/api/health")
    def api_health():
        return {"ok": True, "message": "Backend is running"}

    # Version 2 style health (keep)
    @app.route("/health", methods=["GET", "OPTIONS"])
    @cross_origin()
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "AirSense HCMC Backend",
            "version": "1.0.0"
        })

    # Put API index at /api to avoid conflict with UI "/" (important!)
    @app.route("/api", methods=["GET", "OPTIONS"])
    @cross_origin()
    def api_root():
        return jsonify({
            "message": "AirSense HCMC API",
            "version": "1.0.0",
            "cors_enabled": True,
            "endpoints": {
                "health": "/health",
                "api_health": "/api/health",
                "recommendations": "/api/recommendations",
                "stations": "/api/stations",
                "station_detail": "/api/stations/<id>",
                "station_pm25": "/api/stations/<id>/pm25",
                "station_comparison": "/api/stations/<id>/comparison",
                "same_type_comparison": "/api/stations/<id>/same-type",
                "diff_type_comparison": "/api/stations/<id>/diff-type",
                "station_types": "/api/stations/types"
            }
        })

    # =========================
    # UI serving (Version 1)
    # =========================

    @app.get("/")
    def serve_index():
        # Front_End/index.html
        return send_from_directory(frontend_root, "index.html")

    @app.get("/pages/<path:filename>")
    def serve_pages(filename):
        # Front_End/pages/...
        return send_from_directory(os.path.join(frontend_root, "pages"), filename)

    @app.get("/assets/<path:filename>")
    def serve_assets(filename):
        # Front_End/assets/...
        return send_from_directory(os.path.join(frontend_root, "assets"), filename)

    @app.get("/components/<path:filename>")
    def serve_components(filename):
        # Front_End/components/...
        return send_from_directory(os.path.join(frontend_root, "components"), filename)

    @app.get("/recommendations")
    def go_recommendations():
        return send_from_directory(os.path.join(frontend_root, "pages"), "recommendations.html")

    @app.get("/__paths")
    def debug_paths():
        return jsonify({
            "backend_root": backend_root,
            "project_root": project_root,
            "frontend_root": frontend_root
        })

    # =========================
    # Error handlers (Version 2)
    # =========================
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": "Endpoint not found",
            "message": str(error)
        }), 404

    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            "success": False,
            "error": "Internal server error",
            "message": str(error)
        }), 500

    return app