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


def _project_root():
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def _candidate_processed_dirs():
    """
    Try multiple candidate directories so route still works if project is launched
    from different root layouts (e.g. ADA/ADA or ADA).
    """
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


def _best_model(rows):
    rows_ok = [r for r in rows if r.get("rankable") is True]
    if not rows_ok:
        return None
    return sorted(rows_ok, key=lambda r: (r["rmse"], r.get("mae") or 999999, r.get("mape") or 999999))[0]


def _is_positive_number(v):
    return v is not None and isinstance(v, (int, float)) and v > 0


def _is_rankable_row(row):
    return (
        _is_positive_number(row.get("rmse")) and
        _is_positive_number(row.get("mae")) and
        _is_positive_number(row.get("mape"))
    )


def _init_model_stats():
    return {
        "rmse_sum": 0.0,
        "mae_sum": 0.0,
        "mape_sum": 0.0,
        "count": 0,
    }


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


def _stats_to_sorted_rows(stats_map):
    out = []
    for model, box in stats_map.items():
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
    model_stats = {}
    total_rows = 0
    valid_rows = 0

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
            }
            row["rankable"] = _is_rankable_row(row)
            if row["rankable"]:
                valid_rows += 1
            rows.append(row)
            _append_model_stats(model_stats, row.get("model"), row)

        best = _best_model(rows)
        horizon_rows.append({
            "horizon": str(h),
            "horizon_label": HORIZON_LABELS.get(str(h), f"{h}h"),
            "rows": rows,
            "best_model": best["model"] if best else None,
        })

    model_avg_rmse = _stats_to_sorted_rows(model_stats)

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
                _append_model_stats(model_stats, row.get("model"), row)

    model_rows = _stats_to_sorted_rows(model_stats)
    best_model = model_rows[0]["model"] if model_rows else None

    return {
        "models": model_rows,
        "best_model": best_model,
        "used_rows": valid_rows,
        "dropped_rows": max(total_rows - valid_rows, 0),
    }


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

    raw_results = payload.get("results", {}) or {}
    normalized_results = {_normalize_station_id(k): v for k, v in raw_results.items()}
    stations_out = []
    station_options = []
    first_station_id = None

    payload_station_ids = [_normalize_station_id(x) for x in (payload.get("stations", []) or [])]
    canonical_ids = sorted(STATION_NAMES.keys(), key=lambda x: int(x))
    extra_ids = sorted(
        [x for x in payload_station_ids if x not in STATION_NAMES],
        key=lambda x: int(x) if str(x).isdigit() else 9999
    )
    all_station_ids = canonical_ids + extra_ids

    for sid in all_station_ids:
        if first_station_id is None and sid in normalized_results:
            first_station_id = sid

        station_data = normalized_results.get(sid, {})
        horizon_rows, model_avg_rmse, best_overall, total_rows, valid_rows = _summarize_station(station_data)

        station_name = STATION_NAMES.get(sid, f"S{sid}")
        station_options.append({
            "id": sid,
            "label": station_name,
        })
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
    if first_station_id is None and stations_out:
        first_station_id = stations_out[0]["id"]

    return jsonify({
        "ok": True,
        "processed_dir_used": pdir,
        "payload_path": payload_path,
        "default_station_id": first_station_id,
        "stations": stations_out,
        "station_options": station_options,
        "city_summary": city_summary,
        "horizons": [str(h) for h in (payload.get("horizons") or [])],
    })