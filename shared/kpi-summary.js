(function () {
  const KPI_COLUMNS = [
    { key: "cpm", label: "CPM" },
    { key: "impr", label: "Impr." },
    { key: "clicks", label: "Clicks" },
    { key: "ctr", label: "CTR" },
    { key: "cpc", label: "CPC" },
    { key: "cost", label: "Cost" },
    { key: "cvs", label: "CVS" },
    { key: "cvr", label: "CVR" },
    { key: "cvsValues", label: "CVS Values" },
    { key: "roas", label: "ROAS" },
    { key: "acos", label: "ACoS" },
    { key: "tacos", label: "TACoS" },
    { key: "cpa", label: "CPA" },
    { key: "aov", label: "AOV" }
  ];

  const KPI_DATE_PREFIX = "kpi-date";

  function normalizeTypeRows(options) {
    const types = options?.typeRows;
    if (!Array.isArray(types) || !types.length) return [];
    return types.map((item) => String(item).trim()).filter(Boolean);
  }

  function buildTypeCellKey(typeLabel, metricKey) {
    return `${String(typeLabel).toLowerCase()}-${metricKey}`;
  }

  function buildDateCellHtml() {
    return [
      '<div class="date-range-wrap">',
      `<div class="date-range-trigger" id="${KPI_DATE_PREFIX}-trigger" tabindex="0">전체 기간</div>`,
      '<div class="date-range-popover">',
      `<div class="date-range-hint" id="${KPI_DATE_PREFIX}-hint"></div>`,
      `<div id="${KPI_DATE_PREFIX}-calendar"></div>`,
      "</div>",
      "</div>"
    ].join("");
  }

  function buildKpiSummaryHtml(typeRows, hideTypeColumn, typeColumnLabel) {
    const typeLabel = typeColumnLabel || "Type";
    const typeHeader = hideTypeColumn
      ? ""
      : `<th scope="col" class="kpi-type-head">${typeLabel}</th>`;
    const headerCells = [
      '<th scope="col" class="kpi-summary-date-head">Date</th>',
      typeHeader,
      ...KPI_COLUMNS.map((col) => `<th scope="col">${col.label}</th>`)
    ].join("");

    if (!typeRows.length) {
      const valueCells = KPI_COLUMNS.map(
        (col) => `<td data-kpi="${col.key}"></td>`
      ).join("");
      const typeCell = hideTypeColumn ? "" : '<td class="kpi-type-cell"></td>';
      return [
        "<thead><tr>",
        headerCells,
        "</tr></thead>",
        "<tbody><tr>",
        `<td class="kpi-summary-date">${buildDateCellHtml()}</td>`,
        typeCell,
        valueCells,
        "</tr></tbody>"
      ].join("");
    }

    const bodyRows = typeRows.map((typeLabel, index) => {
      const isTotal = String(typeLabel).trim().toUpperCase() === "TOTAL";
      const valueCells = KPI_COLUMNS.map(
        (col) => `<td data-kpi="${buildTypeCellKey(typeLabel, col.key)}"></td>`
      ).join("");
      const dateCell = index === 0
        ? `<td class="kpi-summary-date" rowspan="${typeRows.length}">${buildDateCellHtml()}</td>`
        : "";
      const typeCell = hideTypeColumn
        ? ""
        : `<td class="kpi-type-cell${isTotal ? " kpi-type-total" : ""}"><span class="kpi-type-label">${typeLabel}</span></td>`;
      return [
        `<tr${isTotal ? ' class="kpi-type-row-total"' : ""}>`,
        dateCell,
        typeCell,
        valueCells,
        "</tr>"
      ].join("");
    }).join("");

    return [
      "<thead><tr>",
      headerCells,
      "</tr></thead>",
      "<tbody>",
      bodyRows,
      "</tbody>"
    ].join("");
  }

  function resolveSourceInfo(platform, payload) {
    if (payload && window.PerformanceDataLoader?.extractSourceInfo) {
      return window.PerformanceDataLoader.extractSourceInfo(platform, payload);
    }
    if (window.PerformanceDataLoader?.getPlatformPayload) {
      const cached = window.PerformanceDataLoader.getPlatformPayload(platform);
      if (cached && window.PerformanceDataLoader.extractSourceInfo) {
        return window.PerformanceDataLoader.extractSourceInfo(platform, cached);
      }
    }
    return null;
  }

  function buildCalcBasisWidgetHtml(platform, sourceInfo) {
    if (!window.KpiCalcBasis || !window.KpiCalcBasis.get(platform)) return "";
    return [
      '<div class="kpi-calc-basis-wrap">',
      '<button type="button" class="kpi-calc-basis-trigger" aria-describedby="kpi-calc-basis-popover">',
      '<span class="kpi-calc-basis-icon" aria-hidden="true">?</span>',
      "<span>계산 기준</span>",
      "</button>",
      window.KpiCalcBasis.buildPopoverHtml(platform, KPI_COLUMNS, sourceInfo),
      "</div>"
    ].join("");
  }

  function mountKpiSummary(containerId, platform, options) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const typeRows = normalizeTypeRows(options);
    const hideTypeColumn = Boolean(options?.hideTypeColumn);
    const typeColumnLabel = options?.typeColumnLabel || "Type";
    const initialSourceInfo = resolveSourceInfo(platform);
    const calcBasisWidget = buildCalcBasisWidgetHtml(platform, initialSourceInfo);
    const hasCalcBasis = Boolean(calcBasisWidget);

    container.innerHTML = [
      hasCalcBasis
        ? `<div class="kpi-summary-shell"><div class="kpi-summary-toolbar">${calcBasisWidget}</div>`
        : '<div class="kpi-summary-shell">',
      '<section class="kpi-summary-section" aria-label="KPI 요약">',
      '<div class="kpi-summary-scroll">',
      `<table class="kpi-summary-table${typeRows.length ? " kpi-summary-table-type-rows" : ""}${hideTypeColumn ? " kpi-summary-table-no-type" : ""}">`,
      buildKpiSummaryHtml(typeRows, hideTypeColumn, typeColumnLabel),
      "</table>",
      "</div>",
      "</section>",
      "</div>"
    ].join("");

    const calcBasisSourceEl = hasCalcBasis
      ? container.querySelector(".kpi-calc-basis-source-text")
      : null;

    const dateFilterState = {
      dateFrom: "",
      dateTo: ""
    };
    const dateCalendarState = {
      dateCalendarMonth: "",
      datePickStart: null
    };

    const notifyDateChange = () => {
      if (window.KpiSummary && typeof window.KpiSummary.onDateChange === "function") {
        window.KpiSummary.onDateChange(dateFilterState.dateFrom, dateFilterState.dateTo);
      }
    };

    if (window.DateRangePicker) {
      window.DateRangePicker.init(
        KPI_DATE_PREFIX,
        dateFilterState,
        dateCalendarState,
        notifyDateChange
      );
    }

    window.KpiSummary = {
      platform: platform || "",
      typeRows,
      columns: KPI_COLUMNS.map((col) => col.key),
      getDateRange() {
        return {
          start: dateFilterState.dateFrom,
          end: dateFilterState.dateTo
        };
      },
      setValues(values) {
        if (!values || typeof values !== "object") return;
        if (typeRows.length) {
          typeRows.forEach((typeLabel) => {
            const rowValues = values[typeLabel]
              || values[typeLabel.toLowerCase()]
              || values[typeLabel.toUpperCase()];
            if (rowValues) this.setTypeRowValues(typeLabel, rowValues);
          });
          return;
        }
        KPI_COLUMNS.forEach((col) => {
          const cell = document.querySelector(`[data-kpi="${col.key}"]`);
          if (!cell) return;
          const val = values[col.key];
          cell.textContent = val == null || val === "" ? "" : String(val);
        });
      },
      setTypeRowValues(typeLabel, values) {
        if (!values || typeof values !== "object") return;
        KPI_COLUMNS.forEach((col) => {
          const cell = document.querySelector(`[data-kpi="${buildTypeCellKey(typeLabel, col.key)}"]`);
          if (!cell) return;
          const val = values[col.key];
          cell.textContent = val == null || val === "" ? "" : String(val);
        });
      },
      clearValues() {
        if (typeRows.length) {
          typeRows.forEach((typeLabel) => {
            const empty = {};
            KPI_COLUMNS.forEach((col) => { empty[col.key] = "0"; });
            this.setTypeRowValues(typeLabel, empty);
          });
          return;
        }
        this.setValues({});
      },
      syncSourceFiles(payload) {
        if (!window.KpiCalcBasis || !calcBasisSourceEl) return;
        const sourceInfo = resolveSourceInfo(platform, payload);
        window.KpiCalcBasis.updateSourceText(calcBasisSourceEl, sourceInfo);
      },
      onDateChange: null
    };

    if (hasCalcBasis) {
      window.KpiSummary.syncSourceFiles();
    }
  }

  window.mountKpiSummary = mountKpiSummary;
  window.KPI_SUMMARY_COLUMNS = KPI_COLUMNS;
})();
