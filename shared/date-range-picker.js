(function () {
  let globalClickBound = false;
  const fixedPopoverBindings = new Set();

  function getDateRangeLabel(filterState, calendarState) {
    const from = filterState.dateFrom || "";
    const to = filterState.dateTo || "";
    if (calendarState?.datePickStart && from) return `${from} ~ (종료일 선택)`;
    if (!from && !to) return "전체 기간";
    if (from && to) return from === to ? from : `${from} ~ ${to}`;
    if (from) return `${from} ~`;
    return `~ ${to}`;
  }

  function ensureCalendarMonth(calendarState, filterState) {
    if (calendarState.dateCalendarMonth) return;
    const from = filterState?.dateFrom || "";
    const to = filterState?.dateTo || "";
    const anchor = from || to;
    if (anchor) {
      calendarState.dateCalendarMonth = anchor.slice(0, 7);
      return;
    }
    const now = new Date();
    calendarState.dateCalendarMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  function getDayRangeClass(dateStr, filterState, calendarState) {
    const from = filterState.dateFrom || "";
    const to = filterState.dateTo || "";
    let cls = "date-day";
    if (from && to && dateStr >= from && dateStr <= to) {
      cls += " in-range";
      if (dateStr === from) cls += " range-start";
      if (dateStr === to) cls += " range-end";
    } else if (calendarState.datePickStart && from && !to && dateStr === from) {
      cls += " range-start range-end";
    }
    return cls;
  }

  function getWrap(prefix) {
    return document.getElementById(`${prefix}-trigger`)?.closest(".date-range-wrap") || null;
  }

  function positionFixedPopover(wrap) {
    if (!wrap) return;
    const trigger = wrap.querySelector(".date-range-trigger");
    const popover = wrap.querySelector(".date-range-popover");
    if (!trigger || !popover) return;
    const rect = trigger.getBoundingClientRect();
    popover.classList.add("date-range-popover-fixed");
    popover.style.top = `${rect.bottom + 4}px`;
    popover.style.left = `${rect.left}px`;
  }

  function clearFixedPopover(wrap) {
    if (!wrap) return;
    const popover = wrap.querySelector(".date-range-popover");
    if (!popover) return;
    popover.classList.remove("date-range-popover-fixed");
    popover.style.top = "";
    popover.style.left = "";
  }

  function bindFixedReposition(prefix, wrap) {
    if (fixedPopoverBindings.has(prefix)) return;
    fixedPopoverBindings.add(prefix);
    const reposition = () => {
      if (wrap.classList.contains("open")) positionFixedPopover(wrap);
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
  }

  function openDateRangeWrap(wrap) {
    if (!wrap) return;
    wrap.classList.add("open");
    positionFixedPopover(wrap);
  }

  function hideDateRangeWrap(wrap) {
    if (!wrap) return;
    wrap.classList.remove("open");
    clearFixedPopover(wrap);
  }

  function ensureGlobalClose() {
    if (globalClickBound) return;
    globalClickBound = true;
    document.addEventListener("click", (e) => {
      document.querySelectorAll(".date-range-wrap.open").forEach((wrap) => {
        if (!wrap.contains(e.target)) hideDateRangeWrap(wrap);
      });
    });
  }

  function bindDateRangeTrigger(prefix) {
    const trigger = document.getElementById(`${prefix}-trigger`);
    const wrap = trigger?.closest(".date-range-wrap");
    if (!trigger || !wrap || wrap.dataset.dateBound === "1") return;
    wrap.dataset.dateBound = "1";
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (wrap.classList.contains("open")) {
        hideDateRangeWrap(wrap);
      } else {
        openDateRangeWrap(wrap);
      }
    });
    bindFixedReposition(prefix, wrap);
  }

  function renderDateRangeCalendar(calendarState, filterState, prefix, onChange) {
    const wrap = document.getElementById(`${prefix}-calendar`);
    if (!wrap) return;

    const dateWrap = getWrap(prefix);
    if (calendarState.datePickStart && dateWrap) openDateRangeWrap(dateWrap);

    const trigger = document.getElementById(`${prefix}-trigger`);
    if (trigger) trigger.textContent = getDateRangeLabel(filterState, calendarState);

    const hint = document.getElementById(`${prefix}-hint`);
    if (hint) {
      hint.textContent = calendarState.datePickStart ? "종료일을 선택하세요" : "시작일 → 종료일 순으로 선택";
    }

    ensureCalendarMonth(calendarState, filterState);
    if (!calendarState.dateCalendarMonth) return;

    const [year, month] = calendarState.dateCalendarMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

    let daysHtml = "";
    for (let i = 0; i < firstDay; i++) daysHtml += '<span class="date-day empty"></span>';
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const cls = getDayRangeClass(dateStr, filterState, calendarState);
      daysHtml += `<button type="button" class="${cls}" data-date="${dateStr}">${day}</button>`;
    }

    wrap.innerHTML = `
      <div class="date-range-nav">
        <button type="button" id="${prefix}-prev">◀</button>
        <span class="date-range-month">${year}년 ${month}월</span>
        <button type="button" id="${prefix}-next">▶</button>
      </div>
      <div class="date-range-weekdays">${weekdays.map((w) => `<span>${w}</span>`).join("")}</div>
      <div class="date-range-days">${daysHtml}</div>
      <div class="date-range-actions">
        <button type="button" class="btn btn-clear" id="${prefix}-clear">전체 기간</button>
      </div>`;

    if (dateWrap && dateWrap.classList.contains("open")) positionFixedPopover(dateWrap);

    document.getElementById(`${prefix}-prev`)?.addEventListener("click", (e) => {
      e.stopPropagation();
      const [y, m] = calendarState.dateCalendarMonth.split("-").map(Number);
      const d = new Date(y, m - 2, 1);
      calendarState.dateCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      renderDateRangeCalendar(calendarState, filterState, prefix, onChange);
    });

    document.getElementById(`${prefix}-next`)?.addEventListener("click", (e) => {
      e.stopPropagation();
      const [y, m] = calendarState.dateCalendarMonth.split("-").map(Number);
      const d = new Date(y, m, 1);
      calendarState.dateCalendarMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      renderDateRangeCalendar(calendarState, filterState, prefix, onChange);
    });

    document.getElementById(`${prefix}-clear`)?.addEventListener("click", (e) => {
      e.stopPropagation();
      filterState.dateFrom = "";
      filterState.dateTo = "";
      calendarState.datePickStart = null;
      hideDateRangeWrap(dateWrap);
      renderDateRangeCalendar(calendarState, filterState, prefix, onChange);
      if (typeof onChange === "function") onChange();
    });

    wrap.querySelectorAll("button[data-date]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const dateStr = btn.dataset.date;
        if (!dateStr) return;

        let completed = false;
        if (calendarState.datePickStart) {
          const start = calendarState.datePickStart;
          if (dateStr < start) {
            filterState.dateFrom = dateStr;
            filterState.dateTo = start;
          } else {
            filterState.dateFrom = start;
            filterState.dateTo = dateStr;
          }
          calendarState.datePickStart = null;
          completed = true;
          hideDateRangeWrap(dateWrap);
        } else {
          calendarState.datePickStart = dateStr;
          filterState.dateFrom = dateStr;
          filterState.dateTo = "";
          if (dateWrap) openDateRangeWrap(dateWrap);
        }
        renderDateRangeCalendar(calendarState, filterState, prefix, onChange);
        if (completed && typeof onChange === "function") onChange();
      });
    });
  }

  function init(prefix, filterState, calendarState, onChange) {
    if (!prefix || !filterState || !calendarState) return;
    ensureGlobalClose();
    bindDateRangeTrigger(prefix);
    renderDateRangeCalendar(calendarState, filterState, prefix, onChange);
  }

  window.DateRangePicker = {
    init,
    renderDateRangeCalendar,
    getDateRangeLabel,
    ensureCalendarMonth
  };
})();
