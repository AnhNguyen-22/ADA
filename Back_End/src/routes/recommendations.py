import os
import json
from flask import Blueprint, jsonify

bp = Blueprint("recommendations", __name__)


# =========================
# Helpers
# =========================
def _read_json(path: str):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _project_root():
    """
    File hiện tại: Back_End/src/routes/recommendations.py
    Muốn ra project root (ADA/ADA) => Đi lên 3 cấp:
      routes -> src -> Back_End -> (project root)
    """
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def _processed_dir():
    # project_root/data/processed
    return os.path.join(_project_root(), "data", "processed")


def _pill_class(pm25):
    if pm25 is None:
        return "pill-gray"
    try:
        v = float(pm25)
    except:
        return "pill-gray"

    if v <= 15:
        return "pill-green"
    if v <= 35:
        return "pill-yellow"
    if v <= 55:
        return "pill-orange"
    return "pill-red"


def _pack_values(d: dict):
    d = d or {}
    return {"3h": d.get("3h"), "6h": d.get("6h"), "12h": d.get("12h"), "24h": d.get("24h")}


# =========================
# Routes
# =========================
@bp.get("/api/recommendations/ping")
def ping():
    return jsonify({"ok": True, "message": "recommendations route is mounted"})


@bp.get("/api/recommendations")
def get_recommendations():
    """
    Reads (project_root/data/processed):
      tp_hcm_forecast_payload.json
      tp_hcm_confidence.json
      tp_hcm_narrative.json
    Returns merged payload for UI.

    VERSION 2: HIỂN THỊ ĐỦ 6 TRẠM (kể cả trạm null hiện "--")
    """
    pdir = _processed_dir()
    print(f"[DEBUG] Looking for files in: {pdir}")
    print(f"[DEBUG] Project root: {_project_root()}")

    forecast_path = os.path.join(pdir, "tp_hcm_forecast_payload.json")
    conf_path = os.path.join(pdir, "tp_hcm_confidence.json")
    narr_path = os.path.join(pdir, "tp_hcm_narrative.json")

    forecast = _read_json(forecast_path)
    conf = _read_json(conf_path)
    narr = _read_json(narr_path)

    missing = []
    if forecast is None: missing.append("tp_hcm_forecast_payload.json")
    if conf is None:     missing.append("tp_hcm_confidence.json")
    if narr is None:     missing.append("tp_hcm_narrative.json")

    if missing:
        return jsonify({
            "ok": False,
            "message": "Missing processed files",
            "processed_dir_used": pdir,
            "missing": missing
        }), 404

    # =========================
    # Parse forecast payload
    # =========================
    tp = forecast.get("tp_hcm", {}) or {}
    summary = tp.get("summary", {}) or {}
    stations = tp.get("stations", []) or []

    summary_values = _pack_values(summary)
    summary_level = {k: _pill_class(summary_values.get(k)) for k in ["3h", "6h", "12h", "24h"]}

    # ✅ Labels cố định cho 6 trạm
    station_labels = [
        "Giao thông",
        "Dân cư",
        "Công nghiệp",
        "Nông nghiệp",
        "Thương mại",
        "Hỗn hợp",
    ]

    # ✅ LUÔN HIỂN THỊ ĐỦ 6 TRẠM (dù data null)
    stations_out = []
    for i in range(6):
        # Nếu có trạm thứ i trong data
        if i < len(stations):
            st = stations[i]
            values = _pack_values(st.get("forecast") or {})
        else:
            # Không có data → tạo trạm rỗng
            values = {"3h": None, "6h": None, "12h": None, "24h": None}
            st = {"station_id": f"{i + 1}.0"}

        sid = f"S{i + 1}"
        sname = station_labels[i]

        stations_out.append({
            "id": sid,  # "S1", "S2", ..., "S6"
            "station_id": st.get("station_id"),
            "type": sname,  # "Giao thông", "Dân cư", ...
            "values": values,
            "level": {k: _pill_class(values.get(k)) for k in ["3h", "6h", "12h", "24h"]},
        })

    # =========================
    # Parse confidence
    # =========================
    tp_conf = (conf.get("tp_hcm", {}) or {}).get("confidence", {}) or {}

    # =========================
    # Parse narrative
    # =========================
    tp_narr = narr.get("tp_hcm", {}) or {}
    top_reasons = tp_narr.get("top_reasons", []) or []
    recs = tp_narr.get("recommendations", {}) or {}

    return jsonify({
        "ok": True,
        "generated_at": forecast.get("generated_at"),
        "city": "TP.HCM",

        "summary": summary_values,
        "summary_level": summary_level,

        # ✅ Luôn có đủ 6 trạm (trạm null hiện "--")
        "stations": stations_out,

        "confidence": {
            "3h": tp_conf.get("3h"),
            "6h": tp_conf.get("6h"),
            "12h": tp_conf.get("12h"),
            "24h": tp_conf.get("24h"),
        },

        "top_reasons": top_reasons,

        "recommendations": {
            "public": recs.get("public", []),
            "sensitive": recs.get("sensitive", []) or recs.get("sensitive_group", []),
            "government": recs.get("government", []),
        },

        # debug
        "processed_dir_used": pdir
    })