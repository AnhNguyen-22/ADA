import os
import json
from flask import Blueprint, jsonify, send_from_directory

bp = Blueprint("policy_suggestions", __name__)

def _project_root():
    # File: Back_End/src/routes/policy_suggestions.py
    # Lên 3 cấp: routes -> src -> Back_End -> project root
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))

def _processed_dir():
    return os.path.join(_project_root(), "data", "processed")

def _read_json(path: str):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

@bp.get("/api/policy-suggestions/ping")
def ping():
    return jsonify({"ok": True, "message": "policy_suggestions route is mounted"})

@bp.get("/api/policy-suggestions")
def get_policy_suggestions():
    """
    Reads: project_root/data/processed/policy_suggestions_payload.json
    Returns: payload for UI (kèm plot_url trỏ đúng ảnh trong project)
    """
    pdir = _processed_dir()
    payload_path = os.path.join(pdir, "policy_suggestions_payload.json")

    payload = _read_json(payload_path)
    if payload is None:
        return jsonify({
            "ok": False,
            "message": "Missing processed file",
            "processed_dir_used": pdir,
            "missing": ["policy_suggestions_payload.json"]
        }), 404

    # Chuẩn hoá đường dẫn ảnh SHAP để FE load được
    # Ảnh nằm: data/processed/shap_summary.png
    shap = payload.get("shap", {}) or {}
    shap["available"] = True if shap.get("available") is True else bool(shap.get("available"))
    shap["plot_url"] = "/data/processed/shap_summary.png"

    payload["shap"] = shap
    payload["ok"] = True
    payload["processed_dir_used"] = pdir
    return jsonify(payload)

# Serve static files inside data/processed (png/json)
@bp.get("/data/processed/<path:filename>")
def serve_processed(filename):
    return send_from_directory(_processed_dir(), filename)