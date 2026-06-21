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
   * Never throws. Always returns { ok, error, data }.
   * - ok:    true on 2xx, false otherwise
   * - error: null | "no_init_data" | "timeout" | "network" | "http_4xx" | "http_5xx"
   * - data:  parsed JSON on success, null on failure
   */
  async _fetch(path, options = {}) {
    const initData = this._initData();
    if (!initData) {
      // Not running in Telegram (e.g. opened in browser for dev)
      return { ok: false, error: "no_init_data", data: null };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(API_BASE + path, {
        ...options,
        headers: { ...this._headers(), ...(options.headers || {}) },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { ok: false, error: "http_" + res.status, data: null };
      }
      const data = await res.json();
      return { ok: true, error: null, data };
    } catch (err) {
      clearTimeout(timeoutId);
      return {
        ok: false,
        error: err.name === "AbortError" ? "timeout" : "network",
        data: null,
      };
    }
  },

  // ---- Public API ----

  /** GET /whoami → auth check + user info */
  whoami() {
    return this._fetch("/whoami");
  },

  /** GET /me → personal bests + period totals + period ranks */
  me() {
    return this._fetch("/me");
  },

  /**
   * POST /scores
   * @param {"jump"|"catch"|"duel"} game_type
   * @param {number} score        - integer
   * @param {number} [duration_ms] - optional
   */
  submitScore(game_type, score, duration_ms) {
    const body = { game_type, score };
    if (duration_ms != null) body.duration_ms = duration_ms;
    return this._fetch("/scores", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  /**
   * GET /leaderboard?period=all|week|month
   * @param {"all"|"week"|"month"} [period="all"]
   */
  leaderboard(period = "all") {
    return this._fetch("/leaderboard?period=" + encodeURIComponent(period));
  },
};
