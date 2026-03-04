import os
import sys
import subprocess
from dotenv import load_dotenv

# ======================================================
# 0) BASE PATHS
# ======================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # Back_End
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))   # ADA
SRC_DIR = os.path.join(BASE_DIR, "src")

# ======================================================
# 1) Auto use project .venv (if exists)
#    Allow running: python server.py
# ======================================================
VENV_PY = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")

try:
    if os.path.exists(VENV_PY):
        current = os.path.abspath(sys.executable)
        target = os.path.abspath(VENV_PY)

        if current.lower() != target.lower():
            print("🔄 Switching to project .venv Python...")
            code = subprocess.call([target, os.path.abspath(__file__), *sys.argv[1:]])
            raise SystemExit(code)
except Exception:
    # If re-exec fails, continue normally
    pass

# ======================================================
# 2) Ensure imports work (both layouts supported)
# ======================================================
for path in (PROJECT_ROOT, SRC_DIR):
    if path not in sys.path:
        sys.path.insert(0, path)

# ======================================================
# 3) Load environment variables
# ======================================================
load_dotenv()

# ======================================================
# 4) Import create_app (support multiple layouts)
# ======================================================
create_app = None

try:
    from src.app import create_app as _create_app
    create_app = _create_app
except Exception:
    try:
        from Back_End.src.app import create_app as _create_app
        create_app = _create_app
    except Exception as e:
        raise ImportError(
            "❌ Cannot import create_app from src.app or Back_End.src.app"
        ) from e

# ======================================================
# 5) Read HOST / PORT / DEBUG
# ======================================================
HOST = os.getenv("HOST") or os.getenv("FLASK_HOST") or "127.0.0.1"
PORT = int(os.getenv("PORT") or os.getenv("FLASK_PORT") or "5000")
DEBUG = (os.getenv("FLASK_DEBUG", "1") == "1")

# Override from settings.py if exists
try:
    from src.config.settings import HOST as _HOST, PORT as _PORT, DEBUG as _DEBUG
    HOST = _HOST
    PORT = _PORT
    DEBUG = _DEBUG
except Exception:
    pass


# ======================================================
# 6) RUN SERVER
# ======================================================
if __name__ == "__main__":
    app = create_app()

    print("\n🚀 AirSense HCMC Backend starting...")
    print(f"🌐 Server running at: http://{HOST}:{PORT}")
    print(f"🐛 Debug mode: {DEBUG}")
    print(f"📡 API base URL: http://{HOST}:{PORT}/api")
    print("-" * 60)

    # Show route map (debugging purpose)
    try:
        print(app.url_map)
    except Exception:
        pass

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG,
        use_reloader=False  # avoid Windows double execution
    )