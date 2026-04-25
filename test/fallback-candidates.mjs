#!/usr/bin/env node
// Probe several candidate fallback models — find one that exists, is cheap,
// and returns clean JSON for the game-turn schema.

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
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const CANDIDATES = [
  "google/gemini-flash-1.5",
  "google/gemini-2.0-flash-lite-001",
  "google/gemini-2.5-flash",
  "mistralai/mistral-nemo",
  "mistralai/mistral-small-3.1-24b-instruct",
  "openai/gpt-4o-mini",
  "qwen/qwen-2.5-72b-instruct",
  "anthropic/claude-3.5-haiku",
];

const SYSTEM = `Output JSON only. Schema: {"story":"one sentence","choices":["a","b"]}.`;
const USER   = "Hero enters a tavern.";

function extractJSON(raw) {
  if (!raw) return null;
  const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```json/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch {}
  const a = clean.indexOf("{"), b = clean.lastIndexOf("}");
  if (a !== -1 && b > a) { try { return JSON.parse(clean.slice(a, b + 1)); } catch {} }
  return null;
}

for (const id of CANDIDATES) {
  const t0 = Date.now();
  let r;
  try {
    r = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KEY}`, "HTTP-Referer": "https://openstory-ai.vercel.app", "X-Title": "OpenStory AI" },
      body: JSON.stringify({
        model: id, max_completion_tokens: 200,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: USER }],
        response_format: { type: "json_object" },
      }),
    });
  } catch (e) { console.log(`${id.padEnd(50)}  network: ${e.message}`); continue; }
  const ms = Date.now() - t0;
  const body = await r.text();
  if (r.status !== 200) {
    let msg = body.slice(0, 120);
    try { const j = JSON.parse(body); msg = j?.error?.message || msg; } catch {}
    console.log(`${id.padEnd(50)}  ${r.status}  ${msg}`);
    continue;
  }
  let data = JSON.parse(body);
  const raw = data?.choices?.[0]?.message?.content || "";
  const parsed = extractJSON(raw);
  const ok = parsed && typeof parsed.story === "string" && Array.isArray(parsed.choices);
  console.log(`${id.padEnd(50)}  200  ${ms}ms  parse=${ok ? "OK" : "FAIL"}  raw=${JSON.stringify(raw).slice(0, 80)}`);
}
