#!/usr/bin/env node
/**
 * Probe primary + fallback models with the actual game JSON contract,
 * then run each response through the live `extractJSON` parser to see
 * whether the parser needs adjustments.
 *
 * Usage:  node test/fallback-models.mjs
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");

const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m && !process.env[m[1].trim()])
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const KEY      = process.env.OPENROUTER_KEY;
if (!KEY) { console.error("Missing OPENROUTER_KEY"); process.exit(1); }
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  { id: "google/gemini-2.0-flash-001",        label: "primary  " },
  { id: "google/gemini-2.5-flash",            label: "fallback1" },
  { id: "meta-llama/llama-3.3-70b-instruct",  label: "fallback2" },
];

// ── Verbatim copy of frontend/src/api.js extractJSON ────────────────
function extractJSON(raw) {
  if (!raw) return null;
  const clean = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json/g, "").replace(/```/g, "").trim();
  try { return JSON.parse(clean); } catch { /* fall through */ }
  const start = clean.indexOf("{");
  const end   = clean.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)); } catch { /* fall through */ }
  }
  return null;
}

// ── Realistic game system prompt + first-turn user message ──────────
const GAME_SYSTEM = `You are running a fantasy choose-your-own-adventure for a player in 3rd person past tense.
CHARACTER: Aria, female, 22, slim with auburn hair, skills: [Swordsmanship, Stealth].
TRACK STATS: Always return a "stats" object with the updated values. Current state — health: 100/100, inventory: [], relationships: {}.
SKILLS: When situations relate to character skills, acknowledge the skill and give more favorable outcomes.
PREMISE: A traveler arrives at a village whose well has gone dry overnight.

STORY ARC: OPENING — Establish world, character, inciting situation.

RESPOND WITH VALID JSON ONLY (no markdown fences):
{"story":"...","choices":["...","...","..."],"stats":{"health":100,"inventory":[],"relationships":{}},"gameOver":false,"gameOverReason":"","rollRequired":false,"rollContext":"","chapterComplete":false,"chapterProgress":{"achieved":[],"clues":[]},"mood":"neutral"}

rollRequired: true when next action has meaningful risk (combat, stealth, locks, persuasion). False for safe/narrative choices.
rollContext: Short phrase shown to player before rolling.
chapterComplete: true ONLY when the single chapter goal is conclusively achieved.
chapterProgress: Update every turn — achieved + clues, cumulative, carry forward.
mood: One of: peaceful, tense, action, dramatic, sad, triumphant, mysterious, neutral.
Provide 2-5 meaningfully different choices.`;

const GAME_USER = "Begin the adventure.";

// ── Per-word translation call — much smaller schema ─────────────────
const WORD_SYSTEM = `You are a precise translator. Translate the SINGLE word the user provides into Portuguese, using the short context to pick the correct sense. Lowercase output unless it is a proper noun. RESPOND WITH VALID JSON ONLY: {"t":"the translation"}`;
const WORD_USER   = JSON.stringify({ w: "bank", c: "sat on the bank of the river" });

// ── Required-field schema for the game turn ─────────────────────────
const REQUIRED_FIELDS = ["story", "choices", "gameOver"];
const OPTIONAL_FIELDS = ["stats", "rollRequired", "rollContext", "chapterComplete", "chapterProgress", "mood", "gameOverReason"];

async function callModel(model, system, user, maxTokens) {
  const t0 = Date.now();
  const resp = await fetch(ENDPOINT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${KEY}`,
      "HTTP-Referer":  "https://openstory-ai.vercel.app",
      "X-Title":       "OpenStory AI fallback test",
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user",   content: user   },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const ms   = Date.now() - t0;
  const body = await resp.text();
  let data; try { data = JSON.parse(body); } catch { data = null; }
  return { status: resp.status, ms, data, body };
}

function inspectGameTurn(parsed) {
  if (!parsed) return { ok: false, reason: "extractJSON returned null" };
  const missing = REQUIRED_FIELDS.filter(f => !(f in parsed));
  if (missing.length) return { ok: false, reason: `missing required: ${missing.join(", ")}` };
  if (!Array.isArray(parsed.choices)) return { ok: false, reason: "choices is not an array" };
  const optionalPresent = OPTIONAL_FIELDS.filter(f => f in parsed);
  return { ok: true, optionalPresent };
}

const sep = "─".repeat(72);

async function probeGameTurn() {
  console.log("\n" + sep);
  console.log("  GAME TURN — full system prompt + JSON contract (max 2000 tokens)");
  console.log(sep);
  for (const m of MODELS) {
    process.stdout.write(`\n[${m.label}]  ${m.id}\n`);
    let r;
    try { r = await callModel(m.id, GAME_SYSTEM, GAME_USER, 2000); }
    catch (e) { console.log(`  ERROR  network: ${e.message}`); continue; }
    console.log(`  status   ${r.status}  in ${r.ms}ms`);
    if (r.status !== 200) {
      console.log(`  body     ${r.body.slice(0, 200)}`);
      continue;
    }
    const raw = r.data?.choices?.[0]?.message?.content || "";
    console.log(`  raw len  ${raw.length} chars`);
    console.log(`  raw[0:80]  ${JSON.stringify(raw.slice(0, 80))}`);
    console.log(`  raw[-80:]  ${JSON.stringify(raw.slice(-80))}`);
    const parsed = extractJSON(raw);
    const inspect = inspectGameTurn(parsed);
    if (inspect.ok) {
      console.log(`  PARSE OK   choices=${parsed.choices.length}  story=${(parsed.story || "").length} chars`);
      console.log(`  optional   ${inspect.optionalPresent.join(", ") || "(none)"}`);
      console.log(`  story[0:120]  ${JSON.stringify((parsed.story || "").slice(0, 120))}`);
    } else {
      console.log(`  PARSE FAIL  ${inspect.reason}`);
      console.log(`  raw full →\n${raw}\n`);
    }
  }
}

async function probeWordCall() {
  console.log("\n" + sep);
  console.log("  PER-WORD TRANSLATION — tiny schema (max 30 tokens)");
  console.log(sep);
  for (const m of MODELS) {
    process.stdout.write(`\n[${m.label}]  ${m.id}\n`);
    let r;
    try { r = await callModel(m.id, WORD_SYSTEM, WORD_USER, 30); }
    catch (e) { console.log(`  ERROR  network: ${e.message}`); continue; }
    console.log(`  status   ${r.status}  in ${r.ms}ms`);
    if (r.status !== 200) {
      console.log(`  body     ${r.body.slice(0, 200)}`);
      continue;
    }
    const raw = r.data?.choices?.[0]?.message?.content || "";
    console.log(`  raw      ${JSON.stringify(raw)}`);
    const parsed = extractJSON(raw);
    if (parsed && typeof parsed.t === "string") {
      console.log(`  PARSE OK   t = ${JSON.stringify(parsed.t)}`);
    } else {
      console.log(`  PARSE FAIL  parsed=${JSON.stringify(parsed)}`);
    }
  }
}

(async () => {
  await probeGameTurn();
  await probeWordCall();
  console.log("\n" + sep + "\n");
})();
