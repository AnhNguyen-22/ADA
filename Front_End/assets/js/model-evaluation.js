(function () {
  "use strict";

  const API_FALLBACK = "http://127.0.0.1:5000/api/model-evaluation";
  const API_PATH =
    (location.port === "5000" || location.origin.includes(":5000"))
      ? "/api/model-evaluation"
      : API_FALLBACK;
  const JSON_FALLBACK = "../data/processed/model_evaluation_payload.json";

// Normalize raw JSON payload → format giống API response
  function normalizeRawJson(raw) {
    const NAMES = {"1":"Thủ Đức","2":"Bình Tân","3":"Tân Phú","4":"Bình Thạnh","5":"Quận 3","6":"Quận 10"};
    const HLABELS = {"1":"1h","3":"3h","6":"6h","12":"12h","24":"24h"};
    function cn(v) { const n=parseFloat(v); return (v==null||isNaN(n)||!isFinite(n))?null:Math.round(n*1000)/1000; }
    function pos(v) { return v!=null&&v>0; }
    function rankable(r) { return pos(r.rmse)&&pos(r.mae)&&pos(r.mape); }
    function bestFrom(rows) {
      let valid=rows.filter(r=>r.rankable&&pos(r.rmse));
      const nonHW=valid.filter(r=>!r.model?.toLowerCase().startsWith("holt"));
      if(nonHW.length){const med=[...nonHW.map(r=>r.rmse)].sort((a,b)=>a-b)[Math.floor(nonHW.length/2)];valid=valid.filter(r=>r.rmse<=med*10);}
      if(!valid.length)return null;
      return valid.sort((a,b)=>a.rmse-b.rmse)[0].model;
    }
    function sumByH(byH) {
      return Object.entries(byH||{}).map(([h,metrics])=>{
        const rows=(metrics||[]).map(item=>{const r={model:item.model,rmse:cn(item.rmse),mae:cn(item.mae),mape:cn(item.mape),is_best:item.is_best||0};r.rankable=rankable(r);return r;});
        return {horizon:h,horizon_label:HLABELS[h]||h+"h",rows,best_model:bestFrom(rows)};
      });
    }
    const stations=[];
    if(raw?.global?.by_horizon){
      const hzs=sumByH(raw.global.by_horizon);
      stations.push({id:"global",name:"TP.HCM",horizons:hzs,best_model_overall:hzs.find(h=>h.horizon==="1")?.best_model||null});
    }
    const results=raw?.per_station?.results||{};
    Object.keys(results).sort((a,b)=>+a-+b).forEach(sid=>{
      const hzs=sumByH(results[sid]||{});
      stations.push({id:sid,name:NAMES[sid]||"S"+sid,horizons:hzs,best_model_overall:hzs.find(h=>h.horizon==="1")?.best_model||null});
    });
    const horizons=(raw?.horizons||[1,3,6,12,24]).map(String);
    const defId=stations.some(s=>s.id==="global")?"global":(stations[0]?.id||"global");
    return {ok:true,stations,horizons,default_station_id:defId,default_horizon:"1"};
  }

  async function fetchModelEvaluation() {
    // 1) Thử Flask API
    for (const url of [API_PATH, API_FALLBACK]) {
      try {
        const res = await fetch(url, { cache:"no-store", signal:AbortSignal.timeout(3000) });
        if (res.ok) { const d=await res.json(); if(d?.ok&&Array.isArray(d?.stations))return d; }
      } catch(_) {}
    }
    // 2) Fallback: đọc JSON trực tiếp
    try {
      const res = await fetch(JSON_FALLBACK, { cache:"no-store" });
      if (res.ok) return normalizeRawJson(await res.json());
    } catch(_) {}
    throw new Error("Không thể tải dữ liệu: Flask API không phản hồi và không tìm thấy JSON fallback.");
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
      const STATION_NAMES = {"1":"Thủ Đức","2":"Bình Tân","3":"Tân Bình","4":"Bình Thạnh","5":"Quận 3","6":"Quận 10"};
      const name = STATION_NAMES[st] || (stationLabels[st] ? stationLabels[st] : `Trạm ${st}`);
      const stResults = payload?.per_station?.results?.[st] || raw?.per_station?.results?.[st] || payload?.results?.[st] || {};

      const hBlocks = horizons.map((h) => {
        const rows = (stResults[String(h)] || [])
          .filter(r => r.rmse !== null && r.rmse !== undefined)
          .map((r) => ({
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
    // global nằm ở top-level JSON (raw.global), không phải trong per_station
    const globalData = raw?.global || payload?.global || payload?.per_station?.global || null;
    if (globalData?.by_horizon) {
      const gBlocks = horizons.map((h) => {
        const rows = (globalData.by_horizon[String(h)] || [])
          .filter(r => r.rmse !== null && r.rmse !== undefined)
          .map((r) => ({
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
          best_model: bestRow ? bestRow.model : (globalData?.best_by_horizon?.[String(h)] || null),
        };
      });

      stations.unshift({
        id: "global",
        name: "TP.HCM",
        horizons: gBlocks,
        best_model_overall: globalData?.best_overall || null,
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

    // Tính lại theo RMSE thấp nhất — không dùng server flag (có thể loại Naive)
    const rows = getRows(station, horizon).filter(r => asNum(r.rmse) != null && asNum(r.rmse) > 0);
    if (!rows.length) return station.best_model_overall || null;

    // Loại Holt-Winters nếu RMSE bất thường
    const nonHW = rows.filter(r => !r.model?.toLowerCase().startsWith("holt"));
    let candidates = rows;
    if (nonHW.length > 0) {
      const rmseVals = nonHW.map(r => asNum(r.rmse)).sort((a,b) => a-b);
      const median = rmseVals[Math.floor(rmseVals.length / 2)];
      candidates = rows.filter(r => asNum(r.rmse) <= median * 10);
    }
    candidates.sort((a, b) => (asNum(a.rmse) ?? 999) - (asNum(b.rmse) ?? 999));
    return candidates[0]?.model || null;
  }

  // ----------------------------
  // Render table
  // ----------------------------
  function renderTable(station) {
    const tbody = q(".comparison-table tbody");
    if (!tbody || !station) return;
    let rows = getRows(station, _activeHorizon);
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="4">Không có dữ liệu.</td></tr>'; return; }

    // Ẩn HW nếu rmse null/0
    rows = rows.filter(r => !(r.model?.toLowerCase().startsWith("holt") && (asNum(r.rmse)==null||asNum(r.rmse)<=0)));

    // Tính best theo RMSE
    const valid = rows.filter(r=>asNum(r.rmse)!=null&&asNum(r.rmse)>0);
    const nonHW = valid.filter(r=>!r.model?.toLowerCase().startsWith("holt"));
    let cands = valid;
    if(nonHW.length){const med=[...nonHW.map(r=>asNum(r.rmse))].sort((a,b)=>a-b)[Math.floor(nonHW.length/2)];cands=valid.filter(r=>asNum(r.rmse)<=med*10);}
    cands.sort((a,b)=>(asNum(a.rmse)??999)-(asNum(b.rmse)??999));
    const best = cands[0]?.model||null;

    rows.sort((a,b)=>{ if(a.model===best)return -1; if(b.model===best)return 1; return (asNum(a.rmse)??999)-(asNum(b.rmse)??999); });
    tbody.innerHTML = rows.map(r=>{
      const ib=best&&r.model===best, rv=asNum(r.rmse), mv=asNum(r.mae), pv=asNum(r.mape);
      return `<tr${ib?' class="row-best"':""}><td>${r.model||"--"}${ib?' <span class="badge-best">Tốt nhất</span>':""}
      </td><td>${rv!=null&&rv>0?fmt(rv):"--"}</td><td>${mv!=null&&mv>0?fmt(mv):"--"}</td><td>${pv!=null&&pv>0?fmt(pv):"--"}</td></tr>`;
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
    const MODEL_DESC = {
      "Naive":         "Dự báo bằng giá trị quan sát gần nhất. Hiệu quả khi PM2.5 ổn định, ít biến động đột ngột.",
      "Ridge":         "Hồi quy tuyến tính có regularization — cân bằng tốt giữa độ chính xác và độ ổn định trên nhiều trạm.",
      "Random Forest": "Tập hợp nhiều cây quyết định — nắm bắt tốt các mối quan hệ phi tuyến trong dữ liệu PM2.5.",
      "XGBoost":       "Gradient boosting tối ưu — hiệu quả trên dữ liệu có nhiều đặc trưng và xu hướng phức tạp.",
    };
    const rows = getRows(station, _activeHorizon).filter(r => asNum(r.rmse) != null && asNum(r.rmse) > 0);
    const bestRow = rows.find(r => r.model === best);
    const desc = MODEL_DESC[best] || `Mô hình ${best} có sai số dự báo thấp nhất tại trạm này.`;
    const rmseInfo = bestRow ? ` RMSE = ${fmt(bestRow.rmse)}, thấp nhất trong ${rows.length} mô hình ở mốc ${_activeHorizon}h.` : "";
    bestDesc.textContent = desc + rmseInfo;
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
    const section = q(".area-difference-section");
    if (!section || !station) return;
    const oldText = section.querySelector(".area-difference-text");
    if (oldText) oldText.remove();
    let container = section.querySelector(".kpi-area-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "kpi-area-container";
      section.appendChild(container);
    }

    // Xếp hạng tất cả trạm (không gồm global) theo RMSE best model
    const allSt = Object.values(_stationById||{}).filter(s => s && s.id !== "global");
    const ranked = allSt.map(st => {
      const b = getBestModel(st, _activeHorizon);
      const r = getRows(st, _activeHorizon)
        .filter(x => asNum(x.rmse) != null && asNum(x.rmse) > 0)
        .find(x => x.model === b);
      return { id: st.id, name: st.name, model: b||"--", rmse: r ? asNum(r.rmse) : null };
    }).filter(s => s.rmse != null).sort((a, b) => a.rmse - b.rmse);

    if (!ranked.length) { container.innerHTML = `<p style="color:#888;font-size:13px">Chưa đủ dữ liệu.</p>`; return; }

    const myData = ranked.find(r => r.id === station.id);
    const myRank = ranked.indexOf(myData) + 1;
    const cityAvg = ranked.reduce((s,r) => s+r.rmse, 0) / ranked.length;
    const minRmse = ranked[0].rmse;
    const maxRmse = ranked[ranked.length-1].rmse;
    const range = maxRmse - minRmse || 1;

    const isGlobal = station.id === "global";

    // Verdict cho trạm cụ thể
    let verdictHTML = "";
    if (!isGlobal && myData) {
      const diff = myData.rmse - cityAvg;
      const vc = diff > 0.5 ? "harder" : diff < -0.5 ? "easier" : "neutral";
      const vi = diff > 0.5 ? "⚠️" : diff < -0.5 ? "✅" : "➖";
      const better = myRank - 1;
      const worse  = ranked.length - myRank;
      const vt = diff > 0.5
        ? `<strong>${myData.name}</strong> khó dự báo hơn ${better} trạm, dễ hơn ${worse} trạm — PM2.5 biến động lớn.`
        : diff < -0.5
        ? `<strong>${myData.name}</strong> dễ dự báo hơn ${worse} trạm, khó hơn ${better} trạm — PM2.5 ổn định.`
        : `<strong>${myData.name}</strong> có mức độ dự báo tương đương trung bình thành phố.`;
      verdictHTML = `<div class="kpi-verdict ${vc}" style="margin-bottom:14px">
        <span class="kpi-verdict-icon">${vi}</span><span>${vt}</span>
      </div>`;
    }

    // Station ranking bars
    const stRows = ranked.map((r, i) => {
      const isCurrent = r.id === station.id;
      const barPct = Math.round((1 - (r.rmse - minRmse) / range) * 100);
      const medals = ["","",""];
      const rankLabel = medals[i] || `${i+1}`;
      return `
        <div class="st-row ${isCurrent ? "st-current" : ""}">
          <span class="st-rank">${rankLabel}</span>
          <div class="st-body">
            <div class="st-top">
              <span class="st-name">${r.name}</span>
              <span class="st-model-tag">${r.model}</span>
              <span class="st-rmse-val">${fmt(r.rmse)}</span>
            </div>
            <div class="st-bar-track">
              <div class="st-bar-fill ${isCurrent ? "st-bar-current" : ""}" style="width:${barPct}%"></div>
            </div>
          </div>
        </div>`;
    }).join("");

    // Summary pills
    const easiest = ranked[0];
    const hardest = ranked[ranked.length-1];

    container.innerHTML = `
      <div class="st-pills">
        <div class="st-pill st-pill-easy">
          <span class="st-pill-icon"></span>
          <div><span class="st-pill-label">Dễ nhất</span><span class="st-pill-val">${easiest.name}</span></div>
          <span class="st-pill-rmse">${fmt(easiest.rmse)}</span>
        </div>
        <div class="st-pill st-pill-hard">
          <span class="st-pill-icon"></span>
          <div><span class="st-pill-label">Khó nhất</span><span class="st-pill-val">${hardest.name}</span></div>
          <span class="st-pill-rmse">${fmt(hardest.rmse)}</span>
        </div>
      </div>

      ${verdictHTML}

      <div class="st-list-title">Xếp hạng độ dễ dự báo · mốc ${_activeHorizon}h</div>
      <div class="st-list">${stRows}</div>
      <div class="st-list-note">RMSE thấp = dễ dự báo hơn · Bar dài = tốt hơn</div>`;
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