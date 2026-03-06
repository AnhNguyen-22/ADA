(function () {
  const API_URL = "/api/recommendations";
  const COLS = ["1h", "3h", "6h", "12h", "24h"];

  const elSummaryRow = () => document.getElementById("hcmc-summary-row");
  const elStationsContainer = () => document.getElementById("stations-container");

  const elTopReasons = () => document.getElementById("public-top-reasons");
  const elRecoPublic = () => document.getElementById("reco-public-list");
  const elRecoSensitive = () => document.getElementById("reco-sensitive-list");

  const elGovSection = () => document.getElementById("government-section");
  const elGovCompare = () => document.getElementById("gov-compare-chart");
  const elGovToggles = () => document.getElementById("gov-chart-toggles");

  function safeText(v) {
    if (v === null || v === undefined) return "--";
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(1).replace(/\.0$/, "") : String(v);
  }

  function setPill(el, value, cls) {
    if (!el) return;
    el.textContent = safeText(value);

    [...el.classList].forEach((c) => {
      if (c.startsWith("pill-")) el.classList.remove(c);
    });
    el.classList.add(cls || "pill-gray");
  }

  function fillSummary(payload) {
    const row = elSummaryRow();
    if (!row) return;

    COLS.forEach((c) => {
      const cell = row.querySelector(`[data-col="${c}"]`);
      setPill(cell, payload.summary?.[c], payload.summary_level?.[c] || "pill-gray");
    });
  }

  // ✅ Map mã trạm → tên hiển thị theo bảng dữ liệu thực
  const STATION_NAMES = {
    "S1": "Thủ Đức",
    "S2": "Bình Tân",
    "S3": "Tân Phú",
    "S4": "Bình Thạnh",
    "S5": "Quận 3",
    "S6": "Quận 10",
  };

  function stationDisplayName(code) {
    return STATION_NAMES[code] || code;
  }

  // ✅ Để CSS QUYẾT ĐỊNH (CSS dùng body.is-government)
  function applyRoleToStations() {
    document.querySelectorAll(".station-row").forEach((row) => {
      row.style.removeProperty("display");
    });
  }

  // ✅ expose để HTML gọi
  window.__setGovMode = function (isGov) {
    window.__IS_GOV__ = !!isGov;

    document.body.classList.toggle("is-government", !!isGov);

    if (elGovSection()) elGovSection().style.display = isGov ? "block" : "none";

    const hasStations = !!window.__HAS_STATIONS__;
    if (elGovCompare()) elGovCompare().style.display = isGov && hasStations ? "block" : "none";

    applyRoleToStations();

    // ✅ VẼ LẠI CHART KHI CHUYỂN MODE
    if (isGov) {
      if (typeof window.drawReliabilityChart === "function") window.drawReliabilityChart();
      if (typeof window.drawCompareChartFromTable === "function") window.drawCompareChartFromTable();
    } else {
      // ✅ QUAN TRỌNG: vẽ lại public chart khi chuyển về public mode
      if (typeof window.drawPublicSummaryChartFromRow === "function") {
        window.drawPublicSummaryChartFromRow();
      }
    }
  };

  function renderStations(payload) {
    const wrap = elStationsContainer();
    if (!wrap) return;

    wrap.innerHTML = "";

    // ✅ FIX: sort + unique station codes (tránh “mất trạm” do id null/trùng)
    const stationsRaw = Array.isArray(payload.stations) ? payload.stations : [];
    const stations = stationsRaw.slice().sort((a, b) => {
      const ka = String(a?.id ?? a?.station_id ?? a?.station_no ?? "");
      const kb = String(b?.id ?? b?.station_id ?? b?.station_no ?? "");
      return ka.localeCompare(kb, undefined, { numeric: true, sensitivity: "base" });
    });
    const usedCodes = new Set();

    stations.forEach((st, idx) => {
      let code = String(st?.id ?? st?.station_id ?? st?.station_no ?? st?.code ?? `${idx + 1}`);
      // Normalize: số thuần "1","2"... → "S1","S2"... để khớp với toggle buttons
      if (/^\d+$/.test(code)) code = "S" + code;
      if (usedCodes.has(code)) code = `${code}_${idx + 1}`;
      usedCodes.add(code);

      const type = st.type || "";

      const row = document.createElement("div");
      row.className = "table-row station-row";
      row.setAttribute("data-series", code);

      const col1 = document.createElement("div");
      col1.className = "station";
      col1.textContent = stationDisplayName(code);


      row.appendChild(col1);

      COLS.forEach((c) => {
        const cell = document.createElement("div");
        cell.className = "value-pill pill-gray";
        cell.setAttribute("data-col", c);
        cell.textContent = "--";
        row.appendChild(cell);

        setPill(cell, st.values?.[c], st.level?.[c] || "pill-gray");
      });

      wrap.appendChild(row);
    });

    window.__HAS_STATIONS__ = stations.length > 0;

    // ✅ Apply mode HIỆN TẠI (không đọc localStorage để ép mode)
    const currentGov =
      typeof window.__IS_GOV__ !== "undefined"
        ? !!window.__IS_GOV__
        : document.body.classList.contains("is-government");

    if (typeof window.__setGovMode === "function") window.__setGovMode(currentGov);
  }

  function fillNarrative(payload) {
    const reasons = Array.isArray(payload.top_reasons) ? payload.top_reasons : [];
    if (elTopReasons()) {
      // Render top_reasons as mini-cards
      elTopReasons().innerHTML = reasons.length
        ? reasons
            .map((x, i) => {
              if (typeof x === "object" && x !== null) {
                const t = x.title ?? "";
                const d = x.detail ?? "";
                return `
                  <div class="reason-mini-card">
                    <div class="reason-mini-num">0${i + 1}</div>
                    <div class="reason-mini-title">${t}</div>
                    ${d ? `<div class="reason-mini-detail">${d}</div>` : ""}
                  </div>
                `;
              }
              return `
                <div class="reason-mini-card">
                  <div class="reason-mini-num">0${i + 1}</div>
                  <div class="reason-mini-title">${x}</div>
                </div>
              `;
            })
            .join("")
        : `<div class="reason-mini-card"><div class="reason-mini-title">Chưa có dữ liệu</div></div>`;
    }

    const pub = payload.recommendations?.public || [];
    const sens = payload.recommendations?.sensitive || payload.recommendations?.sensitive_group || [];

    // Parse **bold** markdown thành <strong>
    function mdBold(s) {
      return String(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    }

    if (elRecoPublic()) {
      elRecoPublic().innerHTML = pub.length
        ? pub.map((x) => `<li>${mdBold(x)}</li>`).join("")
        : "<li>--</li>";
    }
    if (elRecoSensitive()) {
      elRecoSensitive().innerHTML = sens.length
        ? sens.map((x) => `<li>${mdBold(x)}</li>`).join("")
        : "<li>--</li>";
    }
  }

  const FIXED_PALETTE = {
    "HCMC": "#131e29",
    "1": "#2f6fda", "S1": "#2f6fda",
    "2": "#d14b4b", "S2": "#d14b4b",
    "3": "#1e8e5a", "S3": "#1e8e5a",
    "4": "#8b5cf6", "S4": "#8b5cf6",
    "5": "#f59e0b", "S5": "#f59e0b",
    "6": "#0ea5e9", "S6": "#0ea5e9",
  };

  function getFixedColor(key) {
    return FIXED_PALETTE[key] || "#aaaaaa";
  }

  function buildToggles(payload) {
    const box = elGovToggles();
    if (!box) return;
    box.innerHTML = "";

    box.insertAdjacentHTML(
      "beforeend",
      `<button class="toggle-btn is-on" data-series="HCMC" type="button">TP.HCM</button>`
    );

    const stationsRaw = Array.isArray(payload.stations) ? payload.stations : [];
    stationsRaw.forEach((st, idx) => {
      let code = String(st?.id ?? st?.station_id ?? st?.station_no ?? st?.code ?? `${idx + 1}`);
      if (/^\d+$/.test(code)) code = "S" + code;

      const vals = st?.values || {};
      const hasData = Object.values(vals).some((v) => v !== null && v !== undefined);

      if (hasData) {
        box.insertAdjacentHTML("beforeend",
          `<button class="toggle-btn is-on" data-series="${code}" type="button">${stationDisplayName(code)}</button>`
        );
      } else {
        box.insertAdjacentHTML("beforeend",
          `<button class="toggle-btn toggle-no-data" data-series="${code}" type="button" disabled title="Không có dữ liệu">${stationDisplayName(code)}</button>`
        );
      }
    });

    box.querySelectorAll(".toggle-btn:not([disabled])").forEach((btn) => {
      btn.addEventListener("click", () => {
        btn.classList.toggle("is-on");
        if (typeof window.drawCompareChartFromTable === "function") window.drawCompareChartFromTable();
      });
    });
  }

  // ✅ PUBLIC chart: giữ y chang cách bạn vẽ canvas
  window.drawPublicSummaryChartFromRow = function drawPublicSummaryChartFromRow() {
    const canvas = document.getElementById("public-line-chart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const container = canvas.parentElement;

    canvas.width = container.offsetWidth;
    canvas.height = 260;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const row = document.querySelector('[data-series="HCMC"]') || document.getElementById("hcmc-summary-row");
    if (!row) return;

    const vals = COLS.map((col) => {
      const cell = row.querySelector(`[data-col="${col}"]`);
      const num = parseFloat((cell?.textContent || "--").trim());
      return isNaN(num) ? null : num;
    });

    const valid = vals.filter((v) => v !== null);
    if (!valid.length) {
      ctx.fillStyle = "#666";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Chưa có dữ liệu để hiển thị", w / 2, h / 2);
      return;
    }

    const minVal = Math.min(...valid);
    const maxVal = Math.max(...valid);
    const range = maxVal - minVal || 1;

    const padding = { top: 34, right: 20, bottom: 44, left: 56 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    const xStep = chartW / (COLS.length - 1);
    const yScale = chartH / range;

    const mapX = (i) => padding.left + i * xStep;
    const mapY = (v) => padding.top + chartH - (v - minVal) * yScale;

    ctx.strokeStyle = "rgba(0,0,0,0.10)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      const val = maxVal - (range / 4) * i;
      ctx.fillStyle = "#666";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(val.toFixed(1), padding.left - 10, y + 4);
    }

    ctx.fillStyle = "#666";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    COLS.forEach((c, i) => ctx.fillText(c, mapX(i), h - padding.bottom + 22));

    ctx.strokeStyle = "#131e29";
    ctx.lineWidth = 3;
    ctx.beginPath();

    let started = false;
    vals.forEach((v, i) => {
      if (v === null) return;
      const x = mapX(i);
      const y = mapY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });
    ctx.stroke();

    vals.forEach((v, i) => {
      if (v === null) return;
      const x = mapX(i);
      const y = mapY(v);

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#131e29";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#131e29";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(v.toFixed(1)).replace(/\.0$/, ""), x, y - 12);
    });
  };

  async function load() {
    try {
      const res = await fetch(API_URL, { cache: "no-store" });
      const data = await res.json();

      if (!data || !data.ok) {
        console.warn("[recommendations] API not ok:", data);
        return;
      }

      // ✅ Lưu confidence values
      window.__CONF_VALUES__ = [
        data.confidence?.["1h"],
        data.confidence?.["3h"],
        data.confidence?.["6h"],
        data.confidence?.["12h"],
        data.confidence?.["24h"],
      ]
        .map((v) => (Number.isFinite(Number(v)) ? Number(v) : null))
        .map((v, i) => (v === null ? [92, 86, 78, 66, 58][i] : v));

      // ✅ Fill summary data
      fillSummary(data);

      // ✅ Render stations
      renderStations(data);

      // ✅ Fill narrative
      fillNarrative(data);

      // ✅ Build toggles
      buildToggles(data);
      fillGovPreviewTable();

      // ✅ QUAN TRỌNG: sync theo mode HIỆN TẠI (ưu tiên window.__IS_GOV__ do HTML set)
      const currentGov =
        typeof window.__IS_GOV__ !== "undefined"
          ? !!window.__IS_GOV__
          : document.body.classList.contains("is-government");

      // ✅ Gọi setGovMode để vẽ chart phù hợp
      if (typeof window.__setGovMode === "function") {
        window.__setGovMode(currentGov);
      }
    } catch (e) {
      console.error("[recommendations] load failed:", e);
    }
  }

  // ✅ QUAN TRỌNG: Lắng nghe sự kiện custom để reload khi cần
  window.addEventListener("recommendations:reload", function () {
    console.log("[recommendations] Reloading data...");
    load();
  });

  document.addEventListener("DOMContentLoaded", function () {
    load();
  });
  /* =========================
   ADD-ON: Charts + CSV Export
   (Only ADD, do not modify existing code)
========================= */

  (function () {
    const COLS = ["1h", "3h", "6h", "12h", "24h"];

    function safeNumFromCell(cell) {
      if (!cell) return null;
      const t = String(cell.textContent || "").trim();
      const n = parseFloat(t);
      return Number.isFinite(n) ? n : null;
    }

    function getSeriesFromTable(seriesKey) {
      // seriesKey = "HCMC" or "S1"..."S6" (as your table rows set data-series)
      const row = document.querySelector(`[data-series="${seriesKey}"]`);
      if (!row) return null;

      const values = COLS.map((c) => safeNumFromCell(row.querySelector(`[data-col="${c}"]`)));
      const labelLeft = row.querySelector(".station")?.textContent?.trim() || stationDisplayName(seriesKey);
      const typeText = row.children?.[1]?.textContent?.trim() || "";
      return { key: seriesKey, label: labelLeft, type: typeText, values };
    }

    function getActiveToggleSeries() {
      // Toggle buttons only exist in GOV compare chart header
      const btns = Array.from(document.querySelectorAll("#gov-chart-toggles .toggle-btn.is-on"));
      const keys = btns.map((b) => b.getAttribute("data-series")).filter(Boolean);
      // Ensure HCMC exists if toggles missing
      if (!keys.length) return ["HCMC"];
      return keys;
    }

    /* =========================
     1) GOV Compare Chart
  ========================= */
    window.drawCompareChartFromTable = function drawCompareChartFromTable() {
      const canvas = document.getElementById("compare-line-chart");
      if (!canvas) return;

      const wrap = canvas.parentElement;
      const ctx = canvas.getContext("2d");

      canvas.width = wrap.offsetWidth || 900;
      canvas.height = 280;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const keys = getActiveToggleSeries();
      const series = keys.map(getSeriesFromTable).filter(Boolean);

      // Collect all numeric values
      const all = [];
      series.forEach((s) => s.values.forEach((v) => (v !== null ? all.push(v) : null)));

      if (!all.length) {
        ctx.fillStyle = "rgba(242,248,255,0.7)";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Chưa có dữ liệu để so sánh", w / 2, h / 2);
        return;
      }

      const minVal = Math.min(...all);
      const maxVal = Math.max(...all);
      const range = maxVal - minVal || 1;

      const padding = { top: 34, right: 24, bottom: 44, left: 56 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      const xStep = chartW / (COLS.length - 1);
      const yScale = chartH / range;

      const mapX = (i) => padding.left + i * xStep;
      const mapY = (v) => padding.top + chartH - (v - minVal) * yScale;

      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        const val = maxVal - (range / 4) * i;
        ctx.fillStyle = "rgba(242,248,255,0.65)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(val.toFixed(1), padding.left - 10, y + 4);
      }

      // x labels
      ctx.fillStyle = "rgba(242,248,255,0.65)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      COLS.forEach((c, i) => ctx.fillText(c, mapX(i), h - padding.bottom + 22));

      // palette (simple, readable)
      // draw each series — màu cố định theo key, không đổi khi ẩn/hiện
      series.forEach((s, si) => {
        const stroke = getFixedColor(s.key);

        ctx.strokeStyle = stroke;
        ctx.lineWidth = s.key === "HCMC" ? 3.5 : 2.5;

        ctx.beginPath();
        let started = false;
        s.values.forEach((v, i) => {
          if (v === null) return;
          const x = mapX(i);
          const y = mapY(v);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // points
        s.values.forEach((v, i) => {
          if (v === null) return;
          const x = mapX(i);
          const y = mapY(v);

          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x, y, s.key === "HCMC" ? 6 : 5, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = stroke;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
    };

    /* =========================
     2) Reliability (Confidence) Chart
  ========================= */
    window.drawReliabilityChart = function drawReliabilityChart() {
      const canvas = document.getElementById("reliability-chart");
      if (!canvas) return;

      const wrap = canvas.parentElement;
      const ctx = canvas.getContext("2d");

      canvas.width = wrap.offsetWidth || 520;
      canvas.height = Math.max(320, Math.round((wrap?.offsetHeight || 360) * 0.65));

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const vals = Array.isArray(window.__CONF_VALUES__) ? window.__CONF_VALUES__ : [];
      const data = COLS.map((_, i) => {
        const v = vals[i];
        const n = Number(v);
        return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
      });

      const valid = data.filter((v) => v !== null);
      if (!valid.length) {
        ctx.fillStyle = "rgba(242,248,255,0.7)";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Chưa có dữ liệu confidence", w / 2, h / 2);
        return;
      }

      const padding = { top: 24, right: 18, bottom: 44, left: 46 };
      const chartW = w - padding.left - padding.right;
      const chartH = h - padding.top - padding.bottom;

      // y grid 0..100
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();

        const val = 100 - 25 * i;
        ctx.fillStyle = "rgba(242,248,255,0.65)";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(val), padding.left - 10, y + 4);
      }

      const barW = Math.max(24, chartW / (COLS.length * 1.6));
      const gap = (chartW - barW * COLS.length) / (COLS.length + 1);

      // bars
      data.forEach((v, i) => {
        const x = padding.left + gap + i * (barW + gap);
        const labelX = x + barW / 2;

        // x labels
        ctx.fillStyle = "rgba(242,248,255,0.65)";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(COLS[i], labelX, h - padding.bottom + 22);

        if (v === null) return;

        const bh = (v / 100) * chartH;
        const y = padding.top + chartH - bh;

        // bar
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillRect(x, y, barW, bh);

        // value text
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(v)}%`, labelX, y - 8);
      });
    };

    /* =========================
     3) CSV Export (Client)
  ========================= */
    function buildCsvFromTable() {
      const rows = Array.from(document.querySelectorAll("#forecast-table .table-row"));
      if (!rows.length) return null;

      const header = ["series", "type", ...COLS];
      const lines = [header.join(",")];

      rows.forEach((row) => {
        const series = row.getAttribute("data-series") || "";
        const station = row.querySelector(".station")?.textContent?.trim() || "";
        const type = row.children?.[1]?.textContent?.trim() || "";
        const vals = COLS.map((c) => {
          const cell = row.querySelector(`[data-col="${c}"]`);
          const t = String(cell?.textContent || "--").trim();
          return t;
        });

        // Use "station" if available, else series
        const seriesOut = station || series;
        const safe = (s) => `"${String(s).replace(/"/g, '""')}"`;
        lines.push([safe(seriesOut), safe(type), ...vals.map(safe)].join(","));
      });

      return lines.join("\n");
    }

    function downloadText(filename, text) {
      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    function wireCsvButton() {
      const btn = document.getElementById("btn-download-csv");
      if (!btn) return;

      // avoid double binding
      if (btn.__csv_bound__) return;
      btn.__csv_bound__ = true;

      btn.addEventListener("click", () => {
        const csv = buildCsvFromTable();
        if (!csv) return;
        const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        downloadText(`tp-hcm-forecast-${ts}.csv`, csv);
      });
    }

    // Redraw on resize (only when canvas exists)
    function onResize() {
      if (document.body.classList.contains("is-government")) {
        if (typeof window.drawCompareChartFromTable === "function") window.drawCompareChartFromTable();
        if (typeof window.drawReliabilityChart === "function") window.drawReliabilityChart();
      } else {
        if (typeof window.drawPublicSummaryChartFromRow === "function") window.drawPublicSummaryChartFromRow();
      }
    }

    window.addEventListener("resize", () => {
      clearTimeout(window.__reco_resize_t__);
      window.__reco_resize_t__ = setTimeout(onResize, 150);
    });

    // When page Fready: bind CSV
    document.addEventListener("DOMContentLoaded", function () {
      wireCsvButton();
    });

    // When your code triggers reload, button still exists: bind again safely
    window.addEventListener("recommendations:reload", function () {
      wireCsvButton();
    });
  })();
})(); // ✅ FIX: chỉ giữ 1 lần đóng IIFE, bỏ cái dư
/* =========================
   4) GOV PREVIEW TABLE
========================= */

/* =========================
   5) CHART HOVER TOOLTIPS
========================= */
(function () {
  const tip = document.createElement("div");
  tip.id = "chart-tooltip";
  tip.style.cssText = [
    "position:fixed","pointer-events:none","display:none","z-index:9999",
    "background:rgba(19,30,41,0.90)","backdrop-filter:blur(10px)",
    "-webkit-backdrop-filter:blur(10px)",
    "border:1px solid rgba(255,255,255,0.18)","border-radius:10px",
    "padding:8px 12px","color:#f2f8ff",
    "font-family:'72-Semibold',Helvetica,sans-serif","font-size:12px",
    "line-height:1.6","min-width:120px",
    "box-shadow:0 8px 24px rgba(0,0,0,0.28)"
  ].join(";");
  document.body.appendChild(tip);

  function showTip(html, cx, cy) {
    tip.innerHTML = html;
    tip.style.display = "block";
    let left = cx + 14, top = cy - 10;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (left + tw > window.innerWidth  - 8) left = cx - tw - 14;
    if (top  + th > window.innerHeight - 8) top  = cy - th - 8;
    tip.style.left = left + "px";
    tip.style.top  = top  + "px";
  }
  function hideTip() { tip.style.display = "none"; }

  const COLS_H = ["1h","3h","6h","12h","24h"];
  const PALETTE = {
    "HCMC":"#131e29","S1":"#2f6fda","S2":"#d14b4b",
    "S3":"#1e8e5a","S4":"#8b5cf6","S5":"#f59e0b","S6":"#0ea5e9"
  };

  /* ── A) Public line chart ── */
  function attachPublicHover() {
    const canvas = document.getElementById("public-line-chart");
    if (!canvas) return;
    const PAD = { top:34, right:20, bottom:44, left:56 };
    canvas.style.cursor = "crosshair";

    canvas.addEventListener("mousemove", function(e) {
      const row = document.querySelector('[data-series="HCMC"]') || document.getElementById("hcmc-summary-row");
      if (!row) return;
      const vals = COLS_H.map(c => {
        const n = parseFloat((row.querySelector('[data-col="'+c+'"]')?.textContent||"").trim());
        return isNaN(n) ? null : n;
      });
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cW   = canvas.width - PAD.left - PAD.right;
      const xSt  = cW / (COLS_H.length - 1);
      let ni = 0, md = Infinity;
      COLS_H.forEach((_,i) => { const d=Math.abs(mx-(PAD.left+i*xSt)); if(d<md){md=d;ni=i;} });
      if (md > xSt * 0.7 || vals[ni] === null) { hideTip(); return; }
      showTip(
        '<div style="opacity:.6;font-size:11px;margin-bottom:2px">TP.HCM &middot; '+COLS_H[ni]+'</div>'+
        '<div style="font-size:15px;font-weight:700">'+vals[ni].toFixed(1)+
        ' <span style="font-size:11px;opacity:.65">µg/m³</span></div>',
        e.clientX, e.clientY
      );
    });
    canvas.addEventListener("mouseleave", hideTip);
  }

  /* ── B) Gov compare chart ── */
  function attachCompareHover() {
    const canvas = document.getElementById("compare-line-chart");
    if (!canvas) return;
    const PAD = { top:34, right:24, bottom:44, left:56 };
    canvas.style.cursor = "crosshair";

    canvas.addEventListener("mousemove", function(e) {
      const btns = Array.from(document.querySelectorAll("#gov-chart-toggles .toggle-btn.is-on"));
      const keys = btns.map(b => b.getAttribute("data-series")).filter(Boolean);
      if (!keys.length) { hideTip(); return; }

      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (canvas.width / rect.width);
      const cW   = canvas.width - PAD.left - PAD.right;
      const xSt  = cW / (COLS_H.length - 1);
      let ni = 0, md = Infinity;
      COLS_H.forEach((_,i) => { const d=Math.abs(mx-(PAD.left+i*xSt)); if(d<md){md=d;ni=i;} });
      if (md > xSt * 0.7) { hideTip(); return; }

      const lines = keys.map(k => {
        const row = document.querySelector('[data-series="'+k+'"]');
        if (!row) return null;
        const v = parseFloat((row.querySelector('[data-col="'+COLS_H[ni]+'"]')?.textContent||"").trim());
        const label = row.querySelector(".station")?.textContent?.trim() || k;
        return isNaN(v) ? null : { k, label, v };
      }).filter(Boolean).sort((a,b) => b.v - a.v);

      if (!lines.length) { hideTip(); return; }

      const html =
        '<div style="opacity:.6;font-size:11px;margin-bottom:6px">'+COLS_H[ni]+'</div>' +
        lines.map(s =>
          '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
          '<span style="width:9px;height:9px;border-radius:50%;background:'+(PALETTE[s.k]||"#aaa")+';flex-shrink:0;display:inline-block"></span>' +
          '<span style="flex:1">'+s.label+'</span>' +
          '<span style="font-weight:700;margin-left:8px">'+s.v.toFixed(1)+'</span>' +
          '</div>'
        ).join('') +
        '<div style="opacity:.45;font-size:10px;margin-top:4px">µg/m³</div>';

      showTip(html, e.clientX, e.clientY);
    });
    canvas.addEventListener("mouseleave", hideTip);
  }

  /* ── C) Reliability bar chart ── */
  function attachReliabilityHover() {
    const canvas = document.getElementById("reliability-chart");
    if (!canvas) return;
    const PAD = { top:24, right:18, bottom:44, left:46 };
    canvas.style.cursor = "crosshair";

    canvas.addEventListener("mousemove", function(e) {
      const vals = (window.__CONF_VALUES__ || []).map(v => {
        const n = Number(v); return Number.isFinite(n) ? Math.max(0,Math.min(100,n)) : null;
      });
      const rect = canvas.getBoundingClientRect();
      const mx   = (e.clientX - rect.left) * (canvas.width  / rect.width);
      const my   = (e.clientY - rect.top)  * (canvas.height / rect.height);
      const cW   = canvas.width  - PAD.left - PAD.right;
      const cH   = canvas.height - PAD.top  - PAD.bottom;
      const barW = Math.max(24, cW / (COLS_H.length * 1.6));
      const gap  = (cW - barW * COLS_H.length) / (COLS_H.length + 1);

      let hit = -1;
      vals.forEach((v, i) => {
        if (v === null) return;
        const x  = PAD.left + gap + i * (barW + gap);
        const bh = (v / 100) * cH;
        const y  = PAD.top + cH - bh;
        if (mx >= x && mx <= x+barW && my >= y && my <= PAD.top+cH) hit = i;
      });

      if (hit === -1) { hideTip(); return; }
      const v = vals[hit];
      const lbl   = v>=85?"Rất cao":v>=70?"Cao":v>=55?"Trung bình":"Thấp";
      const lcolor= v>=85?"#4ade80":v>=70?"#facc15":v>=55?"#fb923c":"#f87171";
      showTip(
        '<div style="opacity:.6;font-size:11px;margin-bottom:2px">Độ tin cậy &middot; '+COLS_H[hit]+'</div>'+
        '<div style="font-size:15px;font-weight:700">'+Math.round(v)+'%</div>'+
        '<div style="font-size:11px;color:'+lcolor+';margin-top:2px">'+lbl+'</div>',
        e.clientX, e.clientY
      );
    });
    canvas.addEventListener("mouseleave", hideTip);
  }

  function attachAll() {
    attachPublicHover();
    attachCompareHover();
    attachReliabilityHover();
  }

  document.addEventListener("DOMContentLoaded", function(){ setTimeout(attachAll, 900); });
  window.addEventListener("resize",      function(){ setTimeout(attachAll, 300); });
  window.addEventListener("modeChanged", function(){ setTimeout(attachAll, 400); });
})();

/* =========================
   4) GOV PREVIEW TABLE
========================= */
function fillGovPreviewTable() {
  const body = document.getElementById("gov-preview-body");
  if (!body) return;

  const rows = Array.from(document.querySelectorAll("#forecast-table .table-row"));
  if (!rows.length) return;

  body.innerHTML = "";

  rows.forEach((row) => {
    const series = row.querySelector(".station")?.textContent?.trim() || "";
    const type = row.children?.[1]?.textContent?.trim() || "";

    const vals = ["1h","3h","6h","12h","24h"].map((c) => {
      const cell = row.querySelector(`[data-col="${c}"]`);
      return (cell?.textContent || "--").trim();
    });

    body.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${series}</td>
        <td>${type}</td>
        <td>${vals[0]}</td>
        <td>${vals[1]}</td>
        <td>${vals[2]}</td>
        <td>${vals[3]}</td>
        <td>${vals[4]}</td>
      </tr>
    `);
  });
}