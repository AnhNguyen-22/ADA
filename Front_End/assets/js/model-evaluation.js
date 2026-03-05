(function () {
  "use strict";

  const API_FALLBACK = "http://127.0.0.1:5000/api/model-evaluation";

// Nếu đang chạy UI từ Flask (port 5000) -> dùng relative path
// Nếu đang mở bằng Live Server (5500, ...) -> gọi thẳng backend 5000
const API_PATH =
  (location.port === "5000" || location.origin.includes(":5000"))
    ? "/api/model-evaluation"
    : API_FALLBACK;

async function fetchModelEvaluation() {
  const res = await fetch(API_PATH, { cache: "no-store" });
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.message ? ` - ${errBody.message}` : "";
    } catch (_) {}
    throw new Error(`HTTP ${res.status} at ${API_PATH}${detail}`);
  }
  return await res.json();
}

  let _data = null;
  let _stationById = {};
  let _activeStationId = null;   // "global" | "1".."6"
  let _activeHorizon = "1";      // "1" | "3" | "6" | "12" | "24"
  let _chart = null;

  let _stationDropdown = null;
  let _horizonDropdown = null;

  function q(sel) { return document.querySelector(sel); }

  function fmt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3).replace(/\.000$/, "") : "--";
  }
  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  // ----------------------------
  // Normalize input API schemas
  // ----------------------------
  // Expected internal format:
  // data = {
  //   ok: true,
  //   horizons: [1,3,6,12,24],
  //   stations: [
  //     { id, name, horizons:[{horizon, rows:[{model,rmse,mae,mape,is_best}...], best_model}], best_model_overall }
  //   ]
  // }
  function normalizeApi(raw) {
    // If server wraps: {ok:true, data:{...}} or {payload:{...}}
    const root = raw?.data || raw?.payload || raw;

    const horizons = (root?.horizons || [1, 3, 6, 12, 24]).map(Number);

    // If already in station list format:
    if (Array.isArray(root?.stations) && root.stations.length && root.stations[0]?.horizons) {
      return {
        ok: raw?.ok ?? true,
        message: raw?.message,
        horizons,
        stations: root.stations,
        default_station_id: root.default_station_id || root.default_station || "global",
        default_horizon: String(root.default_horizon || "1"),
        location: root.location,
        who_guideline: root.who_guideline,
      };
    }

    // If coming from model_evaluation_payload.json style:
    // payload: {stations:[...], station_labels:{}, results:{station:{h:[{model,rmse,mae,mape,is_best}]}} , global:{by_horizon:{h:[...]}} }
    const payload = root;

    const stationsRaw = (payload?.stations || []).map(String);
    const stationLabels = payload?.station_labels || {};

    const stations = [];

    // Build per-station blocks
    for (const st of stationsRaw) {
      const name = stationLabels[st] ? `Trạm ${stationLabels[st].replace(/^S/, "")}` : `Trạm ${st}`;
      const stResults = payload?.results?.[st] || {};

      const hBlocks = horizons.map((h) => {
        const rows = (stResults[String(h)] || []).map((r) => ({
          model: r.model,
          rmse: r.rmse,
          mae: r.mae,
          mape: r.mape,
          is_best: Number(r.is_best) || 0,
        }));

        const bestRow = rows.find(x => Number(x.is_best) === 1);
        return {
          horizon: h,
          rows,
          best_model: bestRow ? bestRow.model : null,
        };
      });

      // best overall from payload.best_model if exists
      let bestOverall = null;
      const bm = payload?.best_model?.[st];
      if (bm) {
        // try pick horizon 1 or first horizon
        bestOverall = bm[String(horizons[0])] || null;
      }

      stations.push({
        id: String(st),
        name,
        horizons: hBlocks,
        best_model_overall: bestOverall,
        used_rows: null,
        dropped_rows: null,
      });
    }

    // Build GLOBAL station "global" from payload.global.by_horizon if exists
    if (payload?.global?.by_horizon) {
      const gBlocks = horizons.map((h) => {
        const rows = (payload.global.by_horizon[String(h)] || []).map((r) => ({
          model: r.model,
          rmse: r.rmse,
          mae: r.mae,
          mape: r.mape,
          is_best: Number(r.is_best) || 0,
        }));
        const bestRow = rows.find(x => Number(x.is_best) === 1);
        return {
          horizon: h,
          rows,
          best_model: bestRow ? bestRow.model : (payload?.global?.best_by_horizon?.[String(h)] || null),
        };
      });

      stations.unshift({
        id: "global",
        name: "TP.HCM",
        horizons: gBlocks,
        best_model_overall: payload?.global?.best_overall || null,
        used_rows: null,
        dropped_rows: null,
      });
    } else {
      // If no global provided, still add TP.HCM (will show empty)
      stations.unshift({
        id: "global",
        name: "TP.HCM",
        horizons: horizons.map(h => ({ horizon: h, rows: [], best_model: null })),
        best_model_overall: null,
        used_rows: null,
        dropped_rows: null,
      });
    }

    return {
      ok: raw?.ok ?? true,
      message: raw?.message,
      horizons,
      stations,
      default_station_id: payload?.default_station || "global",
      default_horizon: String(payload?.default_horizon || "1"),
      location: payload?.location,
      who_guideline: payload?.who_guideline,
    };
  }

  // ----------------------------
  // Data getters
  // ----------------------------
  function getStation(stationId) {
    return _stationById[String(stationId)] || null;
  }

  function getHorizonBlock(station, horizon) {
    if (!station) return null;
    return (station.horizons || []).find(h => String(h.horizon) === String(horizon)) || null;
  }

  function getRows(station, horizon) {
    const hb = getHorizonBlock(station, horizon);
    return (hb && Array.isArray(hb.rows)) ? hb.rows.slice() : [];
  }

  function getBestModel(station, horizon) {
    if (!station) return null;

    const hb = getHorizonBlock(station, horizon);
    if (!hb) return station.best_model_overall || null;

    // 1) ưu tiên best_model do server/json set (đã tie-break)
    if (hb.best_model) return hb.best_model;

    // 2) fallback: row có is_best=1
    const rows = getRows(station, horizon);
    const bestRow = rows.find(r => Number(r.is_best) === 1);
    if (bestRow) return bestRow.model;

    // 3) fallback: min RMSE
    rows.sort((a, b) => (asNum(a.rmse) ?? 999) - (asNum(b.rmse) ?? 999));
    return rows[0]?.model || null;
  }

  // ----------------------------
  // Render table
  // ----------------------------
  function renderTable(station) {
    const tbody = q(".comparison-table tbody");
    if (!tbody || !station) return;

    const rows = getRows(station, _activeHorizon);
    const best = getBestModel(station, _activeHorizon);

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4">Không có dữ liệu tại trạm / mốc này.</td></tr>';
      return;
    }

    // sort by RMSE asc (null last)
    rows.sort((a, b) => (asNum(a.rmse) ?? 999) - (asNum(b.rmse) ?? 999));

    tbody.innerHTML = rows.map((r) => {
      const isBest = best && r.model === best;
      return `
        <tr${isBest ? ' class="row-best"' : ""}>
          <td>${r.model || "--"}${isBest ? ' <span class="badge-best">Tốt nhất</span>' : ""}</td>
          <td>${fmt(r.rmse)}</td>
          <td>${fmt(r.mae)}</td>
          <td>${fmt(r.mape)}</td>
        </tr>
      `;
    }).join("");
  }

  // ----------------------------
  // Render best model box
  // ----------------------------
  function renderBestModel(station) {
    const bestName = q(".best-model-name");
    const bestDesc = q(".best-model-description");
    if (!bestName || !bestDesc || !station) return;

    const best = getBestModel(station, _activeHorizon) || "--";
    bestName.textContent = String(best).toUpperCase();

    const used = station.used_rows != null ? Number(station.used_rows) : null;
    const dropped = station.dropped_rows != null ? Number(station.dropped_rows) : null;

    let extra = "";
    if (used != null && dropped != null) {
      extra = ` Dùng ${used} bản ghi hợp lệ, loại ${dropped} bản ghi rỗng hoặc bằng 0.`;
    }

    bestDesc.textContent =
      `Mô hình ${best} được chọn tại ${station.name} ở mốc ${_activeHorizon}h ` +
      `(ưu tiên RMSE, sau đó MAE và MAPE; tie-break do server/json quyết định).` +
      extra;
  }

  // ----------------------------
  // Render chart
  // ----------------------------
  function renderChart(station) {
    const canvas = document.getElementById("comparison-chart");
    if (!canvas || typeof Chart === "undefined" || !station) return;

    const rows = getRows(station, _activeHorizon);
    if (!rows.length) {
      if (_chart) _chart.destroy();
      return;
    }

    rows.sort((a, b) => (asNum(a.rmse) ?? 999) - (asNum(b.rmse) ?? 999));

    const labels = rows.map(r => r.model || "--");
    const rmseVals = rows.map(r => (Number.isFinite(Number(r.rmse)) ? Number(r.rmse) : null));
    const maeVals  = rows.map(r => (Number.isFinite(Number(r.mae))  ? Number(r.mae)  : null));

    if (_chart) _chart.destroy();

    _chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "RMSE",
            data: rmseVals,
            backgroundColor: "#1565C0",
            borderColor: "#0D47A1",
            borderWidth: 2,
            borderRadius: 8,
          },
          {
            label: "MAE",
            data: maeVals,
            backgroundColor: "#64B5F6",
            borderColor: "#42A5F5",
            borderWidth: 2,
            borderRadius: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top" },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(3) : "--"}`,
            },
          },
        },
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // ----------------------------
  // Render difference text
  // ----------------------------
  function renderDiffText(station) {
    const el = q(".area-difference-text");
    if (!el || !station) return;

    const best = getBestModel(station, _activeHorizon);
    const rows = getRows(station, _activeHorizon);
    const stRow = rows.find(r => r.model === best);

    if (!stRow || asNum(stRow.rmse) == null) {
      el.textContent = "Chưa đủ dữ liệu để nhận xét sự khác biệt khu vực.";
      return;
    }

    // global mean RMSE of BEST model per station at this horizon (including baselines if they win)
    const allStations = Object.values(_stationById || {}).filter(s => s && s.id !== "global");
    const rmseList = allStations.map(st => {
      const b = getBestModel(st, _activeHorizon);
      const rr = getRows(st, _activeHorizon).find(x => x.model === b);
      return rr ? asNum(rr.rmse) : null;
    }).filter(v => v != null);

    if (!rmseList.length) {
      el.textContent = "Chưa đủ dữ liệu để nhận xét sự khác biệt khu vực.";
      return;
    }

    const globalMean = rmseList.reduce((s, v) => s + v, 0) / rmseList.length;
    const stationRmse = asNum(stRow.rmse);
    const diff = Math.abs(stationRmse - globalMean);
    const trend = stationRmse > globalMean ? "khó dự báo hơn mức trung bình" : "ổn định hơn mức trung bình";

    el.textContent =
      `${station.name}: mô hình tốt nhất là ${best || "--"} (RMSE=${fmt(stationRmse)}), ` +
      `${trend} khoảng ${fmt(diff)} RMSE so với mức trung bình các trạm (${fmt(globalMean)}).`;
  }

  // ----------------------------
  // Render reason text
  // ----------------------------
  function renderReasonText(station) {
    const el = q(".reason-text");
    if (!el || !station) return;

    const rows = getRows(station, _activeHorizon).slice()
      .sort((a, b) => (asNum(a.rmse) ?? 999) - (asNum(b.rmse) ?? 999));

    const best = getBestModel(station, _activeHorizon) || "--";
    const rankText = rows.length
      ? rows.map((x) => `${x.model}: RMSE ${fmt(x.rmse)}, MAE ${fmt(x.mae)}, MAPE ${fmt(x.mape)}`).join(" | ")
      : "Không có xếp hạng";

    el.textContent =
      `Lý do chọn mô hình tại ${station.name} (mốc ${_activeHorizon}h): ` +
      `ưu tiên sai số nhỏ (RMSE), sau đó MAE và MAPE; tie-break do server/json quyết định. ` +
      `Mô hình chọn: ${best}. Xếp hạng: ${rankText}.`;
  }

  // ----------------------------
  // Render station + horizon
  // ----------------------------
  function renderStation(stationId) {
    _activeStationId = String(stationId);
    const station = getStation(_activeStationId);
    if (!station) return;

    renderTable(station);
    renderBestModel(station);
    renderChart(station);
    renderDiffText(station);
    renderReasonText(station);
  }

  // ----------------------------
  // Dropdown init
  // ----------------------------
  function initStationDropdown() {
    // Build options: TP.HCM + Trạm 1..6
    const stations = _data?.stations || [];

    // Ensure global exists
    const hasGlobal = stations.some(s => String(s.id) === "global");
    const stationItems = [];

    if (hasGlobal) {
      stationItems.push({ value: "global", text: "TP.HCM" });
    } else {
      // still show TP.HCM (may be empty)
      stationItems.push({ value: "global", text: "TP.HCM" });
    }

    // add numeric stations
    stations
      .filter(s => String(s.id) !== "global")
      .sort((a, b) => Number(a.id) - Number(b.id))
      .forEach(s => {
        const label = s.name ? s.name : `Trạm ${s.id}`;
        // nếu name là "Trạm 1" thì OK; nếu là "S1 - ..." cũng OK
        stationItems.push({ value: String(s.id), text: label });
      });

    _stationDropdown = new Dropdown("station-dropdown", {
      items: stationItems,
      defaultItem: _activeStationId,
      onSelect: function (value) {
        renderStation(value);
      },
    });
  }

  function initHorizonDropdown() {
    const horizons = (_data?.horizons || [1,3,6,12,24]).map(String);

    const items = horizons.map(h => ({ value: h, text: `${h}h` }));

    // default horizon: prefer 1
    _activeHorizon = items.find(x => x.value === "1") ? "1" : (items[0]?.value ?? "1");

    _horizonDropdown = new Dropdown("horizon-dropdown", {
      items,
      defaultItem: _activeHorizon,
      onSelect: function (value) {
        _activeHorizon = String(value);
        renderStation(_activeStationId);
      },
    });
  }

  function bindCreateButton() {
    const btnCreate = q(".btn-create");
    if (!btnCreate) return;
    btnCreate.addEventListener("click", function () {
      renderStation(_activeStationId);
    });
  }

  // ----------------------------
  // Fetch API
  // ----------------------------
  async function fetchModelEvaluation() {
    const urls = [API_PATH, API_FALLBACK];
    let lastErr = null;

    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          let detail = "";
          try {
            const errBody = await res.json();
            detail = errBody && errBody.message ? ` - ${errBody.message}` : "";
          } catch (_) {}
          lastErr = new Error(`HTTP ${res.status} at ${url}${detail}`);
          continue;
        }
        return await res.json();
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("Cannot fetch model evaluation data");
  }

  // ----------------------------
  // Main load
  // ----------------------------
  async function load() {
    const raw = await fetchModelEvaluation();
    if (raw && raw.ok === false) throw new Error(raw.message || "API error");

    _data = normalizeApi(raw);

    _stationById = {};
    (_data.stations || []).forEach(s => { _stationById[String(s.id)] = s; });

    // ensure global is present in map
    if (!_stationById["global"]) {
      _stationById["global"] = {
        id: "global",
        name: "TP.HCM",
        horizons: (_data.horizons || [1,3,6,12,24]).map(h => ({ horizon: h, rows: [], best_model: null })),
        best_model_overall: null,
        used_rows: null,
        dropped_rows: null,
      };
    }

    _activeStationId = String(_data.default_station_id || "global");
    if (!_stationById[_activeStationId]) _activeStationId = "global";

    // Update chart description
    const chartDesc = q(".chart-description");
    if (chartDesc) {
      chartDesc.textContent = "Biểu đồ RMSE/MAE của các mô hình theo trạm và mốc thời gian.";
    }

    initStationDropdown();
    initHorizonDropdown();
    bindCreateButton();

    renderStation(_activeStationId);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    try {
      await load();
    } catch (err) {
      console.error("[model-evaluation]", err);
      const body = q(".comparison-table tbody");
      if (body) {
        body.innerHTML = `<tr><td colspan="4">Không thể tải dữ liệu đánh giá mô hình: ${err.message}</td></tr>`;
      }
    }
  });

})();