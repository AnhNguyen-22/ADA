import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS, cross_origin

# ======================================================
# SAFE DIRECT IMPORT (Version 1 style)
# - Nếu bạn đang có routes/auth.py và routes/dataset.py
#   thì 2 blueprint này sẽ được đăng ký chắc chắn.
# ======================================================
try:
    from routes.auth import auth_bp
except Exception as e:
    auth_bp = None
    print(f"⚠️ Cannot import routes.auth: {e}")

try:
    from routes.dataset import dataset_bp
except Exception as e:
    dataset_bp = None
    print(f"⚠️ Cannot import routes.dataset: {e}")


def create_app():
    """
    MERGED VERSION
    - Full frontend serving
    - Register auth_bp + dataset_bp directly (version 1)
    - Auto register other blueprints (version 2) with MORE fallback paths (version 1+)
    - Strong global CORS
    - Processed data serving
    - Prevent duplicate blueprint registration
    """

    # ======================================================
    # PATH CONFIG
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
    # REGISTER BLUEPRINTS (Version 1 - direct)
    # ======================================================
    if auth_bp is not None:
        # tránh trùng key nếu blueprint name = "auth"
        if auth_bp.name not in app.blueprints:
            app.register_blueprint(auth_bp)
            print("✅ Registered: routes.auth.auth_bp")
        else:
            print("ℹ️ Skip direct auth_bp (already registered)")

    if dataset_bp is not None:
        if dataset_bp.name not in app.blueprints:
            app.register_blueprint(dataset_bp)
            print("✅ Registered: routes.dataset.dataset_bp")
        else:
            print("ℹ️ Skip direct dataset_bp (already registered)")

    # ======================================================
    # BLUEPRINT AUTO REGISTER (Version 2 - optional/safe)
    # + thêm fallback paths & dedupe (bản 1 mạnh hơn)
    # + chống register trùng blueprint (fix)
    # ======================================================
    def try_register(import_path, bp_name, url_prefix=None):
        """
        Try import blueprint by path + name.
        Fallback:
          - remove 'Back_End.' prefix
          - Back_End.src.routes.*  -> routes.*
          - src.routes.*           -> routes.*
        Prevent duplicate registration (same blueprint.name).
        """
        paths_to_try = [import_path]

        if import_path.startswith("Back_End."):
            paths_to_try.append(import_path.replace("Back_End.", "", 1))
        if import_path.startswith("Back_End.src.routes."):
            paths_to_try.append(import_path.replace("Back_End.src.routes.", "routes.", 1))
        if import_path.startswith("src.routes."):
            paths_to_try.append(import_path.replace("src.routes.", "routes.", 1))

        # Keep order but remove duplicates
        seen = set()
        deduped = []
        for p in paths_to_try:
            if p not in seen:
                seen.add(p)
                deduped.append(p)
        paths_to_try = deduped

        last_err = None
        for path in paths_to_try:
            try:
                module = __import__(path, fromlist=[bp_name])
                bp_obj = getattr(module, bp_name)

                # ✅ tránh register trùng blueprint (auth/dataset hay bất kỳ cái nào)
                if bp_obj.name in app.blueprints:
                    print(f"ℹ️ Skip {path}.{bp_name} (blueprint '{bp_obj.name}' already registered)")
                    return True

                app.register_blueprint(bp_obj, url_prefix=url_prefix)
                print(f"✅ Registered: {path}.{bp_name}" + (f" (prefix={url_prefix})" if url_prefix else ""))
                return True
            except Exception as e:
                last_err = e

        print(f"⚠️ Skip {import_path}.{bp_name}: {last_err}")
        return False

    # Bạn có thể giữ list này như bản 2, nó sẽ tự skip nếu không tồn tại
    try_register("Back_End.src.routes.stations", "stations_bp", "/api")

    try_register("Back_End.src.routes.recommendations", "bp")
    try_register("Back_End.src.routes.overview_api", "bp", "/api")

    try_register("Back_End.src.routes.policy_suggestions", "bp")
    try_register("Back_End.src.routes.dataset", "bp")        # sẽ auto-skip nếu dataset_bp đã register
    try_register("Back_End.src.routes.model_evaluation", "bp")
    try_register("Back_End.src.routes.auth", "bp")           # sẽ auto-skip nếu auth_bp đã register

    # ======================================================
    # API CORE ENDPOINTS
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
    print("Server Back-End đang chạy tại: http://127.0.0.1:5000")
    app.run(debug=True, port=5000)