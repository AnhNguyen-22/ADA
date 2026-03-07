/**
 * policy-suggestions.js
 * - Fetch /api/policy-suggestions
 * - Render station filter tabs (Global + per-station)
 * - Switch SHAP image per station (fallback to global)
 * - Filter policy suggestions by selected station
 *
 * UPDATED:
 * 1) Replace station tabs with 2 dropdowns (horizon + station) placed side-by-side (HTML/CSS side).
 * 2) SHAP image path depends on horizon dropdown:
 *    /data/processed/{tplus_dir}/shap_summary.png (global)
 *    /data/processed/{tplus_dir}/shap_summary_station_{num}.png (station)
 */
(function () {
  "use strict";

  const API_URL = "/api/policy-suggestions";

  // ─── State ───────────────────────────────────────────────────────────────
  let _globalData = null;          // full API payload
  let _activeStation = "global";   // "global" | "1.0" | "3.0" | ...
  let _activeHorizon = "1h";       // "1h" | "3h" | "6h" | "12h" | "24h"

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function el(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  const STATION_NAMES = {
    "1": "Thủ Đức", "2": "Bình Tân", "3": "Tân Phú",
    "4": "Bình Thạnh", "5": "Quận 3", "6": "Quận 10"
  };
  function stationLabel(stationId) {
    if (stationId === "global") return "Global";
    const num = String(stationId).replace(".0", "");
    return STATION_NAMES[num] || ("Trạm " + num);
  }

  // horizon → folder mapping
  function horizonToDir(h) {
    const map = {
      "1h":  "tplus_1h",
      "3h":  "tplus_3h",
      "6h":  "tplus_6h",
      "12h": "tplus_12h",
      "24h": "tplus_24h"
    };
    return map[h] || "tplus_1h";
  }

  // ─── Dropdowns ───────────────────────────────────────────────────────────
  // NEW: station dropdown (replaces station tabs)
  function buildStationDropdown(data) {
    const select = el("station-select");
    if (!select) return;

    // Collect unique station IDs from detected_scenarios
    const scenarios = data.detected_scenarios || [];
    const stationIds = scenarios.map(s => String(s.station));

    // Build options: Global first, then each station
    const options = [
      { id: "global", label: "Global" },
      ...stationIds.map(id => ({ id, label: stationLabel(id) }))
    ];

    select.innerHTML = options.map(o =>
      `<option value="${esc(o.id)}"${o.id === _activeStation ? " selected" : ""}>${esc(o.label)}</option>`
    ).join("");

    // Attach change handler
    select.addEventListener("change", function () {
      selectStation(this.value);
    });
  }

  // NEW: horizon dropdown init
  function initHorizonDropdown() {
    const select = el("horizon-select");
    if (!select) return;

    // Keep current state
    select.value = _activeHorizon;

    select.addEventListener("change", function () {
      _activeHorizon = this.value;
      load();
    });
  }

  // ─── Select Station (main action) ────────────────────────────────────────
  function selectStation(stationId) {
    if (stationId === _activeStation) return;
    _activeStation = stationId;

    // Sync dropdown UI (instead of tabs)
    const stationSelect = el("station-select");
    if (stationSelect) stationSelect.value = stationId;

    updateShapImage();
    renderFeatureBars(_globalData);
    renderPolicies(_globalData);
    updatePolicyBadge();
  }

  // ─── SHAP Image ──────────────────────────────────────────────────────────
  function updateShapImage() {
    if (!_globalData) return;
    const shap = _globalData.shap || {};
    const img = el("shap-img");
    const placeholder = el("shap-placeholder");
    if (!img) return;

    const legend = el("shap-legend");
    // reset legend to default whenever switching
    if (legend && shap.color_legend) legend.textContent = shap.color_legend;

    const dir = horizonToDir(_activeHorizon);

    // Decide URL by horizon + station
    // Actual filenames: shap_summary_global.png, shap_summary_station_1.png
    let url;
    if (_activeStation === "global") {
      url = "/data/processed/" + dir + "/shap_summary_global.png";
    } else {
      const num = String(_activeStation).replace(".0", "");
      url = "/data/processed/" + dir + "/shap_summary_station_" + num + ".png";
    }

    // Fade transition
    img.classList.add("fade-out");

    setTimeout(function () {
      const testImg = new Image();
      testImg.onload = function () {
        img.src = url + "?t=" + Date.now();
        img.style.display = "block";
        if (placeholder) placeholder.style.display = "none";
        img.classList.remove("fade-out");
        img.classList.add("fade-in");
      };
      testImg.onerror = function () {
        // Station-specific image not found → fallback to global (same horizon folder)
        if (_activeStation !== "global") {
          const globalUrl = "/data/processed/" + dir + "/shap_summary_global.png";
          img.src = globalUrl + "?t=" + Date.now();
          img.style.display = "block";
          if (placeholder) placeholder.style.display = "none";
          img.classList.remove("fade-out");

          // Add subtle note (keep your old behavior)
          if (legend) legend.textContent = "⚠️ Chưa có SHAP riêng cho trạm này — đang hiển thị Global model.";
        } else {
          img.style.display = "none";
          if (placeholder) {
            placeholder.innerHTML = '<div class="chart-dot"></div><p>Không tải được ảnh SHAP.</p>';
            placeholder.style.display = "block";
          }
        }
        img.classList.remove("fade-out");
      };
      testImg.src = url;
    }, 180);
  }

  // --- Feature Bar Chart ---
  function renderFeatureBars(data) {
    const container = el("feature-bars");
    if (!container) return;

    // top_features_by_station là object: { "1.0": [...], "3.0": [...], ... }
    let features = [];
    if (_activeStation !== "global") {
      const byStation = data.top_features_by_station || {};
      // Thử nhiều dạng key: "1.0", "1", "1.0" để khớp với JSON
      const candidates = [
        _activeStation,
        _activeStation.replace(".0", ""),
        _activeStation.includes(".") ? _activeStation : _activeStation + ".0"
      ];
      for (const key of candidates) {
        if (byStation[key] && byStation[key].length) {
          features = byStation[key].slice(0, 8);
          break;
        }
      }
    }
    // Fallback to global top_features
    if (!features.length) {
      features = (data.top_features || []).slice(0, 8);
    }

    if (!features.length) {
      container.innerHTML = '<p style="color:rgba(255,255,255,0.3);font-size:12px;">Không có dữ liệu</p>';
      return;
    }

    const maxVal = features[0].mean_abs_shap;

    container.innerHTML = features.map(function (f, i) {
      const pct = maxVal > 0 ? (f.mean_abs_shap / maxVal) * 100 : 0;
      const val = f.mean_abs_shap.toFixed(2);
      const label = f.feature
        .replace(/_lag(\d+)$/, " (lag$1)")
        .replace(/_roll_(\w+)$/, " (roll $1)")
        .replace(/_current$/, "");
      return [
        '<div class="feature-row" style="animation-delay:' + (i * 60) + 'ms">',
        '  <div class="feature-label" title="' + esc(f.feature) + '">' + esc(label) + "</div>",
        '  <div class="feature-bar-track">',
        '    <div class="feature-bar-fill" data-pct="' + pct.toFixed(1) + '"></div>',
        "  </div>",
        '  <div class="feature-value">' + val + "</div>",
        "</div>"
      ].join("\n");
    }).join("");

    // Animate bars after paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        container.querySelectorAll(".feature-bar-fill").forEach(function (bar) {
          bar.style.width = bar.dataset.pct + "%";
        });
      });
    });
  }

  function initShap(data) {
    const shap = data.shap || {};
    const subtitleEl = el("shap-subtitle");
    const legendEl = el("shap-legend");

    if (subtitleEl && shap.subtitle) subtitleEl.textContent = shap.subtitle;
    if (legendEl && shap.color_legend) legendEl.textContent = shap.color_legend;

    renderFeatureBars(data);
    updateShapImage();
  }

  // ─── Policy Badge ─────────────────────────────────────────────────────────
  function updatePolicyBadge() {
    const badge = el("policy-station-badge");
    if (!badge) return;
    badge.textContent = _activeStation === "global"
      ? "Tất cả trạm"
      : stationLabel(_activeStation);
  }

  // ─── Policy Cards ─────────────────────────────────────────────────────────
  /**
   * Build a map: scenario_text → Set of station IDs that have that scenario.
   * Used to show which stations triggered each policy.
   */
  function buildScenarioStationMap(data) {
    const map = {};           // scenario_string → Set<stationId>
    (data.detected_scenarios || []).forEach(function (entry) {
      const stId = String(entry.station);
      (entry.scenarios || []).forEach(function (sc) {
        if (!map[sc]) map[sc] = new Set();
        map[sc].add(stId);
      });
    });
    return map;
  }

  /**
   * Get set of scenario texts active for the selected station.
   * "global" → all scenarios.
   */
  function getActiveScenarios(data) {
    if (_activeStation === "global") return null; // null = show all
    const stationRow = (data.detected_scenarios || []).find(
      s => String(s.station) === _activeStation
    );
    if (!stationRow) return new Set();
    return new Set(stationRow.scenarios || []);
  }

  function renderPolicies(data) {
    const box = el("policy-suggestions-list");
    if (!box) return;

    const allPolicies = data.policy_suggestions || [];
    const activeScenarioSet = getActiveScenarios(data);     // null = all
    const scenarioStationMap = buildScenarioStationMap(data);

    // Filter policies
    const visible = activeScenarioSet === null
      ? allPolicies
      : allPolicies.filter(p => activeScenarioSet.has(p.scenario));

    if (!visible.length) {
      box.innerHTML = '<div class="policy-empty">Không có gợi ý chính sách phù hợp cho trạm này.</div>';
      return;
    }

    box.innerHTML = visible.map(function (it, i) {
      const priority = esc(it.priority || "MEDIUM");
      const policies = it.policies || {};

      // Which stations triggered this scenario?
      const triggeredBy = scenarioStationMap[it.scenario] || new Set();
      const stationTags = [...triggeredBy]
        .map(id => `<span class="station-tag">${esc(stationLabel(id))}</span>`)
        .join("");

      return `
        <div class="policy-card" role="article" style="animation-delay:${i * 50}ms">
          <div class="policy-card-top">
            <h3>${esc(it.scenario)}</h3>
            <span class="priority-badge ${priority}">${priority}</span>
          </div>
          ${stationTags ? `<div class="policy-stations">${stationTags}</div>` : ""}
          <p class="policy-interpretation">${esc(it.interpretation)}</p>
          <ul class="policy-detail-list">
            ${policies.health   ? `<li><span class="policy-detail-label health">Y tế</span><span>${esc(policies.health)}</span></li>` : ""}
            ${policies.urban_env ? `<li><span class="policy-detail-label env">Môi trường</span><span>${esc(policies.urban_env)}</span></li>` : ""}
            ${policies.education ? `<li><span class="policy-detail-label edu">Giáo dục</span><span>${esc(policies.education)}</span></li>` : ""}
          </ul>
        </div>
      `;
    }).join("");
  }

  // ─── Load ─────────────────────────────────────────────────────────────────
  async function load() {
    try {
      const res = await fetch(`${API_URL}?horizon=${_activeHorizon}`, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "API error");

      _globalData = data;

      // UPDATED: init 2 dropdowns
      initHorizonDropdown();
      buildStationDropdown(data);

      initShap(data);
      renderPolicies(data);
      updatePolicyBadge();

    } catch (err) {
      console.error("[policy-suggestions]", err);

      const placeholder = el("shap-placeholder");
      if (placeholder) {
        placeholder.innerHTML =
          '<div class="chart-dot" style="background:#ef4444"></div>' +
          "<p>Lỗi tải dữ liệu: " + esc(err.message) + "</p>";
        placeholder.style.display = "block";
      }

      const box = el("policy-suggestions-list");
      if (box) {
        box.innerHTML =
          '<div class="policy-error">⚠️ Không thể tải gợi ý chính sách: ' +
          esc(err.message) +
          "<br>Kiểm tra backend đang chạy tại <code>" + API_URL + "</code></div>";
      }
    }
  }

  // ─── Init ─────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    // Sidebar icon interactions
    document.querySelectorAll(".sidebar-icon").forEach(function (icon) {
      icon.addEventListener("click", function () {
        document.querySelectorAll(".sidebar-icon").forEach(i => i.classList.remove("active"));
        this.classList.add("active");
      });
    });

    load();
  });

})();