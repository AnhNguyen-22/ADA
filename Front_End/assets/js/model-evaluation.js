(function () {
  "use strict";

  const API_PATH = "/api/model-evaluation";
  const API_FALLBACK = "http://127.0.0.1:5000/api/model-evaluation";

  let _data = null;
  let _stationById = {};
  let _activeStationId = null;
  let _chart = null;
  let _stationDropdown = null;

  function q(sel) {
    return document.querySelector(sel);
  }

  function fmt(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n.toFixed(3).replace(/\.000$/, "") : "--";
  }

  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function rowBestModel(rows, rmseKey, maeKey, mapeKey) {
    const valid = rows.filter((r) => {
      const rmse = asNum(r[rmseKey]);
      const mae = asNum(r[maeKey]);
      const mape = asNum(r[mapeKey]);
      return rmse !== null && rmse > 0 && mae !== null && mae > 0 && mape !== null && mape > 0;
    });

    if (!valid.length) return null;

    valid.sort((a, b) => {
      const rmseDiff = Number(a[rmseKey]) - Number(b[rmseKey]);
      if (rmseDiff !== 0) return rmseDiff;

      const maeDiff = Number(a[maeKey]) - Number(b[maeKey]);
      if (maeDiff !== 0) return maeDiff;

      return Number(a[mapeKey]) - Number(b[mapeKey]);
    });

    return valid[0].model;
  }

  function getStationRows(station) {
    return ((station && station.model_avg_rmse) || []).slice();
  }

  function renderTable(station) {
    const tbody = q(".comparison-table tbody");
    if (!tbody || !station) return;

    const rows = getStationRows(station);
    const best = rowBestModel(rows, "avg_rmse", "avg_mae", "avg_mape");

    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4">Không có dữ liệu hợp lệ để xếp hạng mô hình tại trạm này.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map((r) => {
        const isBest = best && r.model === best;
        return `
          <tr>
            <td>${r.model || "--"} ${isBest ? '<span class="badge-best">Tốt nhất</span>' : ""}</td>
            <td>${fmt(r.avg_rmse)}</td>
            <td>${fmt(r.avg_mae)}</td>
            <td>${fmt(r.avg_mape)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function renderBestModel(station) {
    const bestName = q(".best-model-name");
    const bestDesc = q(".best-model-description");
    if (!bestName || !bestDesc || !station) return;

    const rows = getStationRows(station);
    const best = rowBestModel(rows, "avg_rmse", "avg_mae", "avg_mape") || "--";
    const used = Number(station.used_rows || 0);
    const dropped = Number(station.dropped_rows || 0);

    bestName.textContent = String(best).toUpperCase();
    bestDesc.textContent =
      `Mô hình ${best} được chọn theo dữ liệu trung bình của riêng ${station.name} ` +
      `(ưu tiên RMSE, sau đó MAE và MAPE). Dùng ${used} bản ghi hợp lệ, loại ${dropped} bản ghi rỗng hoặc bằng 0.`;
  }

  function renderDiffText(station) {
    const el = q(".area-difference-text");
    if (!el || !station || !_data) return;

    const stationRows = getStationRows(station);
    const stationBest = stationRows[0];
    if (!stationBest) {
      el.textContent = "Chưa đủ dữ liệu để nhận xét sự khác biệt khu vực.";
      return;
    }

    const allStations = Object.values(_stationById || {});
    const globalBestRows = allStations
      .map((st) => (st.model_avg_rmse || [])[0])
      .filter(Boolean)
      .filter((x) => asNum(x.avg_rmse) !== null);

    if (!globalBestRows.length) {
      el.textContent = "Chưa đủ dữ liệu để nhận xét sự khác biệt khu vực.";
      return;
    }

    const globalMean = globalBestRows.reduce((s, x) => s + Number(x.avg_rmse), 0) / globalBestRows.length;
    const stationRmse = Number(stationBest.avg_rmse);
    const diff = Math.abs(stationRmse - globalMean).toFixed(3);
    const trend = stationRmse > globalMean
      ? "khó dự báo hơn mức trung bình giữa các trạm"
      : "ổn định hơn mức trung bình giữa các trạm";

    el.textContent =
      `${station.name}: mô hình tốt nhất là ${stationBest.model} (RMSE=${fmt(stationRmse)}), ` +
      `${trend} khoảng ${diff} RMSE so với mức trung bình tốt nhất của các trạm (${fmt(globalMean)}).`;
  }

  function renderReasonText(station) {
    const el = q(".reason-text");
    if (!el || !station) return;

    const rows = getStationRows(station);
    const best = rowBestModel(rows, "avg_rmse", "avg_mae", "avg_mape") || "--";

    const rankText = rows.length
      ? rows.map((x) => `${x.model}: RMSE ${fmt(x.avg_rmse)}, MAE ${fmt(x.avg_mae)}, MAPE ${fmt(x.avg_mape)}`).join(" | ")
      : "Không có xếp hạng";

    el.textContent =
      `Lý do chọn mô hình tại ${station.name}: ưu tiên sai số nhỏ và ổn định trên các mốc dự báo của trạm. ` +
      `Mô hình ${best} có RMSE trung bình thấp nhất tại trạm này. Xếp hạng: ${rankText}.`;
  }

  function renderChart(station) {
    const canvas = document.getElementById("comparison-chart");
    if (!canvas || typeof Chart === "undefined" || !station) return;

    const rows = getStationRows(station);
    const labels = rows.map((r) => r.model || "--");
    const rmseVals = rows.map((r) => (Number.isFinite(Number(r.avg_rmse)) ? Number(r.avg_rmse) : null));
    const maeVals = rows.map((r) => (Number.isFinite(Number(r.avg_mae)) ? Number(r.avg_mae) : null));

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
            borderRadius: 8
          },
          {
            label: "MAE",
            data: maeVals,
            backgroundColor: "#64B5F6",
            borderColor: "#42A5F5",
            borderWidth: 2,
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: "top" }
        },
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } }
        }
      }
    });
  }

  function renderStation(stationId) {
    _activeStationId = stationId;
    const station = _stationById[stationId];
    if (!station) return;

    renderTable(station);
    renderBestModel(station);
    renderChart(station);
    renderDiffText(station);
    renderReasonText(station);
  }

  function initDropdown() {
    const options = ((_data && _data.station_options) || []).map((x) => ({
      value: x.id,
      text: x.label
    }));

    _stationDropdown = new Dropdown("station-dropdown", {
      items: options,
      defaultItem: _activeStationId,
      onSelect: function (value) {
        renderStation(value);
      }
    });
  }

  function bindCreateButton() {
    const btnCreate = q(".btn-create");
    if (!btnCreate) return;

    btnCreate.addEventListener("click", function () {
      renderStation(_activeStationId);
    });
  }

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

  async function load() {
    const data = await fetchModelEvaluation();
    if (!data.ok) throw new Error(data.message || "API error");

    _data = data;
    _stationById = {};

    (_data.stations || []).forEach((s) => {
      _stationById[s.id] = s;
    });

    _activeStationId = data.default_station_id || ((_data.stations[0] || {}).id || null);
    if (!_activeStationId) throw new Error("Không có dữ liệu trạm");

    const chartDesc = q(".chart-description");
    if (chartDesc) {
      chartDesc.textContent =
        "Biểu đồ thể hiện RMSE/MAE trung bình của các mô hình theo trạm đang chọn (đã loại dữ liệu rỗng hoặc bằng 0).";
    }

    initDropdown();
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
