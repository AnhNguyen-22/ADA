import os
import io
import json
import numpy as np
from PIL import Image
from flask import Blueprint, jsonify, send_from_directory, send_file

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

def _strip_white_bg(img: Image.Image) -> Image.Image:
    """Xóa nền trắng/xám nhạt của matplotlib PNG, trả về RGBA trong suốt."""
    img = img.convert("RGBA")
    data = np.array(img)
    r, g, b, a = data[:,:,0], data[:,:,1], data[:,:,2], data[:,:,3]
    ri, gi, bi = r.astype(int), g.astype(int), b.astype(int)

    near_white     = (r > 235) & (g > 235) & (b > 235)
    near_lightgray = (r > 220) & (g > 220) & (b > 220) \
                   & (np.abs(ri - gi) < 15) & (np.abs(gi - bi) < 15)
    soft_mask      = (r > 200) & (g > 200) & (b > 200) \
                   & (np.abs(ri - gi) < 20) & (np.abs(gi - bi) < 20) \
                   & ~near_white & ~near_lightgray

    hard_mask = near_white | near_lightgray
    data[:,:,3] = np.where(
        hard_mask, 0,
        np.where(soft_mask, np.clip((255 - ri) * 3, 0, 255).astype(np.uint8), a)
    )
    return Image.fromarray(data)


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

    shap = payload.get("shap", {}) or {}
    shap["available"] = True if shap.get("available") is True else bool(shap.get("available"))
    shap["plot_url"] = "/data/processed/shap_summary.png"

    payload["shap"] = shap
    payload["ok"] = True
    payload["processed_dir_used"] = pdir
    return jsonify(payload)


# Serve static files inside data/processed (png/json)
# PNG có tên chứa "shap_" → tự động strip nền trắng on-the-fly
@bp.get("/data/processed/<path:filename>")
def serve_processed(filename):
    pdir = _processed_dir()
    filepath = os.path.join(pdir, filename)

    # Chỉ xử lý shap PNG, còn lại serve bình thường
    if filename.lower().endswith(".png") and "shap_" in os.path.basename(filename).lower():
        if not os.path.exists(filepath):
            return jsonify({"ok": False, "message": "File not found"}), 404

        img = Image.open(filepath)
        img_nobg = _strip_white_bg(img)

        buf = io.BytesIO()
        img_nobg.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png")

    return send_from_directory(pdir, filename)