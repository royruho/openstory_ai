// Standalone tester for the chapter-brief prompt — mirrors generateChapterBrief() in adventure.jsx.
import fs from "node:fs";
import path from "node:path";

const envText = fs.readFileSync(path.resolve(".env"), "utf8");
const KEY = envText.match(/OPENROUTER_KEY\s*=\s*(\S+)/)?.[1]?.trim();
if (!KEY) { console.error("OPENROUTER_KEY not found in .env"); process.exit(1); }

const MODEL = "google/gemini-2.0-flash-001";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const GENRE_LABELS = { fantasy: "fantasy", scifi: "sci-fi", reality: "modern reality", mystery: "mystery" };

function buildPrompt({ genre, chNum, total, character, skills = [], premise = "", summaryContext = "" }) {
  const genreLabel = GENRE_LABELS[genre] || "fantasy";
  const SYSTEM =
    `You are a story architect for an interactive ${genreLabel} adventure. ` +
    `Design a chapter brief with ONE concrete goal. The player explores freely and may hit dead ends.\n\n` +
    `RESPOND WITH VALID JSON ONLY — a single object (NOT an array), three fields, nothing else:\n` +
    `{\n` +
    `  "title": "evocative chapter title (3-6 words)",\n` +
    `  "goal": "ONE concrete, falsifiable objective. Must be one of: (a) a specific answer/truth to discover, (b) a specific artifact/object to obtain, or (c) a specific problem/situation to fix. Name WHAT is learned, obtained, or fixed — do not use vague verbs like 'investigate' or 'uncover' on their own. GOOD: 'Learn the true name of the cursed blacksmith.' / 'Recover the stolen signet ring from the thieves' guild.' / 'Restore power to the station's life-support core.' BAD: 'Investigate the village.' / 'Uncover the mystery.'",\n` +
    `  "obstacle": "2-3 sentences. Sentence 1: the specific challenge, threat, or complication blocking the goal — who/what opposes the player, and any key detail that makes the situation tricky. Sentence 2-3: the general approach the player will need to take to overcome it — broad strokes only, no specific steps or items. Keep it open-ended enough that the player has real choices."\n` +
    `}\n` +
    `Return ONLY the JSON object — no wrapping array, no markdown fences, no commentary.`;

  const parts = [
    `Chapter ${chNum} of ${total} in a ${genreLabel} adventure.`,
    `Character: ${character}${skills.length ? `, skilled in ${skills.join(", ")}` : ""}.`,
    premise ? `Premise: ${premise}` : "",
    summaryContext ? `Story so far: ${summaryContext}` : "This is the very beginning of the adventure.",
    `Design chapter ${chNum} of ${total}. ${chNum === 1 ? "This is the opening chapter — establish the world and first conflict." : chNum === total ? "This is the final chapter — converge all threads for a satisfying conclusion." : "Build on events so far, escalate stakes."}`,
  ].filter(Boolean);

  return { SYSTEM, user: parts.join("\n") };
}

async function generateBrief(scenario) {
  const { SYSTEM, user } = buildPrompt(scenario);
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${KEY}`,
      "HTTP-Referer": "http://localhost:5173",
      "X-Title": "Chapter Brief Tester",
    },
    body: JSON.stringify({
      model: MODEL,
      max_completion_tokens: 500,
      messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().catch(() => "")}`);
  const data = await resp.json();
  const raw = data?.choices?.[0]?.message?.content || "";
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  let parsed;
  try { parsed = JSON.parse(clean); } catch { return { raw }; }
  if (Array.isArray(parsed) && parsed[0]) parsed = parsed[0];
  return parsed;
}

const SCENARIOS = [
  { label: "Fantasy ch1 — default premise",
    genre: "fantasy", chNum: 1, total: 4, character: "Lyra",
    skills: ["swordplay", "tracking"],
    premise: "An ancient kingdom teeters on the edge of ruin as a forgotten evil stirs in the northern mountains." },

  { label: "Fantasy ch2 — mid-story",
    genre: "fantasy", chNum: 2, total: 4, character: "Lyra",
    skills: ["swordplay", "tracking"],
    premise: "An ancient kingdom teeters on the edge of ruin as a forgotten evil stirs in the northern mountains.",
    summaryContext: "Lyra reached the border village of Thorn's End, discovered the blacksmith was murdered, and found a cursed dagger pointing to the old watchtower." },

  { label: "Sci-fi ch1 — space station",
    genre: "scifi", chNum: 1, total: 2, character: "Nova",
    skills: ["hacking", "piloting"],
    premise: "A malfunctioning space station drifts toward a black hole while its crew uncovers a sinister conspiracy." },

  { label: "Mystery ch1 — locked room",
    genre: "mystery", chNum: 1, total: 4, character: "Victor",
    skills: ["observation", "deduction"],
    premise: "A locked-room murder at a remote estate — and every guest has something to hide." },

  { label: "Mystery ch4 — finale",
    genre: "mystery", chNum: 4, total: 4, character: "Victor",
    skills: ["observation", "deduction"],
    premise: "A locked-room murder at a remote estate — and every guest has something to hide.",
    summaryContext: "Victor narrowed the suspects to the butler and the doctor. A hidden ledger proved the victim was blackmailing three guests. A bloodied glove was found behind the greenhouse." },

  { label: "Reality ch1 — alley discovery",
    genre: "reality", chNum: 1, total: 2, character: "Maya",
    skills: ["street smarts", "photography"],
    premise: "A chance discovery in a city alley pulls an ordinary person into a web of dangerous secrets." },
];

(async () => {
  for (const s of SCENARIOS) {
    try {
      const brief = await generateBrief(s);
      console.log(`\n━━ ${s.label} ━━`);
      if (brief.title) {
        console.log(`  title:    ${brief.title}`);
        console.log(`  goal:     ${brief.goal}`);
        console.log(`  obstacle: ${brief.obstacle}`);
      } else {
        console.log(`  MALFORMED: ${JSON.stringify(brief).slice(0, 300)}`);
      }
    } catch (e) {
      console.log(`\n━━ ${s.label} ━━\n  FAILED: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
})();
