#!/usr/bin/env node
/**
 * Integration test: run a full story and validate every LLM response.
 *
 * Usage:
 *   node test/story-run.mjs
 *   node test/story-run.mjs --turns 20 --genre mystery --verbose
 *   node test/story-run.mjs --help
 *
 * Exit code 0 = all turns valid + story reached gameOver
 * Exit code 1 = any parse failure, schema violation, or story didn't end
 */

import fs   from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, "..");

// ── Load .env ────────────────────────────────────────────────────
const envPath = path.join(ROOT, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)/);
    if (m && !process.env[m[1].trim()])
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

// ── CLI args ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`Usage: node test/story-run.mjs [options]
  --turns N       Number of turns to run (default: 20)
  --genre GENRE   fantasy | scifi | reality | mystery (default: fantasy)
  --lang LANG     English | Hebrew | Arabic | Portuguese (default: English)
  --verbose       Print story text and choices each turn
  --save FILE     Save full results to JSON file`);
  process.exit(0);
}
const argVal  = (flag, def) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : def; };
const TURNS   = parseInt(argVal("--turns",  "20")) || 20;
const GENRE   = argVal("--genre",  "fantasy");
const LANG    = argVal("--lang",   "English");
const VERBOSE = args.includes("--verbose");
const SAVE    = argVal("--save", null);

const VALID_LANGS = new Set(["English", "Hebrew", "Arabic", "Portuguese"]);
if (!VALID_LANGS.has(LANG)) {
  console.error(`❌  Unknown language "${LANG}". Use: English | Hebrew | Arabic | Portuguese`);
  process.exit(1);
}

// ── Config ───────────────────────────────────────────────────────
const KEY      = process.env.OPENROUTER_KEY;
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const MODEL    = "google/gemini-2.0-flash-001";

const VALID_MOODS = new Set([
  "peaceful", "tense", "action", "dramatic",
  "sad", "triumphant", "mysterious", "neutral",
]);

if (!KEY) {
  console.error("❌  OPENROUTER_KEY not set in .env");
  process.exit(1);
}

// ── extractJSON — identical to frontend/src/api.js ───────────────
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

// ── Schema validator ─────────────────────────────────────────────
function validateResult(r) {
  const errs = [];
  if (typeof r.story !== "string" || !r.story.trim())
    errs.push("story missing/empty");
  if (!Array.isArray(r.choices))
    errs.push("choices not an array");
  if (typeof r.gameOver !== "boolean")
    errs.push("gameOver not boolean");
  if (typeof r.gameOverReason !== "string")
    errs.push("gameOverReason not string");
  if (typeof r.rollRequired !== "boolean")
    errs.push("rollRequired not boolean");
  if (typeof r.rollContext !== "string")
    errs.push("rollContext not string");
  if (typeof r.chapterComplete !== "boolean")
    errs.push("chapterComplete not boolean");
  if (!r.chapterProgress
      || !Array.isArray(r.chapterProgress.achieved)
      || !Array.isArray(r.chapterProgress.clues))
    errs.push("chapterProgress malformed");
  if (r.mood !== undefined && !VALID_MOODS.has(r.mood))
    errs.push(`invalid mood "${r.mood}"`);
  if (!r.gameOver && Array.isArray(r.choices) && r.choices.length === 0)
    errs.push("empty choices array before gameOver");
  if (Array.isArray(r.choices) && r.choices.length > 5)
    errs.push(`too many choices (${r.choices.length})`);
  return errs;
}

// ── Language-aware prompt helpers ────────────────────────────────
function buildPerspectiveLine(lang) {
  if (lang === "Hebrew")
    return 'כתוב בגוף שני. השתמש ב"אתה", "שלך". דוגמה: "אתה שולף את חרבך וצועד אל החשיכה."';
  if (lang === "Arabic")
    return 'اكتب بضمير المخاطب. استخدم "أنت"، "لك". مثال: "تسلّ سيفك وتخطو نحو الظلام."';
  if (lang === "Portuguese")
    return 'Escreva em SEGUNDA PESSOA. Use "você", "seu/sua". Exemplo: "Você desembainha sua espada e avança para a escuridão."';
  return 'Write in SECOND PERSON. Use "you", "your". Example: "You draw your sword and step into the dark."';
}

// ── System prompt ─────────────────────────────────────────────────
const SYSTEM = `You are the narrator of an interactive ${GENRE} adventure game.

