(function () {
  function normalizeHeader(value) {
    return String(value ?? "").trim();
  }

  function findColumn(columns, candidates) {
    const cols = columns || [];
    if (!cols.length) return "";

    for (const candidate of candidates) {
      if (!candidate) continue;

      if (candidate instanceof RegExp) {
        const found = cols.find((col) => candidate.test(normalizeHeader(col)));
        if (found) return found;
        continue;
      }

      const target = normalizeHeader(candidate);
      const exact = cols.find((col) => normalizeHeader(col) === target);
      if (exact) return exact;

      const ci = cols.find((col) => normalizeHeader(col).toLowerCase() === target.toLowerCase());
      if (ci) return ci;
    }

    return typeof candidates[0] === "string" ? candidates[0] : "";
  }

  function pickColumn(columns, english, patternOrPatterns) {
    const patterns = Array.isArray(patternOrPatterns) ? patternOrPatterns : [patternOrPatterns];
    return findColumn(columns, [english, ...patterns.filter(Boolean)]);
  }

  function getRowValue(row, colName, extraCandidates) {
    const candidates = [colName, ...(extraCandidates || [])].filter(Boolean);
    for (const cand of candidates) {
      if (!cand) continue;
      if (Object.prototype.hasOwnProperty.call(row, cand)) return row[cand];

      const target = normalizeHeader(cand).toLowerCase();
      for (const key of Object.keys(row)) {
        if (normalizeHeader(key).toLowerCase() === target) return row[key];
      }
    }
    return "";
  }

  function resolveMetaColumns(columns) {
    return {
      CAMPAIGN: findColumn(columns, ["캠페인 이름", "Campaign name", /^Campaign\s*name/i]),
      DATE: findColumn(columns, ["일", "Day", "Date"]),
      AD_SET: findColumn(columns, ["광고 세트 이름", "Ad set name", "Ad Set Name", /^광고\s*세트/]),
      AD_NAME: findColumn(columns, ["광고 이름", "Ad name", /^광고\s*이름/]),
      IMPRESSIONS: findColumn(columns, ["노출", "Impressions", /^Impressions$/i, /^노출$/]),
      CLICKS: findColumn(columns, ["링크 클릭", "Link clicks", "Clicks (all)", /^링크\s*클릭/i, /^Link\s*clicks/i]),
      SPEND: findColumn(columns, [
        "지출 금액 (USD)",
        "Amount spent (USD)",
        "Spend (USD)",
        /^지출\s*금액/i,
        /^Amount\s*spent/i
      ]),
      CTR: findColumn(columns, [
        "CTR(링크 클릭률)",
        "CTR (link click-through rate)",
        "CTR (all)",
        /^CTR\s*\(/i,
        /^CTR$/i
      ]),
      CPC: findColumn(columns, [
        "CPC(링크 클릭당 비용)",
        "CPC (cost per link click)",
        /^CPC\s*\(/i,
        /^CPC$/i
      ])
    };
  }

  function resolveGoogleColumns(columns) {
    return {
      DATE: findColumn(columns, ["일", "Day", "Date"]),
      KEYWORD: findColumn(columns, ["검색어", "Search keyword", "Keyword", /^검색어$/]),
      MATCH_TYPE: findColumn(columns, [
        "검색어 검색 유형",
        "Search keyword match type",
        "Match type",
        /^검색어\s*검색/
      ]),
      AD_GROUP: findColumn(columns, ["광고그룹", "Ad group", "Ad Group", /^광고\s*그룹/]),
      CLICKS: findColumn(columns, ["클릭수", "Clicks"]),
      IMPRESSIONS: findColumn(columns, ["노출수", "Impr.", "Impressions"]),
      CURRENCY: findColumn(columns, ["통화 코드", "Currency code", "Currency"]),
      COST: findColumn(columns, ["비용", "Cost"]),
      CTR: findColumn(columns, ["클릭률(CTR)", "CTR", "Click-through rate"]),
      CPC: findColumn(columns, ["평균 CPC", "Avg. CPC", "Average CPC", /^CPC/i])
    };
  }

  function resolveTikTokColumns(columns) {
    return {
      CAMPAIGN: findColumn(columns, ["캠페인 이름", "Campaign name", /^캠페인\s*이름/]),
      OBJECTIVE: findColumn(columns, ["광고 목표", "Advertising objective", /^광고\s*목표/]),
      AD_GROUP: findColumn(columns, ["광고 그룹 이름", "Ad group name", /^광고\s*그룹/]),
      AD_NAME: findColumn(columns, ["광고 이름", "Ad name", /^광고\s*이름/]),
      DATE: findColumn(columns, ["일별", "By Day", "Day", "Date"]),
      IMPRESSIONS: findColumn(columns, ["노출수", "Impressions", /^노출/]),
      CLICKS: findColumn(columns, ["클릭수(목적지)", "Clicks (destination)", /클릭/i]),
      COST: findColumn(columns, ["비용", "Cost", /^비용/]),
      CTR: findColumn(columns, ["CTR(목적지)", "CTR (destination)", /^CTR/i]),
      CPC: findColumn(columns, ["CPC(목적지)", "CPC (destination)", /^CPC/i]),
      CURRENCY: findColumn(columns, ["통화", "Currency"])
    };
  }

  window.PerformanceColumnResolver = {
    findColumn,
    pickColumn,
    getRowValue,
    resolveMetaColumns,
    resolveGoogleColumns,
    resolveTikTokColumns
  };
})();
