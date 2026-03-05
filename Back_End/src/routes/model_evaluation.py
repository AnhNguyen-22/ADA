import math
import os
import json
from flask import Blueprint, jsonify

bp = Blueprint("model_evaluation", __name__)

STATION_NAMES = {
    "1": "S1 - Giao thông",
    "2": "S2 - Khu dân cư",
    "3": "S3 - Giao thông",
    "4": "S4 - Khu công nghiệp",
    "5": "S5 - Giao thông",
    "6": "S6 - Khu dân cư",
}

HORIZON_LABELS = {
    "1": "1h",
    "3": "3h",
    "6": "6h",
    "12": "12h",
    "24": "24h",
}

# Các model baseline — không tính vào best ML model (nhưng vẫn HIỂN THỊ trong bảng)
BASELINE_MODELS = {"naive", "holt-winters", "holt winters"}


def _project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def _candidate_processed_dirs():
    project_root = _project_root()
    parent_root = os.path.abspath(os.path.join(project_root, ".."))
    return [
        os.path.join(project_root, "data", "processed"),
        os.path.join(project_root, "ADA", "data", "processed"),
        os.path.join(parent_root, "data", "processed"),
        os.path.join(parent_root, "ADA", "data", "processed"),
    ]


def _read_json(path: str):
    if not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _clean_number(v):
    if v is None:
        return None
    try:
        n = float(v)
    except Exception:
        return None
    if math.isnan(n) or math.isinf(n):
        return None
    return round(n, 3)


def _normalize_station_id(raw):
    s = str(raw)
    if s.endswith(".0"):
        s = s[:-2]
    return s


def _is_baseline(model_name):
    if not model_name:
        return False
    return model_name.strip().lower() in BASELINE_MODELS


def _is_positive_number(v):
    return v is not None and isinstance(v, (int, float)) and v > 0


def _is_rankable_row(row):
    return (
        _is_positive_number(row.get("rmse")) and
        _is_positive_number(row.get("mae")) and
        _is_positive_number(row.get("mape"))
    )


def _best_model_from_rows(rows):
    """
    Chọn best ML model: LUÔN loại baseline (Naive, Holt-Winters) trước.
    is_best trong JSON có thể trỏ vào Naive — không dùng trực tiếp.
    Tính lại theo RMSE thấp nhất trong ML models hợp lệ.
    """
    ml_rows = [r for r in rows if (not _is_baseline(r.get("model"))) and r.get("rankable")]
    if not ml_rows:
        return None

    best_by_flag = [r for r in ml_rows if r.get("is_best") == 1]
    if best_by_flag:
        return best_by_flag[0].get("model")

    ml_rows.sort(key=lambda r: (r["rmse"], r.get("mae") or 999999, r.get("mape") or 999999))
    return ml_rows[0].get("model")


def _init_model_stats():
    return {"rmse_sum": 0.0, "mae_sum": 0.0, "mape_sum": 0.0, "count": 0}


def _append_model_stats(stats_map, model, row):
    if not model:
        return
    if not _is_rankable_row(row):
        return
    box = stats_map.setdefault(model, _init_model_stats())
    box["rmse_sum"] += row["rmse"]
    box["mae_sum"] += row["mae"]
    box["mape_sum"] += row["mape"]
    box["count"] += 1


def _stats_to_sorted_rows(stats_map, exclude_baselines=True):
    out = []
    for model, box in stats_map.items():
        if exclude_baselines and _is_baseline(model):
            continue
        c = box.get("count", 0)
        if c <= 0:
            continue
        out.append({
            "model": model,
            "avg_rmse": round(box["rmse_sum"] / c, 3),
            "avg_mae": round(box["mae_sum"] / c, 3),
            "avg_mape": round(box["mape_sum"] / c, 3),
            "sample_count": c,
        })
    out.sort(key=lambda x: (x["avg_rmse"], x["avg_mae"], x["avg_mape"]))
    return out


def _summarize_station(results_by_h):
    horizon_rows = []
    model_stats = {}  # avg across horizons — chỉ ML models
    total_rows = 0
    valid_rows = 0

    if not isinstance(results_by_h, dict):
        results_by_h = {}

    for h, metrics in results_by_h.items():
        if not isinstance(metrics, list):
            continue

        rows = []
        for item in metrics:
            total_rows += 1
            row = {
                "model": item.get("model"),
                "mae": _clean_number(item.get("mae")),
                "rmse": _clean_number(item.get("rmse")),
                "mape": _clean_number(item.get("mape")),
                "is_best": item.get("is_best", 0),
            }
            row["rankable"] = _is_rankable_row(row)
            if row["rankable"]:
                valid_rows += 1

            rows.append(row)

            # chỉ accumulate stats cho ML (loại baseline)
            if not _is_baseline(row.get("model")):
                _append_model_stats(model_stats, row.get("model"), row)

        best = _best_model_from_rows(rows)
        horizon_rows.append({
            "horizon": str(h),
            "horizon_label": HORIZON_LABELS.get(str(h), f"{h}h"),
            "rows": rows,                  # ✅ rows vẫn chứa naive/hw để UI hiển thị
            "best_model": best,            # ✅ best_model loại baseline
        })

    model_avg_rmse = _stats_to_sorted_rows(model_stats, exclude_baselines=True)
    best_overall = model_avg_rmse[0]["model"] if model_avg_rmse else None
    return horizon_rows, model_avg_rmse, best_overall, total_rows, valid_rows


