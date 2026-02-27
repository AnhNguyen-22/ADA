import os
import sys
from dotenv import load_dotenv

# ==========================================
# 1) Ensure imports work (both layouts)
# - If your project uses Back_End/src/...
# - Or just src/...
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Back_End folder
SRC_DIR = os.path.join(BASE_DIR, "src")

# Add Back_End folder to path so "from src.app import" works
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

# ==========================================
# 2) Load .env
# ==========================================
load_dotenv()

# ==========================================
# 3) Import create_app
# ==========================================
try:
    from src.app import create_app
except ImportError as e:
    print(f"❌ Failed to import: {e}")
    print(f"   Python path: {sys.path[:3]}")
    raise

# ==========================================
# 4) Read HOST/PORT/DEBUG (support settings + env)
# ==========================================
HOST = os.getenv("HOST") or os.getenv("FLASK_HOST") or "127.0.0.1"
PORT = int(os.getenv("PORT") or os.getenv("FLASK_PORT") or "5000")
DEBUG = (os.getenv("FLASK_DEBUG", "1") == "1")

# Try to override from src.config.settings if exists
try:
    from src.config.settings import HOST as _HOST, PORT as _PORT, DEBUG as _DEBUG
    HOST = _HOST
    PORT = _PORT
    DEBUG = _DEBUG
except ImportError:
    # no settings file or different structure -> keep env defaults
    pass


if __name__ == "__main__":
    app = create_app()

    print(" AirSense HCMC Backend starting...")
    print(f" Server running at: http://{HOST}:{PORT}")
    print(f" Debug mode: {DEBUG}")
    print(f" API endpoints available at: http://{HOST}:{PORT}/api")
    print("-" * 50)

    # Show routes map (good for debugging)
    try:
        print(app.url_map)
    except Exception:
        pass

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG,
        use_reloader=False  # avoid double-run issues on Windows
    )