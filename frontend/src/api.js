const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL    = "deepseek/deepseek-v4-flash";
// Mirrored on the server in api/proxy.js — keep in sync. Used by the
// user-key path (turn 20+) where the call goes direct to OpenRouter.
const FALLBACK_MODELS     = [
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-flash",
];
// Retry the primary for this long before flipping to the fallback chain.
const RETRY_WINDOW_MS = 20000;
const RETRY_STATUSES  = new Set([429, 503, 504]);
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

// Escape unescaped " characters inside JSON string values.
// Strategy: scan character by character tracking string context. When inside a
// string, a `"` is the closing delimiter only if the next non-whitespace char is
// a JSON structural character (} ] , :). Otherwise it's an unescaped quote that
// the LLM embedded in the value (common with Hebrew/Arabic dialogue) — escape it.
function repairUnescapedQuotes(str) {
  let out = "";
  let inStr = false;
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (!inStr) {
      out += ch;
      if (ch === '"') inStr = true;
      i++;
    } else if (ch === '\\') {
      out += ch + (str[i + 1] ?? "");
      i += 2;
    } else if (ch === '"') {
      // Peek past whitespace to see if the next token is structural.
      let j = i + 1;
      while (j < str.length && " \t\n\r".includes(str[j])) j++;
      const next = str[j];
      if (j >= str.length || "}],:".includes(next)) {
        out += '"'; inStr = false; i++;   // valid end of string
      } else {
        out += '\\"'; i++;                 // unescaped inner quote — escape it
      }
    } else {
      out += ch; i++;
    }
  }
  return out;
}

function extractJSON(raw) {
  if (!raw) return null;
  // Strip reasoning blocks and code fences
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/g, "").replace(/```/g, "").trim();
  // Some models (e.g. gemini-2.0-flash-lite) wrap the object in a single-element
  // array — unwrap so the caller still gets the expected shape.
  const unwrap = (v) => (Array.isArray(v) && v.length === 1 && typeof v[0] === "object") ? v[0] : v;
  try { return unwrap(JSON.parse(clean)); } catch { /* fall through */ }
  // Slice from first { to last } and try again
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const sliced = clean.slice(start, end + 1);
    try { return unwrap(JSON.parse(sliced)); } catch { /* fall through */ }
    // Last resort: repair unescaped quotes inside string values, then retry both forms.
    try { return unwrap(JSON.parse(repairUnescapedQuotes(sliced))); } catch { /* fall through */ }
  }
  try { return unwrap(JSON.parse(repairUnescapedQuotes(clean))); } catch { /* fall through */ }
  return null;
}

// ─── Core call ──────────────────────────────────────────────────

// Build the request body for the user-key (direct OpenRouter) path.
// `useFallback` swaps `model` for the `models` array so OpenRouter picks
// the first one that responds.
function buildUserKeyBody(system, messages, maxTokens, useFallback) {
  const body = {
    max_completion_tokens: maxTokens,
    messages:              [{ role: "system", content: system }, ...messages],
    response_format:       { type: "json_object" },
  };
  if (useFallback) body.models = [OPENROUTER_MODEL, ...FALLBACK_MODELS];
  else             body.model  = OPENROUTER_MODEL;
  return body;
}

async function callWithKey(key, system, messages, opts) {
  const maxTokens = Math.min(opts.max_tokens_override || 2000, 2000);
  const onRetry   = typeof opts.onRetry === "function" ? opts.onRetry : null;
  const startMs   = Date.now();
  let attempt = 0;
  let useFallback = false;

  while (true) {
    attempt++;
    const resp = await fetch(OPENROUTER_ENDPOINT, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
        "HTTP-Referer":  window.location.origin,
        "X-Title":       "Choose Your Adventure",
      },
      body: JSON.stringify(buildUserKeyBody(system, messages, maxTokens, useFallback)),
    });

    if (resp.ok) {
      const data   = await resp.json();
      const raw    = data?.choices?.[0]?.message?.content || "";
      const result = extractJSON(raw);
      return result || { story: raw, choices: [], gameOver: false, gameOverReason: "" };
    }

    if (!RETRY_STATUSES.has(resp.status)) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`API error ${resp.status}: ${txt}`);
    }

    // Retryable. If we already tried the fallback chain, give up.
    if (useFallback) {
      throw new Error(resp.status === 429
        ? "Rate limit reached on all backup models — please wait a moment and try again."
        : "All models are overloaded right now — please try again.");
    }

    const elapsed = Date.now() - startMs;
    if (elapsed >= RETRY_WINDOW_MS) {
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: true, attempt });
      continue;
    }

    let waitBody = null;
    try { waitBody = await resp.json(); } catch { /* ignore */ }
    const hint = resp.status === 429 ? parseRetryAfter(waitBody) * 1000 : 3000 + attempt * 1500;
    const wait = Math.min(Math.max(hint, 2000), RETRY_WINDOW_MS - elapsed);
    onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: false, attempt });
    await new Promise(r => setTimeout(r, wait));
  }
}

async function callViaProxy(system, messages, opts) {
  const maxTokens = Math.min(opts.max_tokens_override || 2000, 2000);
  const onRetry   = typeof opts.onRetry === "function" ? opts.onRetry : null;
  const startMs   = Date.now();
  let attempt = 0;
  let useFallback = false;

  while (true) {
    attempt++;
    const body = {
      max_completion_tokens: maxTokens,
      messages:              [{ role: "system", content: system }, ...messages],
      response_format:       { type: "json_object" },
      useFallback,                              // proxy swaps in the fallback chain
    };
    const resp = await fetch("/api/proxy", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });

    if (resp.ok) {
      const data   = await resp.json();
      const raw    = data?.choices?.[0]?.message?.content || "";
      const result = extractJSON(raw);
      return result || { story: raw, choices: [], gameOver: false, gameOverReason: "" };
    }

    if (!RETRY_STATUSES.has(resp.status)) {
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`Proxy error ${resp.status}: ${txt}`);
    }

    if (useFallback) {
      throw new Error(resp.status === 429
        ? "Rate limit reached on all backup models — please try again in a moment."
        : "All models are slow right now — please try again.");
    }

    const elapsed = Date.now() - startMs;
    if (elapsed >= RETRY_WINDOW_MS) {
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: true, attempt });
      continue;
    }

    const hint = resp.status === 429 ? 5000 : 3000 + attempt * 1500;
    const wait = Math.min(Math.max(hint, 2000), RETRY_WINDOW_MS - elapsed);
    onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: false, attempt });
    await new Promise(r => setTimeout(r, wait));
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
