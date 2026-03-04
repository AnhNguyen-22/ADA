import os
import sys
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS, cross_origin


def create_app():
    """
    FINAL MERGED VERSION
    - Full frontend serving
    - Full API blueprints
    - Strong global CORS
    - Processed data serving
    - Clean structure
    """

    # ======================================================
    # PATH CONFIG
    # Back_End/src -> Back_End -> Project Root
    # ======================================================
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    project_root = os.path.abspath(os.path.join(backend_root, ".."))
    frontend_root = os.path.join(project_root, "Front_End")
    processed_root = os.path.join(project_root, "data", "processed")

    app = Flask(__name__)

    # ======================================================
    # CORS CONFIG (Strong Mode)
    # ======================================================
    CORS(app)

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Max-Age"] = "3600"
        return response

    # ======================================================
    # BLUEPRINT AUTO REGISTER
    # ======================================================

    def try_register(import_path, bp_name, url_prefix=None):
        # Try original path first, then fallback without "Back_End." prefix
        paths_to_try = [import_path]
        if import_path.startswith("Back_End."):
            paths_to_try.append(import_path.replace("Back_End.", "", 1))

        last_err = None
        for path in paths_to_try:
            try:
                module = __import__(path, fromlist=[bp_name])
                bp_obj = getattr(module, bp_name)
                app.register_blueprint(bp_obj, url_prefix=url_prefix)
                print(f"✅ Registered: {path}")
                return
            except Exception as e:
                last_err = e

        print(f"⚠️ Skip {import_path}: {last_err}")

    # Stations
    try_register("Back_End.src.routes.stations", "stations_bp", "/api")

    # Recommendations
    try_register("Back_End.src.routes.recommendations", "bp")

    # Overview KPI
    try_register("Back_End.src.routes.overview_api", "bp", "/api")

    # Other optional routes (safe)
    try_register("Back_End.src.routes.policy_suggestions", "bp")
    try_register("Back_End.src.routes.dataset", "bp")
    try_register("Back_End.src.routes.model_evaluation", "bp")
    try_register("Back_End.src.routes.auth", "bp")

    # ======================================================
    # API CORE ENDPOINTS
    # ======================================================

    @app.get("/api/health")
    def api_health():
        return {"ok": True, "message": "Backend is running"}

    # ======================================================
    # OVERVIEW KPI - Direct route (bypass blueprint import issues)
    # ======================================================

    @app.route("/health", methods=["GET", "OPTIONS"])
    @cross_origin()
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "AirSense HCMC Backend",
            "version": "1.0.0"
        })

    @app.route("/api", methods=["GET", "OPTIONS"])
    @cross_origin()
    def api_root():
        return jsonify({
            "message": "AirSense HCMC API",
            "version": "1.0.0",
            "cors_enabled": True
        })

    # ======================================================
    # SERVE FRONTEND
    # ======================================================

    @app.get("/")
    def serve_index():
        return send_from_directory(frontend_root, "index.html")

    @app.get("/pages/<path:filename>")
    def serve_pages(filename):
        return send_from_directory(os.path.join(frontend_root, "pages"), filename)

    @app.get("/assets/<path:filename>")
    def serve_assets(filename):
        return send_from_directory(os.path.join(frontend_root, "assets"), filename)

    @app.get("/components/<path:filename>")
    def serve_components(filename):
        return send_from_directory(os.path.join(frontend_root, "components"), filename)

    @app.get("/recommendations")
    def go_recommendations():
        return send_from_directory(os.path.join(frontend_root, "pages"), "recommendations.html")

    # ======================================================
    # SERVE PROCESSED DATA
    # ======================================================

    @app.get("/data/processed/<path:filename>")
    def serve_processed(filename):
        return send_from_directory(processed_root, filename)

    # ======================================================
    # DEBUG PATHS
    # ======================================================

    @app.get("/__paths")
    def debug_paths():
        return jsonify({
            "backend_root": backend_root,
            "project_root": project_root,
            "frontend_root": frontend_root,
            "processed_root": processed_root
        })

    # ======================================================
    # ERROR HANDLERS
    # ======================================================

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


# ======================================================
# RUN DIRECTLY (DEV MODE)
# ======================================================

if __name__ == "__main__":
    app = create_app()
    print(" Server running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000)