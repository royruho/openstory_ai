#!/usr/bin/env node
// Probe DeepSeek and Qwen candidate models with a Hebrew game-turn prompt.
// Reports: HTTP status, latency, parse result, and a snippet of the Hebrew output.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");
const envPath   = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}
const KEY      = process.env.OPENROUTER_KEY;
if (!KEY) { console.error("Missing OPENROUTER_KEY"); process.exit(1); }
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const CANDIDATES = [
  // DeepSeek chat/v3 variants (cheap, non-reasoning)
  "deepseek/deepseek-chat",
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-chat-v3.1",
  "deepseek/deepseek-v3.1-terminus",
  "deepseek/deepseek-v3.2",
  "deepseek/deepseek-v3.2-exp",
  // DeepSeek v4 (newest)
  "deepseek/deepseek-v4-flash",
  "deepseek/deepseek-v4-pro",
  // DeepSeek R1 distills (reasoning but cheaper)
  "deepseek/deepseek-r1-distill-llama-70b",
  "deepseek/deepseek-r1-distill-qwen-32b",
];

const SYSTEM = `אתה מספר של משחק הרפתקאות אינטראקטיבי בעברית. ענה אך ורק בעברית.
RESPOND WITH VALID JSON ONLY (no markdown fences):
{"story":"...","choices":["...","...","..."],"gameOver":false,"gameOverReason":"","rollRequired":false,"rollContext":"","chapterComplete":false,"chapterProgress":{"achieved":[],"clues":[]},"mood":"neutral"}`;

const USER = 'התחל את ההרפתקה. הגיבור מגיע לכפר קטן ביער.';

function extractJSON(raw) {
  if (!raw) return null;
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json/g, "").replace(/```/g, "").trim();
  const unwrap = (v) => (Array.isArray(v) && v.length === 1 && typeof v[0] === "object") ? v[0] : v;
  try { return unwrap(JSON.parse(clean)); } catch { /* fall through */ }
  const start = clean.indexOf("{"), end = clean.lastIndexOf("}");
  if (start !== -1 && end > start) { try { return unwrap(JSON.parse(clean.slice(start, end + 1))); } catch {} }
  return null;
}

const sep = "─".repeat(70);
console.log("\n" + sep);
console.log("  Hebrew game-turn probe — DeepSeek / Qwen candidates");
console.log(sep);

for (const model of CANDIDATES) {
  process.stdout.write(`\n[${model}]\n`);
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${KEY}`,
        "HTTP-Referer":  "https://openstory-ai.vercel.app",
        "X-Title":       "OpenStory AI hebrew test",
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 600,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user",   content: USER   },
        ],
        response_format: { type: "json_object" },
      }),
    });
  } catch (e) { console.log(`  ERROR  network: ${e.message}`); continue; }

  const ms   = Date.now() - t0;
  const body = await r.text();
  if (r.status !== 200) {
    let msg = body.slice(0, 150);
    try { const j = JSON.parse(body); msg = j?.error?.message || msg; } catch {}
    console.log(`  status  ${r.status}  (${ms}ms)`);
    console.log(`  error   ${msg}`);
    continue;
  }

  let data; try { data = JSON.parse(body); } catch { data = null; }
  const raw    = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJSON(raw);
  const ok     = parsed && typeof parsed.story === "string" && Array.isArray(parsed.choices);

  console.log(`  status  200  (${ms}ms)`);
  console.log(`  parse   ${ok ? "OK" : "FAIL"}`);
  if (ok) {
    console.log(`  story   ${JSON.stringify(parsed.story.slice(0, 100))}`);
    console.log(`  choices ${parsed.choices.length}x — ${JSON.stringify(parsed.choices[0]?.slice(0, 60))}`);
  } else {
    console.log(`  raw     ${JSON.stringify(raw.slice(0, 150))}`);
  }
}

console.log("\n" + sep + "\n");
