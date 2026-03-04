import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS, cross_origin


def create_app():
    # ======================================================
    # PATH CONFIG
    # ======================================================
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    project_root = os.path.abspath(os.path.join(backend_root, ".."))
    frontend_root = os.path.join(project_root, "Front_End")
    processed_root = os.path.join(project_root, "data", "processed")

    app = Flask(__name__)

    # ======================================================
    # CORS
    # ======================================================
    CORS(app)

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        return response

    # ======================================================
    # REGISTER BLUEPRINTS
    # ======================================================

    def try_register(import_path, bp_name, url_prefix=None):
        try:
            module = __import__(import_path, fromlist=[bp_name])
            bp = getattr(module, bp_name)
            app.register_blueprint(bp, url_prefix=url_prefix)
            print(f"✅ Registered blueprint: {import_path}")
        except Exception as e:
            print(f"⚠️ Could not register {import_path}: {e}")

    try_register("Back_End.src.routes.stations", "stations_bp", "/api")
    try_register("Back_End.src.routes.recommendations", "bp")
    try_register("Back_End.src.routes.policy_suggestions", "bp")
    try_register("Back_End.src.routes.dataset", "bp")
    try_register("Back_End.src.routes.overview", "bp")
    try_register("Back_End.src.routes.model_evaluation", "bp")
    try_register("Back_End.src.routes.auth", "bp")

    # ======================================================
    # HEALTH CHECK
    # ======================================================

    @app.get("/api/health")
    def api_health():
        return {"ok": True, "message": "Backend is running"}

    @app.route("/health", methods=["GET", "OPTIONS"])
    @cross_origin()
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "AirSense HCMC Backend",
            "version": "1.0.0"
        })

    @app.route("/api", methods=["GET"])
    def api_root():
        return jsonify({
            "message": "AirSense HCMC API",
            "version": "1.0.0"
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

    # ======================================================
    # SERVE DATA
    # ======================================================

    @app.get("/data/processed/<path:filename>")
    def serve_processed(filename):
        return send_from_directory(processed_root, filename)

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
    print("Server Back-End đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)