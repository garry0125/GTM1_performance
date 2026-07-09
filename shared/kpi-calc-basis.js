(function () {
  const NA = "해당 미디어 집계 안함";

  const KPI_CALC_BASIS = {
    amazon: {
      columns: {
        cpm: {
          formula: "Cost ÷ Impr. × 1,000",
          source: "합산한 지출 ÷ 합산한 노출수 × 1,000 (USD)"
        },
        impr: {
          formula: "Σ 노출수",
          source: "SP: 「광고 노출 수」 · SB: 「Impressions」 또는 「광고 노출 수」"
        },
        clicks: {
          formula: "Σ 클릭수",
          source: "SP: 「클릭수」 · SB: 「Clicks」 또는 「클릭수」"
        },
        ctr: {
          formula: "Clicks ÷ Impr.",
          source: "합산 클릭수 ÷ 합산 노출수 (표시 시 ×100, %)"
        },
        cpc: {
          formula: "Cost ÷ Clicks",
          source: "합산 지출 ÷ 합산 클릭수 (USD)"
        },
        cost: {
          formula: "Σ 지출",
          source: "SP: 「지출」 · SB: 「Spend」 또는 「지출」"
        },
        cvs: {
          formula: "Σ 주문수",
          source: "SP: 「7일 총 주문(건수)」 · SB: 「14 Day Total Orders (#)」 또는 「14일 총 주문(건수)」"
        },
        cvr: {
          formula: "CVS ÷ Clicks",
          source: "합산 주문수 ÷ 합산 클릭수 (표시 시 ×100, %)"
        },
        cvsValues: {
          formula: "Σ 매출",
          source: "SP: 「7일 총 판매」 · SB: 「14 Day Total Sales」 또는 「14일 총 판매」"
        },
        roas: {
          formula: "CVS Values ÷ Cost",
          source: "합산 매출 ÷ 합산 지출"
        },
        acos: {
          formula: "행별 ACoS 평균",
          source: "SP: 「총 판매 광고 비용(ACOS)」 · SB: 「Total Advertising Cost of Sales (ACOS)」 등 행 값의 산술 평균"
        },
        tacos: {
          formula: "Cost ÷ CVS Values",
          source: "합산 지출 ÷ 합산 매출 (표시 시 ×100, %)"
        },
        cpa: {
          formula: "Cost ÷ CVS",
          source: "합산 지출 ÷ 합산 주문수 (USD)"
        },
        aov: {
          formula: "CVS Values ÷ CVS",
          source: "합산 매출 ÷ 합산 주문수 (USD)"
        }
      }
    },
    meta: {
      columns: {
        cpm: {
          formula: "Cost ÷ Impr. × 1,000",
          source: "「지출 금액 (USD)」 합계 ÷ 「노출」 합계 × 1,000"
        },
        impr: {
          formula: "Σ 노출",
          source: "원본 열 「노출」"
        },
        clicks: {
          formula: "Σ 링크 클릭",
          source: "원본 열 「링크 클릭」"
        },
        ctr: {
          formula: "Clicks ÷ Impr. × 100",
          source: "「링크 클릭」 합계 ÷ 「노출」 합계 × 100 (%)"
        },
        cpc: {
          formula: "Cost ÷ Clicks",
          source: "「지출 금액 (USD)」 합계 ÷ 「링크 클릭」 합계"
        },
        cost: {
          formula: "Σ 지출",
          source: "원본 열 「지출 금액 (USD)」"
        },
        cvs: { formula: NA, source: NA },
        cvr: { formula: NA, source: NA },
        cvsValues: { formula: NA, source: NA },
        roas: { formula: NA, source: NA },
        acos: { formula: NA, source: NA },
        tacos: { formula: NA, source: NA },
        cpa: { formula: NA, source: NA },
        aov: { formula: NA, source: NA }
      }
    },
    tiktok: {
      columns: {
        cpm: {
          formula: "Cost ÷ Impr. × 1,000",
          source: "「비용」(KRW) 합계 ÷ 「노출수」 합계 × 1,000 → 원 단위 표시"
        },
        impr: {
          formula: "Σ 노출수",
          source: "원본 열 「노출수」"
        },
        clicks: {
          formula: "Σ 클릭수",
          source: "원본 열 「클릭수(목적지)」"
        },
        ctr: {
          formula: "Clicks ÷ Impr. × 100",
          source: "「클릭수(목적지)」 합계 ÷ 「노출수」 합계 × 100 (%)"
        },
        cpc: {
          formula: "Cost ÷ Clicks",
          source: "「비용」 합계 ÷ 「클릭수(목적지)」 합계 → 원 단위 표시"
        },
        cost: {
          formula: "Σ 비용",
          source: "원본 열 「비용」(KRW, 원 단위 표시)"
        },
        cvs: { formula: NA, source: NA },
        cvr: { formula: NA, source: NA },
        cvsValues: { formula: NA, source: NA },
        roas: { formula: NA, source: NA },
        acos: { formula: NA, source: NA },
        tacos: { formula: NA, source: NA },
        cpa: { formula: NA, source: NA },
        aov: { formula: NA, source: NA }
      }
    },
    google: {
      columns: {
        cpm: {
          formula: "Cost ÷ Impr. × 1,000",
          source: "「비용」(USD) 합계 ÷ 「노출수」 합계 × 1,000"
        },
        impr: {
          formula: "Σ 노출수",
          source: "원본 열 「노출수」"
        },
        clicks: {
          formula: "Σ 클릭수",
          source: "원본 열 「클릭수」"
        },
        ctr: {
          formula: "Clicks ÷ Impr.",
          source: "「클릭수」 합계 ÷ 「노출수」 합계 (표시 시 ×100, %)"
        },
        cpc: {
          formula: "Cost ÷ Clicks",
          source: "「비용」 합계 ÷ 「클릭수」 합계 (USD)"
        },
        cost: {
          formula: "Σ 비용",
          source: "원본 열 「비용」(USD)"
        },
        cvs: { formula: NA, source: NA },
        cvr: { formula: NA, source: NA },
        cvsValues: { formula: NA, source: NA },
        roas: { formula: NA, source: NA },
        acos: { formula: NA, source: NA },
        tacos: { formula: NA, source: NA },
        cpa: { formula: NA, source: NA },
        aov: { formula: NA, source: NA }
      }
    }
  };

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatSourceDateLabel(sourceDate) {
    const raw = String(sourceDate || "").trim();
    if (/^\d{8}$/.test(raw)) {
      return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    }
    return raw;
  }

  function formatSourceDisplay(sourceInfo) {
    if (!sourceInfo) return "연결된 파일 없음";

    if (sourceInfo.type === "multi") {
      const sp = sourceInfo.files?.SP || "—";
      const sb = sourceInfo.files?.SB || "—";
      const parts = [`SP: ${sp}`, `SB: ${sb}`];
      const dateLabel = formatSourceDateLabel(sourceInfo.sourceDate);
      if (dateLabel) parts.push(`기준일 ${dateLabel}`);
      return parts.join(" · ");
    }

    const file = sourceInfo.file || "—";
    const parts = [file];
    if (sourceInfo.reportRange) parts.push(`범위 ${sourceInfo.reportRange}`);
    const dateLabel = formatSourceDateLabel(sourceInfo.sourceDate);
    if (dateLabel) parts.push(`기준일 ${dateLabel}`);
    return parts.join(" · ");
  }

  function buildCalcBasisPopoverHtml(platform, kpiColumns, sourceInfo) {
    const basis = KPI_CALC_BASIS[String(platform || "").toLowerCase()];
    if (!basis) return "";

    const sourceText = formatSourceDisplay(sourceInfo);
    const metaRows = [
      `<div class="kpi-calc-basis-meta kpi-calc-basis-source-meta">`,
      '<span class="kpi-calc-basis-meta-label">데이터</span>',
      `<span class="kpi-calc-basis-source-text">${escapeHtml(sourceText)}</span>`,
      "</div>"
    ].join("");

    const columnRows = (kpiColumns || []).map((col) => {
      const info = basis.columns?.[col.key] || { formula: "—", source: "—" };
      const isNa = info.formula === NA;
      return [
        "<tr>",
        `<th scope="row">${escapeHtml(col.label)}</th>`,
        `<td class="kpi-calc-basis-formula-cell${isNa ? " kpi-calc-basis-na" : ""}">${escapeHtml(info.formula)}</td>`,
        `<td class="kpi-calc-basis-source-cell${isNa ? " kpi-calc-basis-na" : ""}">${escapeHtml(info.source)}</td>`,
        "</tr>"
      ].join("");
    }).join("");

    return [
      '<div class="kpi-calc-basis-popover" id="kpi-calc-basis-popover" role="tooltip">',
      '<div class="kpi-calc-basis-popover-inner">',
      '<div class="kpi-calc-basis-popover-title">KPI 계산 기준</div>',
      metaRows,
      '<table class="kpi-calc-basis-table">',
      "<thead><tr><th scope=\"col\">열</th><th scope=\"col\">계산식</th><th scope=\"col\">원본 데이터</th></tr></thead>",
      "<tbody>",
      columnRows,
      "</tbody>",
      "</table>",
      "</div>",
      "</div>"
    ].join("");
  }

  window.KpiCalcBasis = {
    get(platform) {
      return KPI_CALC_BASIS[String(platform || "").toLowerCase()] || null;
    },
    formatSourceDisplay(sourceInfo) {
      return formatSourceDisplay(sourceInfo);
    },
    buildPopoverHtml(platform, kpiColumns, sourceInfo) {
      return buildCalcBasisPopoverHtml(platform, kpiColumns, sourceInfo);
    },
    updateSourceText(sourceEl, sourceInfo) {
      if (!sourceEl) return;
      sourceEl.textContent = formatSourceDisplay(sourceInfo);
    }
  };
})();
