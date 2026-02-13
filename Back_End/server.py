import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.app import create_app
from src.config.settings import HOST, PORT, DEBUG


if __name__ == '__main__':
    app = create_app()
    print(" AirSense HCMC Backend starting...")
    print(f" Server running at: http://{HOST}:{PORT}")
    print(f" Debug mode: {DEBUG}")
    print(f" API endpoints available at: http://{HOST}:{PORT}/api/")
    print("-" * 50)

    print(app.url_map)  # ← chuyển vào đây

    app.run(
        host=HOST,
        port=PORT,
        debug=DEBUG,
        use_reloader=False
    )