LANGUAGE: Respond ENTIRELY in ${LANG}. ALL story text and choices must be in ${LANG}.
PERSPECTIVE: ${buildPerspectiveLine(LANG)}
CHARACTER: Name: Alex, Gender: male, Age: 28, Appearance: athletic build, dark short hair, a scar on the left cheek, Skills: Swordsmanship, Stealth

CONTENT: Content for ages 13+. Moderate action OK. Light tension fine.
LENGTH: 1-2 sentences per beat.
DEATH IS NOT POSSIBLE. Failures redirect the story.
STORY ARC: Progress naturally toward a satisfying conclusion over approximately ${TURNS} turns. When the final chapter goal is conclusively achieved, set gameOver:true.

RESPOND WITH VALID JSON ONLY (no markdown fences):
{"story":"...","choices":["...","..."],"gameOver":false,"gameOverReason":"","rollRequired":false,"rollContext":"","chapterComplete":false,"chapterProgress":{"achieved":[],"clues":[]},"mood":"neutral"}

rollRequired: true when the next action has meaningful risk (combat, stealth, persuasion).
rollContext: Short phrase shown before rolling (e.g. "pick the lock").
chapterComplete: true when a major story goal is conclusively achieved.
chapterProgress: cumulative — carry forward achieved milestones and clues, add new ones each turn.
mood: One of: peaceful, tense, action, dramatic, sad, triumphant, mysterious, neutral.
Provide 2–4 meaningfully different choices each turn. When gameOver:true, choices may be empty.`;

// ── API call (with basic 429 retry) ──────────────────────────────
async function callAPI(messages, attempt = 0) {
  const resp = await fetch(ENDPOINT, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${KEY}`,
      "HTTP-Referer":  "https://choose-your-adventure.vercel.app",
      "X-Title":       "Integration Test",
    },
    body: JSON.stringify({
      model:                 MODEL,
      max_completion_tokens: 900,
      messages:              [{ role: "system", content: SYSTEM }, ...messages],
      response_format:       { type: "json_object" },
    }),
  });

  if (resp.status === 429 && attempt < 2) {
    const wait = 6000 * (attempt + 1);
    process.stdout.write(`  [rate-limited, retrying in ${wait / 1000}s] `);
    await new Promise(r => setTimeout(r, wait));
    return callAPI(messages, attempt + 1);
  }
  if (!resp.ok) {
    const txt = await resp.text().catch(() => resp.statusText);
    throw new Error(`HTTP ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ── Human-readable transcript ─────────────────────────────────────
function buildTextReport(turnLog, storyEnded, failCount) {
  const div  = "═".repeat(70);
  const sep  = "─".repeat(70);
  const lines = [];

  lines.push(div);
  lines.push(`  Story Integration Test — genre: ${GENRE}, lang: ${LANG}, ${turnLog.length} turns`);
  lines.push(`  Model : ${MODEL}`);
  lines.push(`  Date  : ${new Date().toLocaleString()}`);
  lines.push(`  Story ended: ${storyEnded ? "YES (gameOver:true)" : "NO (turn limit)"}`);
  lines.push(`  Issues: ${failCount}`);
  lines.push(div);
  lines.push("");
  lines.push("SYSTEM PROMPT:");
  lines.push(sep);
  lines.push(SYSTEM);
  lines.push("");

  for (const entry of turnLog) {
    lines.push(div);
    const status = entry.ok ? "✅ OK" : `❌ FAIL`;
    const mood   = entry.result?.mood ?? "—";
    lines.push(`TURN ${entry.turn}  ${status}  mood: ${mood}  (${entry.elapsed})`);
    if (!entry.ok && entry.errors?.length) lines.push(`  Issues: ${entry.errors.join("; ")}`);
    lines.push(sep);

    // Last user message sent this turn
    const userMsg = [...(entry.sent ?? [])].reverse().find(m => m.role === "user");
    lines.push("USER:");
    lines.push(userMsg?.content ?? "(none)");
    lines.push("");

    if (entry.result) {
      lines.push("LLM:");
      lines.push(entry.result.story ?? "(no story)");
      lines.push("");
      if (entry.result.choices?.length) {
        lines.push("CHOICES:");
        entry.result.choices.forEach((c, i) => lines.push(`  ${i + 1}. ${c}`));
      }
      if (entry.result.rollRequired) lines.push(`\nROLL REQUIRED: ${entry.result.rollContext}`);
      if (entry.result.chapterComplete) lines.push("\n*** CHAPTER COMPLETE ***");
      if (entry.result.gameOver) lines.push(`\n*** GAME OVER: ${entry.result.gameOverReason} ***`);
    } else {
      lines.push("LLM (raw — parse failed):");
      lines.push(entry.rawResponse ?? "(empty)");
    }
    lines.push("");
  }

  lines.push(div);
  lines.push(`END OF TRANSCRIPT — ${failCount === 0 && storyEnded ? "PASSED" : "FAILED"}`);
  lines.push(div);
  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────
async function run() {
  const bar = "─".repeat(72);
  console.log(`\n🎮  Story Integration Test`);
  console.log(`    Model : ${MODEL}`);
  console.log(`    Genre : ${GENRE}   |   Lang : ${LANG}   |   Turns : ${TURNS}`);
  console.log(bar);
  console.log("Turn  Result     Mood           Ch?  Roll?  Choices  GameOver");
  console.log(bar);

  const messages  = [];
  const turnLog   = [];
  let storyEnded  = false;
  let failCount   = 0;

  // Opening message
  messages.push({ role: "user", content:
    `Begin the adventure with a brief 2-sentence opening covering Alex's background and the current situation. End with 2–4 choices.`
  });

  for (let turn = 1; turn <= TURNS; turn++) {
    const tStart = Date.now();
    let raw = "";
    try {
      raw = await callAPI(messages);
    } catch (err) {
      const entry = { turn, ok: false, error: `API error: ${err.message}` };
      turnLog.push(entry);
      failCount++;
      console.log(`  ${String(turn).padStart(2)}  ❌ API ERR  ${" ".repeat(28)} ${err.message.slice(0, 40)}`);
      break;
    }

    const elapsed = ((Date.now() - tStart) / 1000).toFixed(1) + "s";
    const result  = extractJSON(raw);

    if (!result) {
      const snippet = raw.slice(0, 100).replace(/\n/g, " ");
      const sentMessages = [{ role: "system", content: SYSTEM }, ...messages];
      const entry = { turn, ok: false, error: "JSON parse failed", sent: sentMessages, rawResponse: raw, elapsed };
      turnLog.push(entry);
      failCount++;
      console.log(`  ${String(turn).padStart(2)}  ❌ PARSE    raw: ${snippet}`);
      // Still advance with the raw text so subsequent turns aren't stuck
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: `Player chose: "Continue"` });
      continue;
    }

    const errors = validateResult(result);
    const ok     = errors.length === 0;
    if (!ok) failCount++;

    const icon    = ok ? "✅" : "⚠️ ";
    const label   = ok ? "OK      " : `WARN(${errors.length})`;
    const mood    = (result.mood || "—").padEnd(13);
    const chap    = result.chapterComplete ? "yes" : " no";
    const roll    = result.rollRequired    ? "yes" : " no";
    const choices = String(result.choices?.length ?? "?").padStart(3);
    const over    = result.gameOver ? "true " : "false";
    const note    = errors.length ? `  ← ${errors.join("; ")}` : "";

    console.log(`  ${String(turn).padStart(2)}  ${icon} ${label}  ${mood}  ${chap}   ${roll}    ${choices}      ${over}  (${elapsed})${note}`);

    if (VERBOSE) {
      console.log(`\n       Story: ${result.story.slice(0, 120).replace(/\n/g, " ")}…`);
      if (result.choices?.length)
        result.choices.forEach((c, i) => console.log(`       [${i + 1}] ${c}`));
      console.log();
    }

    // Snapshot the messages sent this turn (system prompt + conversation so far)
    const sentMessages = [{ role: "system", content: SYSTEM }, ...messages];
    turnLog.push({ turn, ok, errors, elapsed, sent: sentMessages, rawResponse: raw, result });

    // Advance conversation history (keep it lean — no full story text)
    messages.push({ role: "assistant", content: JSON.stringify({
      story: result.story, choices: result.choices,
    })});

    if (result.gameOver) {
      storyEnded = true;
      console.log(`\n     📖 Story ended: "${result.gameOverReason || "(no reason given)"}"`);
      break;
    }

    // Phase hint appended to next user message to mirror the app's CLIMAX/FINALE pacing
    let phaseHint = "";
    const remaining = TURNS - turn;
    if (remaining === 0) {
      phaseHint = "\n\n[STORY PHASE: FINALE — This is the last turn. Deliver a satisfying conclusion and set gameOver:true.]";
    } else if (remaining === 1) {
      phaseHint = "\n\n[STORY PHASE: CLIMAX — Bring all threads to a head. Next turn will be the finale.]";
    } else if (remaining <= Math.ceil(TURNS * 0.2)) {
      phaseHint = `\n\n[STORY PHASE: LATE — ${remaining} turns remaining. Push toward the climax.]`;
    }

    if (result.choices?.length > 0) {
      messages.push({ role: "user", content: `Player chose: "${result.choices[0]}"${phaseHint}` });
    } else {
      messages.push({ role: "user", content: `Player chose: "Continue"${phaseHint}` });
    }

    // Brief pause to avoid hammering the API
    if (turn < TURNS) await new Promise(r => setTimeout(r, 500));
  }

  // ── Summary ──────────────────────────────────────────────────────
  const totalTurns = turnLog.length;
  const passed     = turnLog.filter(r => r.ok).length;
  console.log("\n" + bar);
  console.log(`Turns run : ${totalTurns}  |  Valid: ${passed}  |  Issues: ${failCount}`);
  console.log(`Story end : ${storyEnded ? "✅  gameOver:true received" : "⚠️   turn limit reached without gameOver"}`);

  if (failCount > 0) {
    console.log("\nTurns with issues:");
    turnLog.filter(r => !r.ok).forEach(r =>
      console.log(`  Turn ${r.turn}: ${r.error ?? r.errors?.join("; ")}`));
  }

  const passed_overall = failCount === 0 && storyEnded;
  console.log(passed_overall ? "\n✅  PASSED\n" : "\n❌  FAILED\n");

  if (SAVE) {
    // JSON — full machine-readable data
    fs.writeFileSync(SAVE, JSON.stringify({ genre: GENRE, turns: TURNS, storyEnded, failCount, turnLog }, null, 2));
    console.log(`Results saved to ${SAVE}`);

    // TXT — human-readable conversation transcript
    const txtPath = SAVE.replace(/\.json$/i, "") + ".txt";
    fs.writeFileSync(txtPath, buildTextReport(turnLog, storyEnded, failCount));
    console.log(`Transcript saved to ${txtPath}`);
  }

  process.exit(passed_overall ? 0 : 1);
}

run().catch(err => { console.error("Fatal:", err); process.exit(1); });