def _build_city_summary(stations_out):
    model_stats = {}
    total_rows = 0
    valid_rows = 0

    for st in stations_out:
        for hz in st.get("horizons", []):
            for row in hz.get("rows", []):
                total_rows += 1
                if row.get("rankable"):
                    valid_rows += 1
                if not _is_baseline(row.get("model")):
                    _append_model_stats(model_stats, row.get("model"), row)

    model_rows = _stats_to_sorted_rows(model_stats, exclude_baselines=True)
    best_model = model_rows[0]["model"] if model_rows else None

    return {
        "models": model_rows,
        "best_model": best_model,
        "used_rows": valid_rows,
        "dropped_rows": max(total_rows - valid_rows, 0),
    }


def _extract_results_and_stations(payload: dict):
    """
    Hỗ trợ 2 schema:
    - Schema A (cũ): payload["results"], payload["stations"]
    - Schema B (file của bạn): payload["per_station"]["results"], payload["per_station"]["stations"]
    """
    if not isinstance(payload, dict):
        return {}, [], {}

    # results
    raw_results = payload.get("results")
    if isinstance(raw_results, dict):
        results = raw_results
        stations = payload.get("stations") or []
    else:
        ps = payload.get("per_station") or {}
        results = ps.get("results") if isinstance(ps, dict) else None
        if not isinstance(results, dict):
            results = {}
        stations = (ps.get("stations") if isinstance(ps, dict) else None) or payload.get("stations") or []

    # station_labels (nếu có)
    station_labels = payload.get("station_labels") or {}
    if not station_labels and isinstance(payload.get("per_station"), dict):
        station_labels = payload["per_station"].get("station_labels") or {}

    # normalize
    results = {_normalize_station_id(k): v for k, v in (results or {}).items()}
    stations = [_normalize_station_id(x) for x in (stations or [])]

    # nếu stations rỗng -> lấy theo keys results
    if not stations:
        stations = sorted(results.keys(), key=lambda x: int(x) if str(x).isdigit() else 9999)

    return results, stations, station_labels


@bp.get("/api/model-evaluation/ping")
def ping():
    return jsonify({"ok": True, "message": "model_evaluation route is mounted"})


@bp.get("/api/model-evaluation")
def get_model_evaluation():
    payload = None
    payload_path = None
    pdir = None
    candidates = _candidate_processed_dirs()

    for d in candidates:
        test_path = os.path.join(d, "model_evaluation_payload.json")
        obj = _read_json(test_path)
        if obj is not None:
            payload = obj
            payload_path = test_path
            pdir = d
            break

    if payload is None:
        return jsonify({
            "ok": False,
            "message": "Missing processed file",
            "processed_dir_used": pdir,
            "processed_dir_candidates": candidates,
            "missing": ["model_evaluation_payload.json"],
        }), 404

    normalized_results, payload_station_ids, station_labels = _extract_results_and_stations(payload)

    # horizons
    horizons = payload.get("horizons") or [1, 3, 6, 12, 24]
    horizons = [str(h) for h in horizons]

    stations_out = []
    station_options = []

    # ✅ GLOBAL (TP.HCM) nếu có payload.global.by_horizon
    global_by_h = None
    if isinstance(payload.get("global"), dict):
        global_by_h = payload["global"].get("by_horizon")
    if isinstance(global_by_h, dict):
        g_horizon_rows, g_model_avg, g_best_overall, g_total, g_valid = _summarize_station(global_by_h)
        stations_out.append({
            "id": "global",
            "name": "TP.HCM",
            "horizons": g_horizon_rows,
            "model_avg_rmse": g_model_avg,
            "best_model_overall": g_best_overall,
            "used_rows": g_valid,
            "dropped_rows": max(g_total - g_valid, 0),
        })
        station_options.append({"id": "global", "label": "TP.HCM"})

    # stations list (chỉ lấy những station có thật trong results)
    all_station_ids = [sid for sid in payload_station_ids if sid in normalized_results]
    all_station_ids = sorted(all_station_ids, key=lambda x: int(x) if str(x).isdigit() else 9999)

    for sid in all_station_ids:
        station_data = normalized_results.get(sid, {})
        horizon_rows, model_avg_rmse, best_overall, total_rows, valid_rows = _summarize_station(station_data)

        # name priority: station_labels -> STATION_NAMES -> fallback
        station_name = None
        if isinstance(station_labels, dict) and sid in station_labels:
            station_name = str(station_labels[sid])
        if not station_name:
            station_name = STATION_NAMES.get(sid, f"S{sid}")

        station_options.append({"id": sid, "label": station_name})
        stations_out.append({
            "id": sid,
            "name": station_name,
            "horizons": horizon_rows,
            "model_avg_rmse": model_avg_rmse,
            "best_model_overall": best_overall,
            "used_rows": valid_rows,
            "dropped_rows": max(total_rows - valid_rows, 0),
        })

    city_summary = _build_city_summary(stations_out)

    # default station: ưu tiên global nếu có, không thì station đầu tiên
    default_station_id = "global" if any(s.get("id") == "global" for s in stations_out) else (stations_out[0]["id"] if stations_out else "global")

    return jsonify({
        "ok": True,
        "processed_dir_used": pdir,
        "payload_path": payload_path,
        "default_station_id": default_station_id,
        "stations": stations_out,
        "station_options": station_options,
        "city_summary": city_summary,
        "horizons": horizons,
    })