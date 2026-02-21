import os
from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS

def create_app():
    # Back_End/src -> Back_End -> (project root) -> Front_End
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    project_root = os.path.abspath(os.path.join(backend_root, ".."))
    frontend_root = os.path.join(project_root, "Front_End")

    app = Flask(__name__)
    CORS(app)

    # -------------------- API --------------------
    @app.get("/api/health")
    def health():
        return {"ok": True, "message": "Backend is running"}

    # IMPORTANT: import đúng package src.*
    from Back_End.src.routes.recommendations import bp as recommendations_bp
    app.register_blueprint(recommendations_bp)

    # -------------------- UI SERVE --------------------
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

    # route phụ: mở nhanh recommendations page
    @app.get("/recommendations")
    def go_recommendations():
        return send_from_directory(os.path.join(frontend_root, "pages"), "recommendations.html")

    # debug route (nhìn path thật)
    @app.get("/__paths")
    def debug_paths():
        return jsonify({
            "backend_root": backend_root,
            "project_root": project_root,
            "frontend_root": frontend_root
        })

    return app
