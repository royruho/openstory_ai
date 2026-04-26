const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL    = "deepseek/deepseek-v4-flash";
// Fallback chain used only when the caller sets `useFallback: true` (after a
// 20-second window of 429/503 retries on the primary). Order = priority.
const FALLBACK_MODELS     = [
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-flash",
];
const MAX_TOKENS_CAP      = 2000;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (origin === "http://localhost:5173") return true;
  if (process.env.ALLOWED_ORIGIN && origin === process.env.ALLOWED_ORIGIN) return true;
  // Accept both legacy and new Vercel project names
  if (/^https:\/\/choose-your-adventure[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  if (/^https:\/\/openstory-ai[a-z0-9-]*\.vercel\.app$/.test(origin)) return true;
  return false;
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || "";

  if (req.method === "OPTIONS") {
    if (!isAllowedOrigin(origin)) return res.status(403).end();
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const key = process.env.OPENROUTER_KEY;
  if (!key) {
    return res.status(503).json({ error: "Service not configured" });
  }

  const body = req.body;

  if (!body?.messages || !Array.isArray(body.messages)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  body.max_completion_tokens = Math.min(
    body.max_completion_tokens || MAX_TOKENS_CAP,
    MAX_TOKENS_CAP
  );

  // Caller cannot pick the model — the proxy locks both the primary and the
  // fallback chain server-side. The only choice the caller has is whether to
  // use the fallback chain (after exhausting retries on the primary).
  const useFallback = body.useFallback === true;
  delete body.useFallback;
  delete body.models;
  if (useFallback) {
    delete body.model;
    body.models = [OPENROUTER_MODEL, ...FALLBACK_MODELS];
  } else {
    body.model = OPENROUTER_MODEL;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const upstream = await fetch(OPENROUTER_ENDPOINT, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type":  "application/json",
        "HTTP-Referer":  "https://openstory-ai.vercel.app",
        "X-Title":       "OpenStory AI",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Model response timed out — please try again." });
    }
    return res.status(502).json({ error: "Upstream error" });
  } finally {
    clearTimeout(timeout);
  }
};
