// ============================================================
// KIBSHI API Wrapper
// Server: https://kibshi-api.belletech.workers.dev
// Auth:   Telegram InitData (HMAC-SHA256)
// ============================================================
const API_BASE = "https://kibshi-api.belletech.workers.dev";

const api = {
  // ---- Internal helpers ----
  _initData() {
    return window.Telegram?.WebApp?.initData || "";
  },

  _headers() {
    return {
      "Content-Type": "application/json",
      "Authorization": "tma " + this._initData(),
    };
  },

  /**
   * Generic fetch wrapper.
   * Never throws. Always returns { ok, error, data, status?, errorMessage? }.
   */
  async _fetch(path, options = {}) {
    const initData = this._initData();
    if (!initData) {
      return { ok: false, error: "no_init_data", data: null };
    }

    const controller = new AbortController();
    // 15-second timeout (was 5s). Telegram WebView + CF Workers cold start
    // + Supabase round-trip can exceed 5s on first request.
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: { ...this._headers(), ...(options.headers || {}) },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Try to extract server error message body
        let serverError = null;
        try {
          serverError = await res.json();
        } catch (e) {}
        return {
          ok: false,
          error: "http_" + res.status,
          status: res.status,
          data: serverError,
        };
      }
      const data = await res.json();
      return { ok: true, error: null, data, status: res.status };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        error: err.name === "AbortError" ? "timeout" : "network",
        data: null,
        errorMessage: err.message || String(err),
      };
    }
  },

  // ---- Public API ----

  whoami() {
    return this._fetch("/whoami");
  },

  me() {
    return this._fetch("/me");
  },

  submitScore(game_type, score, duration_ms) {
    const body = { game_type, score };
    if (duration_ms != null) body.duration_ms = duration_ms;
    return this._fetch("/scores", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  leaderboard(period = "all") {
    return this._fetch("/leaderboard?period=" + encodeURIComponent(period));
  },
};
