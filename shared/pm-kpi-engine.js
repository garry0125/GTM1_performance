(function () {
  const PM_MEDIA_ROWS = ["Amazon", "Meta", "TikTok", "Google"];

  const state = {
    amazon: null,
    meta: null,
    tiktok: null,
    google: null
  };

  let amazonKpiColumnMap = { SP: {}, SB: {} };

  function parseNum(val) {
    const cleaned = String(val ?? "")
      .replace(/[$,%원]/g, "")
      .replace(/,/g, "")
      .trim();
    if (!cleaned) return 0;
    const n = Number(cleaned);
    return Number.isNaN(n) ? 0 : n;
  }

  function parsePct(val) {
    const n = parseNum(val);
    if (n > 1 && String(val ?? "").includes("%")) return n / 100;
    return n;
  }

  function normalizeDate(val) {
    const s = String(val ?? "").trim();
    if (!s) return "";
    const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;
    }
    const mdy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (mdy) {
      return `${mdy[3]}-${String(mdy[1]).padStart(2, "0")}-${String(mdy[2]).padStart(2, "0")}`;
    }
    return "";
  }

  function filterRowsByDate(rows, dateCol, dateFrom, dateTo) {
    if (!dateFrom && !dateTo) return rows;
    return rows.filter((row) => {
      const d = normalizeDate(row[dateCol]);
      if (!d) return false;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }

  function pickColumn(columns, english, pattern) {
    if ((columns || []).includes(english)) return english;
    const found = (columns || []).find((c) => pattern.test(c));
    return found || english;
  }

  function getRowValue(row, colName) {
    if (!row || !colName) return "";
    if (Object.prototype.hasOwnProperty.call(row, colName)) return row[colName];
    const target = String(colName).trim().toLowerCase();
    for (const key of Object.keys(row)) {
      if (String(key).trim().toLowerCase() === target) return row[key];
    }
    return "";
  }

  async function loadAllPlatformData() {
    if (!window.PerformanceDataLoader) {
      throw new Error("데이터 로더를 찾을 수 없습니다. shared/data-loader.js를 확인해주세요.");
    }

    const { ok, results } = await window.PerformanceDataLoader.loadAllPlatformData();
    state.amazon = results.amazon?.ok ? results.amazon.data : null;
    state.meta = results.meta?.ok ? results.meta.data : null;
    state.tiktok = results.tiktok?.ok ? results.tiktok.data : null;
    state.google = results.google?.ok ? results.google.data : null;

    if (!ok) {
      const failed = Object.entries(results).filter(([, result]) => !result.ok);
      const needsUpdate = failed.every(([, result]) =>
        /data\.js|data\.json|데이터가 없|불러올 수 없/.test(String(result.error || ""))
      );

      if (needsUpdate) {
        throw new Error("데이터가 없습니다. 각 플랫폼 폴더에 파일을 넣고 실행.bat을 실행해주세요.");
      }

      const errors = failed
        .map(([platform, result]) => `${platform}: ${result.error}`)
        .join("\n");
      throw new Error(errors || "데이터를 불러올 수 없습니다.");
    }

    return state;
  }

  const AMAZON_KPI_COLUMN_LABELS = {
    SP: {
      spend: "지출",
      impressions: "광고 노출 수",
      clicks: "클릭수",
      orders: "7일 총 주문(건수)",
      sales: "7일 총 판매",
      acos: "총 판매 광고 비용(ACOS)"
    },
    SB: {
      spend: "Spend",
      impressions: "Impressions",
      clicks: "Clicks",
      orders: "14 Day Total Orders (#)",
      sales: "14 Day Total Sales",
      acos: "Total Advertising Cost of Sales (ACOS)"
    }
  };

  const AMAZON_KPI_SP_KEY_FALLBACKS = {
    sales: ["7일 총 판매 "],
    acos: ["총 판매 광고 비용(ACOS) ", "총 판매 광고 비용(ACOS)"]
  };

  const AMAZON_KPI_SB_KEY_FALLBACKS = {
    spend: ["지출"],
    impressions: ["광고 노출 수"],
    clicks: ["클릭수"],
    orders: ["7일 총 주문(건수)"],
    sales: ["7일 총 판매", "7일 총 판매 "],
    acos: ["총 판매 광고 비용(ACOS)", "총 판매 광고 비용(ACOS) "]
  };

  function pickColumnNameFromList(columns, label) {
    const target = String(label || "").trim().toLowerCase();
    if (!target) return label;
    const match = (columns || []).find((col) => String(col).trim().toLowerCase() === target);
    return match || label;
  }

  function resolveAmazonKpiRowKey(rows, adType, labels) {
    const typeRows = (rows || []).filter(
      (row) => String(row.adType || "").toUpperCase() === adType
    );
    const candidates = (labels || []).filter(Boolean);
    if (!typeRows.length || !candidates.length) return candidates[0] || "";
    const rowKeys = [...new Set(typeRows.flatMap((row) => Object.keys(row)))];
    for (const label of candidates) {
      for (const key of rowKeys) {
        if (String(key).trim().toLowerCase() === String(label).trim().toLowerCase()) {
          return key;
        }
      }
    }
    return candidates[0];
  }

  function buildAmazonKpiColumnMap(payload, rows) {
    const spCols = payload?.spColumns || [];
    const sbCols = payload?.sbColumns || [];
    const map = { SP: {}, SB: {} };
    Object.entries(AMAZON_KPI_COLUMN_LABELS.SP).forEach(([key, label]) => {
      const fallbacks = AMAZON_KPI_SP_KEY_FALLBACKS[key] || [];
      map.SP[key] = resolveAmazonKpiRowKey(rows, "SP", [pickColumnNameFromList(spCols, label), ...fallbacks]);
    });
    Object.entries(AMAZON_KPI_COLUMN_LABELS.SB).forEach(([key, label]) => {
      const primary = pickColumnNameFromList(sbCols, label);
      const fallbacks = AMAZON_KPI_SB_KEY_FALLBACKS[key] || [];
      map.SB[key] = resolveAmazonKpiRowKey(rows, "SB", [primary, ...fallbacks]);
    });
    amazonKpiColumnMap = map;
  }

  function getAmazonKpiRawValue(row, adType, fieldKey) {
    const primary = amazonKpiColumnMap[adType]?.[fieldKey];
    const candidates = [primary];
    if (adType === "SP" && AMAZON_KPI_SP_KEY_FALLBACKS[fieldKey]) {
      candidates.push(...AMAZON_KPI_SP_KEY_FALLBACKS[fieldKey]);
    }
    if (adType === "SB" && AMAZON_KPI_SB_KEY_FALLBACKS[fieldKey]) {
      candidates.push(...AMAZON_KPI_SB_KEY_FALLBACKS[fieldKey]);
    }
    for (const cand of candidates) {
      if (!cand) continue;
      if (Object.prototype.hasOwnProperty.call(row, cand)) return row[cand];
    }
    for (const key of Object.keys(row)) {
      const normalized = String(key).trim().toLowerCase();
      for (const cand of candidates) {
        if (!cand) continue;
        if (normalized === String(cand).trim().toLowerCase()) return row[key];
      }
    }
    return "";
  }

  function getAmazonKpiNum(row, adType, fieldKey) {
    return parseNum(getAmazonKpiRawValue(row, adType, fieldKey));
  }

  function prepareAmazonRows(payload) {
    const sp = Array.isArray(payload?.spColumns) ? payload.spColumns : [];
    const dateCol = sp[0] || "날짜";
    const campaignCol = sp[3] || "캠페인 이름";
    return (payload?.rows || []).filter((row) => {
      const campaign = String(row[campaignCol] ?? "").trim();
      const date = normalizeDate(row[dateCol] || row["날짜"]);
      return campaign && date;
    });
  }

  function getAmazonDateCol(payload) {
    const sp = Array.isArray(payload?.spColumns) ? payload.spColumns : [];
    return sp[0] || "날짜";
  }

  function createAmazonKpiTotals() {
    return { spend: 0, impressions: 0, clicks: 0, orders: 0, sales: 0, acosSum: 0, rowCount: 0 };
  }

  function accumulateAmazonKpiRow(totals, row, adType) {
    totals.spend += getAmazonKpiNum(row, adType, "spend");
    totals.impressions += getAmazonKpiNum(row, adType, "impressions");
    totals.clicks += getAmazonKpiNum(row, adType, "clicks");
    totals.orders += getAmazonKpiNum(row, adType, "orders");
    totals.sales += getAmazonKpiNum(row, adType, "sales");
    totals.acosSum += parsePct(getAmazonKpiRawValue(row, adType, "acos"));
    totals.rowCount += 1;
  }

  function buildAmazonKpiMetricsFromTotals(totals) {
    const { spend, impressions, clicks, orders, sales, acosSum, rowCount } = totals;
    return {
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      impr: impressions,
      clicks,
      ctr: impressions ? clicks / impressions : 0,
      cpc: clicks ? spend / clicks : 0,
      cost: spend,
      cvs: orders,
      cvr: clicks ? orders / clicks : 0,
      cvsValues: sales,
      roas: spend ? sales / spend : 0,
      acos: rowCount ? acosSum / rowCount : 0,
      tacos: sales ? spend / sales : 0,
      cpa: orders ? spend / orders : 0,
      aov: orders ? sales / orders : 0
    };
  }

  function aggregateAmazonKpiTotal(rows) {
    const totals = createAmazonKpiTotals();
    rows.forEach((row) => {
      const adType = String(row.adType || "").toUpperCase();
      if (adType !== "SP" && adType !== "SB") return;
      accumulateAmazonKpiRow(totals, row, adType);
    });
    return buildAmazonKpiMetricsFromTotals(totals);
  }

  function aggregateMetaKpi(rows) {
    let impressions = 0;
    let clicks = 0;
    let spend = 0;
    rows.forEach((row) => {
      impressions += parseNum(row["노출"]);
      clicks += parseNum(row["링크 클릭"]);
      spend += parseNum(row["지출 금액 (USD)"]);
    });
    return {
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      impr: impressions,
      clicks,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? spend / clicks : 0,
      cost: spend
    };
  }

  function aggregateTikTokKpi(rows) {
    let impressions = 0;
    let clicks = 0;
    let cost = 0;
    rows.forEach((row) => {
      impressions += parseNum(getRowValue(row, "노출수"));
      clicks += parseNum(getRowValue(row, "클릭수(목적지)"));
      cost += parseNum(getRowValue(row, "비용"));
    });
    return {
      cpm: impressions ? (cost / impressions) * 1000 : 0,
      impr: impressions,
      clicks,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      cpc: clicks ? cost / clicks : 0,
      cost
    };
  }

  function aggregatePmKpiTotal(platformRaws) {
    const totals = createAmazonKpiTotals();

    function addPlatform(raw, costUsd) {
      if (!raw) return;
      totals.impressions += raw.impr || 0;
      totals.clicks += raw.clicks || 0;
      totals.spend += costUsd ?? raw.cost ?? 0;
      totals.orders += raw.cvs || 0;
      totals.sales += raw.cvsValues || 0;
      if (raw.acos) {
        totals.acosSum += raw.acos;
        totals.rowCount += 1;
      }
    }

    addPlatform(platformRaws.amazon, platformRaws.amazon?.cost);
    addPlatform(platformRaws.meta, platformRaws.meta?.cost);
    addPlatform(platformRaws.tiktok, krwToUsd(platformRaws.tiktok?.cost || 0));
    addPlatform(platformRaws.google, platformRaws.google?.cost);

    return buildAmazonKpiMetricsFromTotals(totals);
  }

  function aggregateGoogleKpi(rows) {
    let impressions = 0;
    let clicks = 0;
    let cost = 0;
    rows.forEach((row) => {
      impressions += parseNum(getRowValue(row, "노출수"));
      clicks += parseNum(getRowValue(row, "클릭수"));
      cost += parseNum(getRowValue(row, "비용"));
    });
    return {
      cpm: impressions ? (cost / impressions) * 1000 : 0,
      impr: impressions,
      clicks,
      ctr: impressions ? clicks / impressions : 0,
      cpc: clicks ? cost / clicks : 0,
      cost
    };
  }

  function formatInt(n) {
    return Math.round(Number(n || 0)).toLocaleString();
  }

  function formatSpend(n) {
    return Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function formatPct(rate) {
    return `${(rate * 100).toFixed(2)}%`;
  }

  function formatMetaPct(val) {
    if (!val) return "0%";
    return `${Number(val).toFixed(2)}%`;
  }

  function formatMetaMoney(val) {
    return Number(val || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  const TIKTOK_KRW_PER_USD = 1550;

  function formatUsd(amount) {
    return `$${Number(amount || 0).toFixed(2)}`;
  }

  function krwToUsd(krw) {
    return Number(krw || 0) / TIKTOK_KRW_PER_USD;
  }

  function formatGooglePct(rate) {
    return `${(rate * 100).toFixed(1)}%`;
  }

  function formatAmazonKpiDisplay(raw) {
    return {
      cpm: `$${formatSpend(raw.cpm)}`,
      impr: formatInt(raw.impr),
      clicks: formatInt(raw.clicks),
      ctr: formatPct(raw.ctr),
      cpc: `$${formatSpend(raw.cpc)}`,
      cost: `$${formatSpend(raw.cost)}`,
      cvs: formatInt(raw.cvs),
      cvr: formatPct(raw.cvr),
      cvsValues: `$${formatSpend(raw.cvsValues)}`,
      roas: Number(raw.roas || 0).toFixed(2),
      acos: formatPct(raw.acos),
      tacos: formatPct(raw.tacos),
      cpa: `$${formatSpend(raw.cpa)}`,
      aov: `$${formatSpend(raw.aov)}`
    };
  }

  function formatMetaKpiDisplay(raw) {
    const blank = "";
    return {
      cpm: `$${formatMetaMoney(raw.cpm)}`,
      impr: formatInt(raw.impr),
      clicks: formatInt(raw.clicks),
      ctr: formatMetaPct(raw.ctr),
      cpc: `$${formatMetaMoney(raw.cpc)}`,
      cost: `$${formatMetaMoney(raw.cost)}`,
      cvs: blank,
      cvr: blank,
      cvsValues: blank,
      roas: blank,
      acos: blank,
      tacos: blank,
      cpa: blank,
      aov: blank
    };
  }

  function formatTikTokKpiDisplay(raw) {
    const blank = "";
    return {
      cpm: formatUsd(krwToUsd(raw.cpm)),
      impr: formatInt(raw.impr),
      clicks: formatInt(raw.clicks),
      ctr: formatMetaPct(raw.ctr),
      cpc: formatUsd(krwToUsd(raw.cpc)),
      cost: formatUsd(krwToUsd(raw.cost)),
      cvs: blank,
      cvr: blank,
      cvsValues: blank,
      roas: blank,
      acos: blank,
      tacos: blank,
      cpa: blank,
      aov: blank
    };
  }

  function formatGoogleKpiDisplay(raw) {
    const blank = "";
    return {
      cpm: formatUsd(raw.cpm),
      impr: formatInt(raw.impr),
      clicks: formatInt(raw.clicks),
      ctr: formatGooglePct(raw.ctr),
      cpc: formatUsd(raw.cpc),
      cost: formatUsd(raw.cost),
      cvs: blank,
      cvr: blank,
      cvsValues: blank,
      roas: blank,
      acos: blank,
      tacos: blank,
      cpa: blank,
      aov: blank
    };
  }

  function getTikTokDateCol(columns) {
    return pickColumn(columns || [], "By Day", /^일별/);
  }

  function prepareGoogleRows(rows) {
    return (rows || []).filter((row) => normalizeDate(row["일"]));
  }

  function prepareTikTokRows(rows, columns) {
    const dateCol = getTikTokDateCol(columns);
    const campaignCol = pickColumn(columns || [], "Campaign name", /^캠페인\s*이름/);
    return (rows || []).filter((row) => {
      const campaign = String(row[campaignCol] ?? "");
      if (/Total of|총\s*\d+개\s*결과/i.test(campaign)) return false;
      const date = String(row[dateCol] ?? "").trim();
      if (date === "-") return false;
      return normalizeDate(row[dateCol]);
    });
  }

  function refreshPmKpiSummary() {
    if (!window.KpiSummary) return;

    const { start, end } = window.KpiSummary.getDateRange();
    const setRow = (label, display) => {
      if (display) window.KpiSummary.setTypeRowValues(label, display);
    };

    const platformRaws = {};

    if (state.amazon?.rows?.length) {
      const rows = prepareAmazonRows(state.amazon);
      buildAmazonKpiColumnMap(state.amazon, rows);
      const filtered = filterRowsByDate(rows, getAmazonDateCol(state.amazon), start, end);
      const metrics = aggregateAmazonKpiTotal(filtered);
      platformRaws.amazon = metrics;
      setRow("Amazon", formatAmazonKpiDisplay(metrics));
    }

    if (state.meta?.rows?.length) {
      const filtered = filterRowsByDate(state.meta.rows, "일", start, end);
      const metrics = aggregateMetaKpi(filtered);
      platformRaws.meta = metrics;
      setRow("Meta", formatMetaKpiDisplay(metrics));
    }

    if (state.tiktok?.rows?.length) {
      const dateCol = getTikTokDateCol(state.tiktok.columns);
      const rows = prepareTikTokRows(state.tiktok.rows, state.tiktok.columns);
      const filtered = filterRowsByDate(rows, dateCol, start, end);
      const metrics = aggregateTikTokKpi(filtered);
      platformRaws.tiktok = metrics;
      setRow("TikTok", formatTikTokKpiDisplay(metrics));
    }

    if (state.google?.rows?.length) {
      const rows = prepareGoogleRows(state.google.rows);
      const filtered = filterRowsByDate(rows, "일", start, end);
      const metrics = aggregateGoogleKpi(filtered);
      platformRaws.google = metrics;
      setRow("Google", formatGoogleKpiDisplay(metrics));
    }

    if (Object.keys(platformRaws).length) {
      setRow("TOTAL", formatAmazonKpiDisplay(aggregatePmKpiTotal(platformRaws)));
    }
  }

  function collectPmDatesInRange(start, end) {
    const set = new Set();
    const addDates = (rows, dateCol) => {
      (rows || []).forEach((row) => {
        const d = normalizeDate(row[dateCol]);
        if (!d) return;
        if (start && d < start) return;
        if (end && d > end) return;
        set.add(d);
      });
    };

    if (state.amazon?.rows?.length) {
      addDates(prepareAmazonRows(state.amazon), getAmazonDateCol(state.amazon));
    }
    if (state.meta?.rows?.length) {
      addDates(state.meta.rows, "일");
    }
    if (state.tiktok?.rows?.length) {
      addDates(prepareTikTokRows(state.tiktok.rows, state.tiktok.columns), getTikTokDateCol(state.tiktok.columns));
    }
    if (state.google?.rows?.length) {
      addDates(prepareGoogleRows(state.google.rows), "일");
    }

    return [...set].sort();
  }

  function buildPmDailySeries(start, end) {
    const dates = collectPmDatesInRange(start, end);
    if (!dates.length) return [];

    let amazonRows = null;
    let amazonDateCol = null;
    if (state.amazon?.rows?.length) {
      amazonRows = prepareAmazonRows(state.amazon);
      buildAmazonKpiColumnMap(state.amazon, amazonRows);
      amazonDateCol = getAmazonDateCol(state.amazon);
    }

    const metaRows = state.meta?.rows?.length ? state.meta.rows : null;

    let tiktokRows = null;
    let tiktokDateCol = null;
    if (state.tiktok?.rows?.length) {
      tiktokRows = prepareTikTokRows(state.tiktok.rows, state.tiktok.columns);
      tiktokDateCol = getTikTokDateCol(state.tiktok.columns);
    }

    let googleRows = null;
    if (state.google?.rows?.length) {
      googleRows = prepareGoogleRows(state.google.rows);
    }

    return dates.map((d) => {
      const platformRaws = {};
      if (amazonRows) {
        platformRaws.amazon = aggregateAmazonKpiTotal(filterRowsByDate(amazonRows, amazonDateCol, d, d));
      }
      if (metaRows) {
        platformRaws.meta = aggregateMetaKpi(filterRowsByDate(metaRows, "일", d, d));
      }
      if (tiktokRows) {
        platformRaws.tiktok = aggregateTikTokKpi(filterRowsByDate(tiktokRows, tiktokDateCol, d, d));
      }
      if (googleRows) {
        platformRaws.google = aggregateGoogleKpi(filterRowsByDate(googleRows, "일", d, d));
      }

      const total = aggregatePmKpiTotal(platformRaws);
      return {
        date: d,
        impr: total.impr || 0,
        clicks: total.clicks || 0,
        ctr: total.ctr || 0,
        cvr: total.cvr || 0,
        cvs: total.cvs || 0,
        aov: total.aov || 0
      };
    });
  }

  async function initPmKpiSummary() {
    try {
      await loadAllPlatformData();
      refreshPmKpiSummary();
    } catch (error) {
      if (window.KpiSummary) window.KpiSummary.clearValues();
      throw error;
    }
  }

  window.PmKpiEngine = {
    mediaRows: PM_MEDIA_ROWS,
    loadAllPlatformData,
    refreshPmKpiSummary,
    initPmKpiSummary,
    buildPmDailySeries
  };
})();
