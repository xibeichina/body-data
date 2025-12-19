(function () {
  const data = Array.isArray(window.bodyMeasurements) ? [...window.bodyMeasurements] : [];
  const entriesEl = document.getElementById("entries");
  const highlightEl = document.getElementById("highlight-stats");
  const lastUpdatedEl = document.getElementById("last-updated");
  const bmiValueEl = document.getElementById("bmi-value");
  const bmiNoteEl = document.getElementById("bmi-note");
  const bmiStatusEl = document.getElementById("bmi-status");
  const bmiScaleEl = document.getElementById("bmi-scale");
  const totalCountEl = document.getElementById("total-count");
  const chartCanvas = document.getElementById("chart");
  const chartControls = document.getElementById("chart-controls");
  const ctx = chartCanvas ? chartCanvas.getContext("2d") : null;
  const canvasFont = "13px 'SF Pro Rounded','Segoe UI','PingFang SC','Microsoft YaHei',sans-serif";
  const metrics = [
    { key: "weight_jin", label: "体重", unit: "斤" },
    { key: "height_cm", label: "身高", unit: "cm" },
    { key: "waist_cm", label: "腰围", unit: "cm" },
    { key: "chest_cm", label: "胸围", unit: "cm" },
    { key: "hip_cm", label: "臀围", unit: "cm" },
    { key: "bmi", label: "BMI", unit: "" }
  ];
  let currentMetric = metrics[0].key;

  function getBmiStatus(bmi) {
    if (!bmi || Number.isNaN(bmi)) return { label: "—", tone: "", range: "" };
    if (bmi < 18.5) return { label: "偏瘦", range: "< 18.5", tone: "low" };
    if (bmi < 24) return { label: "正常", range: "18.5 - 23.9", tone: "ok" };
    if (bmi < 28) return { label: "超重", range: "24 - 27.9", tone: "mid" };
    return { label: "肥胖", range: "≥ 28", tone: "high" };
  }

  function formatDelta(current, prev) {
    if (prev === undefined || prev === null) return "—";
    const diff = current - prev;
    if (diff === 0) return "持平";
    const sign = diff > 0 ? "+" : "−";
    return `${sign}${Math.abs(diff).toFixed(1)}`;
  }

  function render() {
    if (!data.length) {
      entriesEl.innerHTML = "<p style='color: var(--muted);'>暂无数据，请在 data/measurements.js 中添加记录。</p>";
      return;
    }

    const sorted = data
      .map(item => ({ ...item, _date: new Date(item.date) }))
      .sort((a, b) => b._date - a._date);

    const latest = sorted[0];
    const previous = sorted[1];

    lastUpdatedEl.textContent = latest.date;
    totalCountEl.textContent = `${sorted.length} 条`;

    const kg = latest.weight_jin / 2;
    const heightM = latest.height_cm / 100;
    const bmi = kg / (heightM * heightM);
    const bmiStatus = getBmiStatus(bmi);
    bmiValueEl.textContent = bmi ? bmi.toFixed(2) : "--";
    if (bmiStatusEl) {
      bmiStatusEl.textContent = bmiStatus.range ? `${bmiStatus.label} · ${bmiStatus.range}` : bmiStatus.label;
      bmiStatusEl.className = `bmi-status ${bmiStatus.tone ? `bmi-${bmiStatus.tone}` : ""}`;
    }
    bmiNoteEl.textContent = `${kg.toFixed(1)} kg / ${(heightM || 0).toFixed(2)} m`;
    renderBmiScale(bmi);
    const deltaText = previous ? formatDelta(latest.weight_jin, previous.weight_jin) : "—";

    const highlightMetrics = [
      { label: "体重", value: `${latest.weight_jin} 斤`, delta: deltaText },
      { label: "身高", value: `${latest.height_cm} cm`, delta: "" },
      latest.waist_cm ? { label: "腰围", value: `${latest.waist_cm} cm`, delta: formatDelta(latest.waist_cm, previous?.waist_cm) } : null,
      latest.chest_cm ? { label: "胸围", value: `${latest.chest_cm} cm`, delta: formatDelta(latest.chest_cm, previous?.chest_cm) } : null,
      latest.hip_cm ? { label: "臀围", value: `${latest.hip_cm} cm`, delta: formatDelta(latest.hip_cm, previous?.hip_cm) } : null,
    ].filter(Boolean);

    highlightEl.innerHTML = highlightMetrics.map(metric => {
      const delta = metric.delta && metric.delta !== "—" ? `<span class="${metric.delta.startsWith('−') ? "delta down" : "delta"}">${metric.delta}</span>` : "";
      return `
        <div class="stat-card">
          <div class="stat-label">${metric.label}</div>
          <div class="stat-value">${metric.value} ${delta}</div>
        </div>
      `;
    }).join("");

    const entryHTML = sorted.map((item, index) => {
      const prev = sorted[index + 1];
      const chips = [
        item.weight_jin ? `体重 ${item.weight_jin} 斤` : "",
        item.height_cm ? `身高 ${item.height_cm} cm` : "",
        item.waist_cm ? `腰围 ${item.waist_cm} cm (${formatDelta(item.waist_cm, prev?.waist_cm)})` : "",
        item.chest_cm ? `胸围 ${item.chest_cm} cm (${formatDelta(item.chest_cm, prev?.chest_cm)})` : "",
        item.hip_cm ? `臀围 ${item.hip_cm} cm (${formatDelta(item.hip_cm, prev?.hip_cm)})` : ""
      ].filter(Boolean).map(text => `<span class="chip">${text}</span>`).join("");

      return `
        <article class="entry">
          <div class="entry-date">${item.date}</div>
          <div class="chips">${chips}</div>
        </article>
      `;
    }).join("");

    entriesEl.innerHTML = entryHTML;

    renderChart(sorted);
  }

  function renderBmiScale(bmi) {
    if (!bmiScaleEl) return;
    bmiScaleEl.innerHTML = "";
    if (!bmi || Number.isNaN(bmi)) return;

    const minBMI = 14;
    const maxBMI = 35;
    const clamped = Math.max(minBMI, Math.min(maxBMI, bmi));
    const pct = ((clamped - minBMI) / (maxBMI - minBMI)) * 100;

    const marker = document.createElement("div");
    marker.className = "bmi-marker";
    marker.style.left = `${pct}%`;

    const label = document.createElement("div");
    label.className = "bmi-marker-label";
    label.textContent = bmi.toFixed(2);
    marker.appendChild(label);

    bmiScaleEl.appendChild(marker);
  }

  function renderChart(sorted) {
    if (!ctx || !sorted.length) return;
    const chronological = [...sorted].reverse();
    const metric = metrics.find(m => m.key === currentMetric) || metrics[0];

    const getValue = (item) => {
      if (metric.key === "bmi") {
        const kg = Number(item.weight_jin) / 2;
        const heightM = Number(item.height_cm) / 100;
        if (!kg || !heightM) return NaN;
        return Number((kg / (heightM * heightM)).toFixed(2));
      }
      return Number(item[metric.key]);
    };

    const points = chronological
      .map(item => ({ date: item.date, value: getValue(item) }))
      .filter(p => !Number.isNaN(p.value));

    chartControls.innerHTML = metrics.map(m => `
      <button class="chip-button ${m.key === currentMetric ? "active" : ""}" data-key="${m.key}">
        ${m.label}
      </button>
    `).join("");

    chartControls.querySelectorAll("button").forEach(btn => {
      btn.onclick = () => {
        currentMetric = btn.dataset.key;
        renderChart(sorted);
      };
    });

    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

    if (points.length < 2) {
      ctx.fillStyle = "#cbd5e1";
      ctx.font = canvasFont;
      ctx.fillText("数据不足以绘制折线图", 24, 40);
      return;
    }

    const padding = { top: 30, right: 32, bottom: 38, left: 48 };
    const width = chartCanvas.width - padding.left - padding.right;
    const height = chartCanvas.height - padding.top - padding.bottom;
    const values = points.map(p => p.value);
    const dates = points.map(p => p.date);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal === minVal ? 1 : (maxVal - minVal);

    const scaleX = (i) => padding.left + (i / (points.length - 1)) * width;
    const scaleY = (val) => padding.top + height - ((val - minVal) / range) * height;

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + height);
    gradient.addColorStop(0, "rgba(79, 209, 197, 0.35)");
    gradient.addColorStop(1, "rgba(124, 58, 237, 0.05)");

    ctx.beginPath();
    ctx.moveTo(scaleX(0), scaleY(points[0].value));
    points.forEach((p, i) => ctx.lineTo(scaleX(i), scaleY(p.value)));
    ctx.strokeStyle = "#4fd1c5";
    ctx.lineWidth = 2.4;
    ctx.shadowColor = "rgba(79, 209, 197, 0.4)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.lineTo(scaleX(points.length - 1), padding.top + height);
    ctx.lineTo(scaleX(0), padding.top + height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.fillStyle = "#e2e8f0";
    ctx.font = canvasFont;
    let lastLabelX = -Infinity;
    const minLabelGap = 46;
    points.forEach((p, i) => {
      const x = scaleX(i);
      const y = scaleY(p.value);
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#4fd1c5";
      ctx.fill();

      if (x - lastLabelX > minLabelGap || i === points.length - 1) {
        const label = p.value.toString();
        const w = ctx.measureText(label).width;
        const padX = 6;
        const padY = 4;
        const rectX = Math.max(padding.left, Math.min(x - w / 2 - padX, chartCanvas.width - padding.right - (w + padX * 2)));
        let rectY = y - 28;
        const rectH = 18 + padY;
        if (rectY < padding.top + 6) {
          rectY = y + 14; // place below if near the top to avoid overlapping标题
        }
        ctx.fillStyle = "rgba(15, 23, 42, 0.82)";
        ctx.fillRect(rectX, rectY, w + padX * 2, rectH);
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.fillText(label, Math.min(Math.max(x, padding.left + 10), chartCanvas.width - padding.right - 10), rectY + 14);
        ctx.textAlign = "start";
        lastLabelX = x;
      }
    });

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px 'SF Pro Rounded','Segoe UI','PingFang SC','Microsoft YaHei',sans-serif";
    ctx.textAlign = "center";
    const maxDateLabels = Math.min(6, dates.length);
    const step = Math.max(1, Math.floor((dates.length - 1) / (maxDateLabels - 1 || 1)));
    dates.forEach((d, i) => {
      if (i % step !== 0 && i !== dates.length - 1) return;
      let x = scaleX(i);
      x = Math.min(Math.max(x, padding.left + 24), chartCanvas.width - padding.right - 24);
      ctx.fillText(d, x, padding.top + height + 22);
    });
    ctx.textAlign = "start";

    const unitText = metric.unit ? ` (${metric.unit})` : "";
    ctx.fillText(`${metric.label}${unitText}`, padding.left, 18);
    ctx.fillText(`最小 ${minVal}${metric.unit}`, chartCanvas.width - padding.right - 90, 18);
    ctx.fillText(`最大 ${maxVal}${metric.unit}`, chartCanvas.width - padding.right - 90, 34);
  }

  render();
})();
