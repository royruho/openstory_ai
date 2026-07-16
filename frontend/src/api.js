const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL    = "google/gemini-2.5-flash";
// Mirrored on the server in api/proxy.js — keep in sync. Used by the
// user-key path (turn 20+) where the call goes direct to OpenRouter.
const FALLBACK_MODELS     = [
  "deepseek/deepseek-chat",
];
// Retry the primary for this long before flipping to the fallback chain.
const RETRY_WINDOW_MS   = 5000;
const RETRY_STATUSES    = new Set([429, 503, 504]);
// Hard per-attempt timeout — if a model responds slowly but doesn't error,
// abort and fall back rather than waiting indefinitely.
const ATTEMPT_TIMEOUT_MS = 25000;
// How many unparseable responses to tolerate before failing the turn. Upstream
// providers intermittently return HTTP 200 with finish_reason:"error" and
// truncated content, so this must be >1 or a transient blip ends the turn.
const MAX_PARSE_FAILURES = 3;
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
// string, a `"` is the closing delimiter only if what follows is *structurally*
// valid JSON. Otherwise it's an unescaped quote the LLM embedded in the value
// (common with Hebrew/Arabic dialogue) — escape it.
//
// Treating a bare `,` as structural is NOT safe: dialogue that closes a quote
// before a comma — `אמר: "עצור שם", ואז שלף` — looks identical to end-of-value.
// Misreading it derails the parse, extractJSON returns null, and the caller
// used to store the raw JSON blob as story text (which then compounds through
// the history round-trip). So after a comma we require a real `"key":` pair or
// a following string element; prose after the comma means it was an inner quote.
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
      // Peek past whitespace to see what follows this quote.
      let j = i + 1;
      while (j < str.length && " \t\n\r".includes(str[j])) j++;
      const next = str[j];
      let closes;
      if (j >= str.length || next === "}" || next === "]" || next === ":") {
        closes = true;
      } else if (next === ",") {
        const rest = str.slice(j + 1);
        closes = /^\s*"(?:[^"\\]|\\.)*"\s*:/.test(rest)      // next object key
              || /^\s*"(?:[^"\\]|\\.)*"\s*[,\]]/.test(rest); // next array element
      } else {
        closes = false;
      }
      if (closes) {
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

// Fix closers that don't match the bracket they close. Models intermittently end
// an array with `}` — e.g. `"facts":[ ... "רועי יצא מהמערה."}}}` instead of
// `..."]}}` — which is unparseable even under response_format:json_object.
//
// Deliberately only SWAPS a wrong closer for the right one. It never appends
// missing closers and never closes an open string: doing so would make genuinely
// TRUNCATED output parse, and a truncated story must fail the turn rather than be
// stored (it would then compound through the history round-trip).
function repairMismatchedBrackets(str) {
  let out = "";
  const stack = [];
  let inStr = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      if (ch === "\\") { out += ch + (str[i + 1] ?? ""); i++; continue; }
      if (ch === '"') inStr = false;
      out += ch;
      continue;
    }
    if (ch === '"') { inStr = true; out += ch; continue; }
    if (ch === "{" || ch === "[") { stack.push(ch); out += ch; continue; }
    if (ch === "}" || ch === "]") {
      const open = stack.pop();
      if (open === undefined) { out += ch; continue; }  // stray closer — leave it, parse will fail
      out += open === "{" ? "}" : "]";                  // emit the closer the opener demands
      continue;
    }
    out += ch;
  }
  return out;  // unbalanced leftovers stay unbalanced on purpose
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
    // Repair the two damage patterns models actually produce, independently and
    // then together: unescaped quotes inside values, and mismatched closers.
    try { return unwrap(JSON.parse(repairUnescapedQuotes(sliced))); } catch { /* fall through */ }
    try { return unwrap(JSON.parse(repairMismatchedBrackets(sliced))); } catch { /* fall through */ }
    try { return unwrap(JSON.parse(repairMismatchedBrackets(repairUnescapedQuotes(sliced)))); } catch { /* fall through */ }
  }
  try { return unwrap(JSON.parse(repairUnescapedQuotes(clean))); } catch { /* fall through */ }
  try { return unwrap(JSON.parse(repairMismatchedBrackets(repairUnescapedQuotes(clean)))); } catch { /* fall through */ }
  return null;
}

