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
    try:
        v = float(pm25)
    except Exception:
        return "pill-gray"

    if v <= 12.0:
        return "pill-green"
    if v <= 35.4:
        return "pill-yellow"
    if v <= 55.4:
        return "pill-orange"
    if v <= 150.4:
        return "pill-red"
    if v <= 250.4:
        return "pill-purple"
    return "pill-plum"   # dùng plum như “nâu/nguy hại”


def _pack_values(d: dict):
    d = d or {}
    return {"1h": d.get("1h"), "3h": d.get("3h"), "6h": d.get("6h"), "12h": d.get("12h"), "24h": d.get("24h")}


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

    # =========================
    # ƯU TIÊN: recommendations_payload.json (file tổng hợp mới)
    # Nếu tồn tại → dùng luôn, không cần đọc 3 file cũ
    # =========================
    payload_path = os.path.join(pdir, "recommendations_payload.json")
    unified = _read_json(payload_path)

    if unified and unified.get("ok"):
        # File tổng hợp đã có đủ mọi thứ — trả thẳng, chỉ đảm bảo stations có id chuẩn
        stations_raw = unified.get("stations", []) or []
        stations_out = []
        for i, st in enumerate(stations_raw):
            sid = str(st.get("id", i + 1))
            if sid.isdigit():
                sid = str(sid)  # giữ nguyên số, JS sẽ thêm "S"
            values = _pack_values(st.get("values") or {})
            stations_out.append({
                "id": sid,
                "type": st.get("type", ""),
                "values": values,
                "level": {k: st.get("level", {}).get(k) or _pill_class(values.get(k))
                          for k in ["1h", "3h", "6h", "12h", "24h"]},
            })

        recs = unified.get("recommendations", {}) or {}

        # Đảm bảo confidence giảm dần theo horizon (1h > 3h > 6h > 12h > 24h)
        # Nếu notebook export sai chiều → clamp lại ở đây
        raw_conf = unified.get("confidence", {}) or {}
        CONF_FALLBACK = {"1h": 88, "3h": 80, "6h": 72, "12h": 63, "24h": 55}
        HORIZONS_ORDER = ["1h", "3h", "6h", "12h", "24h"]

        conf_values = {}
        for k in HORIZONS_ORDER:
            v = raw_conf.get(k)
            try:
                conf_values[k] = float(v) if v is not None else CONF_FALLBACK[k]
            except Exception:
                conf_values[k] = CONF_FALLBACK[k]

        # Clamp: mỗi horizon không được cao hơn horizon trước đó
        prev = None
        for k in HORIZONS_ORDER:
            if prev is not None and conf_values[k] > prev:
                conf_values[k] = round(prev - 2.0, 1)  # ép giảm ít nhất 2%
            prev = conf_values[k]

        return jsonify({
            "ok": True,
            "generated_at": unified.get("generated_at"),
            "city": "TP.HCM",
            "summary": unified.get("summary", {}),
            "summary_level": unified.get("summary_level", {}),
            "stations": stations_out,
            "confidence": conf_values,
            "top_reasons": unified.get("top_reasons", []),
            "recommendations": {
                "public":     recs.get("public", []),
                "sensitive":  recs.get("sensitive", []) or recs.get("sensitive_group", []),
                "government": recs.get("government", []),
            },
            "processed_dir_used": pdir,
        })

    # =========================
    # FALLBACK: đọc 3 file cũ nếu chưa có file tổng hợp
    # =========================
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

    # Parse forecast payload
    tp = forecast.get("tp_hcm", {}) or {}
    summary = tp.get("summary", {}) or {}
    stations = tp.get("stations", []) or []

    summary_values = _pack_values(summary)
    summary_level = {k: _pill_class(summary_values.get(k)) for k in ["1h", "3h", "6h", "12h", "24h"]}

    station_labels = [
        "Giao thông", "Dân cư", "Công nghiệp",
        "Nông nghiệp", "Thương mại", "Hỗn hợp",
    ]

    stations_out = []
    for i in range(6):
        if i < len(stations):
            st = stations[i]
            values = _pack_values(st.get("forecast") or {})
        else:
            values = {"1h": None, "3h": None, "6h": None, "12h": None, "24h": None}
            st = {"station_id": f"{i + 1}.0"}

        stations_out.append({
            "id": str(i + 1),
            "station_id": st.get("station_id"),
            "type": station_labels[i],
            "values": values,
            "level": {k: _pill_class(values.get(k)) for k in ["1h", "3h", "6h", "12h", "24h"]},
        })

    tp_conf = (conf.get("tp_hcm", {}) or {}).get("confidence", {}) or {}

    tp_narr = narr.get("tp_hcm", {}) or {}
    top_reasons = tp_narr.get("top_reasons", []) or []
    recs = tp_narr.get("recommendations", {}) or {}

    return jsonify({
        "ok": True,
        "generated_at": forecast.get("generated_at"),
        "city": "TP.HCM",
        "summary": summary_values,
        "summary_level": summary_level,
        "stations": stations_out,
        "confidence": {
            "1h": tp_conf.get("1h"),
            "3h": tp_conf.get("3h"),
            "6h": tp_conf.get("6h"),
            "12h": tp_conf.get("12h"),
            "24h": tp_conf.get("24h"),
        },
        "top_reasons": top_reasons,
        "recommendations": {
            "public":     recs.get("public", []),
            "sensitive":  recs.get("sensitive", []) or recs.get("sensitive_group", []),
            "government": recs.get("government", []),
        },
        "processed_dir_used": pdir,
    })