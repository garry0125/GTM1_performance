(function () {
  const UPDATE_CHANNEL = "performance-data-update";

  const PLATFORM_CONFIG = {
    amazon: {
      json: "Amazon/data.json",
      globalKey: "AMAZON_DATA"
    },
    meta: {
      json: "Meta/data.json",
      globalKey: "META_DATA"
    },
    tiktok: {
      json: "TikTok/data.json",
      globalKey: "TIKTOK_DATA"
    },
    google: {
      json: "Google/data.json",
      globalKey: "GOOGLE_DATA"
    }
  };

  function isValidPayload(data) {
    return Boolean(data && Array.isArray(data.rows));
  }

  function getPreloadedData(globalKey) {
    const data = window[globalKey];
    return isValidPayload(data) ? data : null;
  }

  async function fetchJsonFile(url) {
    const res = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }

  function extractSourceInfo(platform, payload) {
    if (!payload || typeof payload !== "object") return null;

    const key = String(platform || "").toLowerCase();
    if (key === "amazon") {
      const files = payload.sourceFiles || {};
      return {
        type: "multi",
        files: {
          SP: String(files.SP || "").trim(),
          SB: String(files.SB || files.SD || "").trim()
        }
      };
    }

    if (key === "google") {
      const files = payload.sourceFiles || {};
      const keyword = String(files.keyword || payload.sourceFile || "").trim();
      const demandGen = String(files.demandGen || payload.demandGen?.sourceFile || "").trim();
      if (keyword && demandGen) {
        return {
          type: "multi",
          files: {
            keyword,
            demandGen
          }
        };
      }
      return {
        type: "single",
        file: keyword || demandGen,
        reportRange: String(payload.reportRange || payload.demandGen?.reportRange || "").trim()
      };
    }

    return {
      type: "single",
      file: String(payload.sourceFile || "").trim(),
      reportRange: String(payload.reportRange || "").trim()
    };
  }

  function getPlatformPayload(platform) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) return null;
    return getPreloadedData(config.globalKey);
  }

  function canFetchJson() {
    return /^https?:$/i.test(window.location.protocol);
  }

  async function loadPlatformData(platform) {
    const config = PLATFORM_CONFIG[platform];
    if (!config) {
      return { ok: false, data: null, error: `알 수 없는 플랫폼: ${platform}`, source: null };
    }

    const errors = [];

    // GitHub Pages 등 http(s)에서는 data.json을 우선 로드해 캐시된 data.js에 묶이지 않게 한다.
    if (canFetchJson()) {
      try {
        const data = await fetchJsonFile(config.json);
        if (isValidPayload(data)) {
          window[config.globalKey] = data;
          return { ok: true, data, error: null, source: "data.json" };
        }
        errors.push("data.json 형식 오류");
      } catch (error) {
        errors.push(error && error.message ? error.message : String(error));
      }
    }

    const preloaded = getPreloadedData(config.globalKey);
    if (preloaded) {
      return { ok: true, data: preloaded, error: null, source: "data.js" };
    }

    const detail = errors.length ? errors.join(" / ") : "데이터 없음";
    return {
      ok: false,
      data: null,
      error: `데이터를 불러올 수 없습니다. 각 플랫폼 폴더에 파일을 넣고 실행.bat을 실행해주세요. (${detail})`,
      source: null
    };
  }

  async function loadAllPlatformData() {
    const platforms = Object.keys(PLATFORM_CONFIG);
    const entries = await Promise.all(
      platforms.map(async (platform) => {
        const result = await loadPlatformData(platform);
        return [platform, result];
      })
    );
    const results = {};
    let allOk = true;
    entries.forEach(([platform, result]) => {
      results[platform] = result;
      if (!result.ok) allOk = false;
    });
    return { ok: allOk, results };
  }

  function notifyDataUpdated() {
    window.dispatchEvent(new CustomEvent("performance-data-updated"));
    try {
      const channel = new BroadcastChannel(UPDATE_CHANNEL);
      channel.postMessage({ type: "data-updated", at: Date.now() });
      channel.close();
    } catch (_) {
      /* BroadcastChannel 미지원 */
    }
  }

  function onDataUpdated(callback) {
    if (typeof callback !== "function") return;
    window.addEventListener("performance-data-updated", callback);
    try {
      const channel = new BroadcastChannel(UPDATE_CHANNEL);
      channel.onmessage = (event) => {
        if (event && event.data && event.data.type === "data-updated") {
          callback(event.data);
        }
      };
    } catch (_) {
      /* BroadcastChannel 미지원 */
    }
  }

  window.PerformanceDataLoader = {
    PLATFORM_CONFIG,
    extractSourceInfo,
    getPlatformPayload,
    loadPlatformData,
    loadAllPlatformData,
    notifyDataUpdated,
    onDataUpdated
  };
})();
