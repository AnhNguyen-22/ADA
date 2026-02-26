import os
import sys
from dotenv import load_dotenv

# ==========================================
# 0) Prefer project .venv automatically
# - Cho phép bạn chạy đúng theo yêu cầu: python server.py
# - Nếu project có .venv và python hiện tại KHÔNG phải .venv,
#   sẽ tự chạy lại bằng .venv python (tránh lỗi thiếu pandas/numpy...)
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))          # .../ADA/Back_End
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))   # .../ADA
VENV_PY = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")

try:
    if os.path.exists(VENV_PY):
        current = os.path.abspath(sys.executable)
        target = os.path.abspath(VENV_PY)
        if current.lower() != target.lower():
            # Dùng subprocess để tránh các vấn đề quoting trên Windows Store Python
            import subprocess
            code = subprocess.call([target, os.path.abspath(__file__), *sys.argv[1:]])
            raise SystemExit(code)
except Exception:
    # Nếu không re-exec được thì tiếp tục chạy bình thường
    pass

# ==========================================
# 1) Ensure imports work (both layouts)
# - If your project uses Back_End/src/...
# - Or just src/...
# ==========================================
SRC_DIR = os.path.join(BASE_DIR, "src")
for p in (PROJECT_ROOT, SRC_DIR):
    if p not in sys.path:
        sys.path.insert(0, p)

# ==========================================
# 2) Load .env
# ==========================================
load_dotenv()

# ==========================================
# 3) Import create_app (support both import styles)
# ==========================================
create_app = None
try:
    # most common in your codebase
    from src.app import create_app as _create_app
    create_app = _create_app
except Exception:
    try:
        # if packaged as Back_End.src
        from Back_End.src.app import create_app as _create_app
        create_app = _create_app
    except Exception as e:
        raise ImportError("Cannot import create_app from src.app or Back_End.src.app") from e

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
except Exception:
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