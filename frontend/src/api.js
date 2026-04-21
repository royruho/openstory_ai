const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL    = "google/gemini-2.0-flash-001";
export const FREE_TURN_LIMIT = 20;

// ─── User key (stored in localStorage after turn 20) ────────────

export function getUserKey()          { return localStorage.getItem("openrouter_key") || ""; }
export function saveUserKey(key)      { localStorage.setItem("openrouter_key", key.trim()); }
export function clearUserKey()        { localStorage.removeItem("openrouter_key"); }
export function hasUserKey()          { return !!getUserKey(); }

// ─── Helpers ────────────────────────────────────────────────────

function parseRetryAfter(body) {
  try {
    const msg = body?.error?.message || "";
    const m = msg.match(/retry.*?(\d+\.?\d*)\s*s/i) || msg.match(/try again in (\d+\.?\d*)s/i);
    return m ? parseFloat(m[1]) + 1.0 : 6.0;
  } catch {
    return 6.0;
  }
}

function extractJSON(raw) {
  if (!raw) return null;
  // Strip reasoning blocks and code fences
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch { /* fall through */ }
  // Slice from first { to last } and try again
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

// ─── Core call ──────────────────────────────────────────────────

async function callWithKey(key, system, messages, opts) {
  const maxTokens = Math.min(opts.max_tokens_override || 2000, 2000);
  const body = {
    model:                 OPENROUTER_MODEL,
    max_completion_tokens: maxTokens,
    messages:              [{ role: "system", content: system }, ...messages],
    response_format:       { type: "json_object" },
  };

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(OPENROUTER_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer":  window.location.origin,
        "X-Title":       "Choose Your Adventure",
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429 || resp.status === 503) {
      if (attempt < MAX_RETRIES) {
        let waitBody = null;
        try { waitBody = await resp.json(); } catch { /* ignore */ }
        const wait = resp.status === 429 ? parseRetryAfter(waitBody) * 1000 : 4000 * (attempt + 1);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(resp.status === 429
        ? "Rate limit reached — please wait a moment and try again."
        : "Service temporarily overloaded — please try again.");
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`API error ${resp.status}: ${txt}`);
    }

    const data   = await resp.json();
    const raw    = data?.choices?.[0]?.message?.content || "";
    const result = extractJSON(raw);
    return result || { story: raw, choices: [], gameOver: false, gameOverReason: "" };
  }
}

async function callViaProxy(system, messages, opts) {
  const maxTokens = Math.min(opts.max_tokens_override || 2000, 2000);
  const body = {
    max_completion_tokens: maxTokens,
    messages:              [{ role: "system", content: system }, ...messages],
    response_format:       { type: "json_object" },
  };

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch("/api/proxy", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (resp.status === 429 || resp.status === 503 || resp.status === 504) {
      if (attempt < MAX_RETRIES) {
        const wait = resp.status === 429 ? 6000 : 4000 * (attempt + 1);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      throw new Error(resp.status === 429
        ? "Rate limit reached — please try again in a moment."
        : "Model is slow right now — please try again.");
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`Proxy error ${resp.status}: ${txt}`);
    }

    const data   = await resp.json();
    const raw    = data?.choices?.[0]?.message?.content || "";
    const result = extractJSON(raw);
    return result || { story: raw, choices: [], gameOver: false, gameOverReason: "" };
  }
}

// ─── Public API ─────────────────────────────────────────────────

export const api = {
  /**
   * Main game call.
   * turnCount < FREE_TURN_LIMIT → uses server proxy (key hidden).
   * turnCount >= FREE_TURN_LIMIT → uses user's own OpenRouter key.
   */
  chat: (system, messages, opts = {}) => {
    const userKey = getUserKey();
    const turn    = opts.turnCount ?? FREE_TURN_LIMIT;
    if (userKey || turn >= FREE_TURN_LIMIT) {
      if (!userKey) throw new Error("__need_key__");
      return callWithKey(userKey, system, messages, opts);
    }
    return callViaProxy(system, messages, opts);
  },

  /**
   * Validate an OpenRouter key before saving.
   */
  validateKey: async (key) => {
    if (!key?.trim()) throw new Error("Please enter an API key.");
    const resp = await fetch(OPENROUTER_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key.trim()}`,
        "HTTP-Referer":  window.location.origin,
        "X-Title":       "Choose Your Adventure",
      },
      body: JSON.stringify({
        model:                 OPENROUTER_MODEL,
        max_completion_tokens: 5,
        messages: [
          { role: "system", content: "You are a test." },
          { role: "user",   content: "Say ok" },
        ],
      }),
    });

    if (resp.status === 401 || resp.status === 403) throw new Error("Invalid API key — check that you copied it correctly.");
    if (resp.status === 429) throw new Error("Key is valid but rate-limited right now — try again in a moment.");
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      if (txt.includes("No API key") || txt.includes("invalid_api_key"))
        throw new Error("Invalid API key — check that you copied it correctly.");
      throw new Error(`Validation failed (${resp.status}) — check your key and try again.`);
    }
    return true;
  },
};
