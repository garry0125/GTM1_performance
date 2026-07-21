(function () {
  const AXIS_LABEL_COUNT = 4;

  function normalizeChartDate(value) {
    const s = String(value ?? "").trim();
    if (!s) return "";
    const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;
    }
    const mdy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (mdy) {
      return `${mdy[3]}-${String(mdy[1]).padStart(2, "0")}-${String(mdy[2]).padStart(2, "0")}`;
    }
    return s;
  }

  function formatAxisDate(value) {
    const normalized = normalizeChartDate(value);
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return `${match[2]}-${match[3]}`;
    return String(value ?? "").trim();
  }

  function getSeriesDate(series, index) {
    const row = series[Math.min(Math.max(0, index), series.length - 1)];
    if (!row) return "";
    if (typeof row === "string") return row;
    return row.date ?? row.DATE ?? "";
  }

  function pickAxisIndices(length, labelCount = AXIS_LABEL_COUNT) {
    if (length <= 0) return [];
    if (length === 1) return Array(labelCount).fill(0);
    return Array.from({ length: labelCount }, (_, i) =>
      Math.round((i / (labelCount - 1)) * (length - 1))
    );
  }

  function buildAxisDateLabels(series, labelCount = AXIS_LABEL_COUNT) {
    if (!Array.isArray(series) || !series.length) return [];
    return pickAxisIndices(series.length, labelCount).map((index) =>
      formatAxisDate(getSeriesDate(series, index))
    );
  }

  function buildAxisDatesHtml(series, className, escapeHtml) {
    const escape = typeof escapeHtml === "function"
      ? escapeHtml
      : (str) => String(str ?? "");
    const labels = buildAxisDateLabels(series);
    const spans = labels.map((label) => `<span>${escape(label)}</span>`).join("");
    return `<div class="${className}">${spans}</div>`;
  }

  window.PerformanceChartAxis = {
    AXIS_LABEL_COUNT,
    normalizeChartDate,
    formatAxisDate,
    pickAxisIndices,
    buildAxisDateLabels,
    buildAxisDatesHtml
  };
})();