// Force a parsed turn into the shape the UI actually renders.
//
// Parsing is not enough: models intermittently invent a richer schema — most
// often `choices: [{choice, outcome:{...}}]` instead of plain strings. React then
// throws "Objects are not valid as a React child" and the app white-screens.
// Anything the UI renders as text must be guaranteed to BE text here.
function normalizeTurn(r) {
  if (!r || typeof r !== "object") return r;
  if (typeof r.story !== "string") r.story = r.story == null ? "" : String(r.story);
  if (Array.isArray(r.choices)) {
    r.choices = r.choices
      .map(c => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object") return c.choice || c.text || c.label || c.action || c.title || "";
        return c == null ? "" : String(c);
      })
      .filter(c => typeof c === "string" && c.trim());
  } else {
    r.choices = [];
  }
  return r;
}

// ─── Core call ──────────────────────────────────────────────────

// Build the request body for the user-key (direct OpenRouter) path.
// `useFallback` swaps `model` for the `models` array so OpenRouter picks
// the first one that responds.
// `json_object` only promises VALID JSON — not the right SHAPE. Models routinely
// returned choices as [{choice, outcome:{...}}] and npcs as nested objects under
// it, which crashed the UI. A strict json_schema makes the provider enforce the
// grammar: measured 8/8 well-formed and 0/8 shape violations, vs 4/8 and 4/8.
// Falls back to json_object when no schema is supplied (background calls).
function responseFormatFor(schema) {
  return schema ? { type: "json_schema", json_schema: schema } : { type: "json_object" };
}

function buildUserKeyBody(system, messages, maxTokens, useFallback, schema) {
  const body = {
    max_completion_tokens: maxTokens,
    messages:              [{ role: "system", content: system }, ...messages],
    response_format:       responseFormatFor(schema),
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
  let parseFailures = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch(OPENROUTER_ENDPOINT, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${key}`,
          "HTTP-Referer":  window.location.origin,
          "X-Title":       "Choose Your Adventure",
        },
        body:   JSON.stringify(buildUserKeyBody(system, messages, maxTokens, useFallback, opts.schema)),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      // AbortError = our timeout fired; treat as a slow-model retryable error
      if (e.name !== "AbortError") throw e;
      const elapsed = Date.now() - startMs;
      if (useFallback) throw new Error("All models timed out — please try again.");
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: true, attempt });
      continue;
    }
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data   = await resp.json();
      const raw    = data?.choices?.[0]?.message?.content || "";
      const result = extractJSON(raw);
      if (result) return normalizeTurn(result);
      // Unparseable. Never hand back the raw blob as story text — it would be
      // written into storyLog, re-serialized into history every turn, and
      // progressively corrupt the run. Retry instead: the usual cause is a
      // transient upstream failure that arrives as HTTP 200 with
      // finish_reason:"error" and content truncated mid-sentence, which the
      // status-code retry path above never sees.
      parseFailures++;
      if (parseFailures >= MAX_PARSE_FAILURES) throw new Error("Model returned malformed output — please try again.");
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round((Date.now() - startMs) / 1000), willFallback: true, attempt });
      continue;
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
  let parseFailures = 0;

  while (true) {
    attempt++;
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
    let resp;
    try {
      resp = await fetch("/api/proxy", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          max_completion_tokens: maxTokens,
          messages:              [{ role: "system", content: system }, ...messages],
          response_format:       responseFormatFor(opts.schema),
          useFallback,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name !== "AbortError") throw e;
      const elapsed = Date.now() - startMs;
      if (useFallback) throw new Error("All models timed out — please try again.");
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round(elapsed / 1000), willFallback: true, attempt });
      continue;
    }
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data   = await resp.json();
      const raw    = data?.choices?.[0]?.message?.content || "";
      const result = extractJSON(raw);
      if (result) return normalizeTurn(result);
      // See callWithKey — a malformed response must never reach storyLog, and
      // an HTTP 200 carrying finish_reason:"error" is retryable, not terminal.
      parseFailures++;
      if (parseFailures >= MAX_PARSE_FAILURES) throw new Error("Model returned malformed output — please try again.");
      useFallback = true;
      onRetry?.({ secsElapsed: Math.round((Date.now() - startMs) / 1000), willFallback: true, attempt });
      continue;
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
