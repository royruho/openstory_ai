// Standalone tester for the chapter-brief prompt — mirrors generateChapterBrief() in adventure.jsx.
import fs from "node:fs";
import path from "node:path";

const envText = fs.readFileSync(path.resolve(".env"), "utf8");
const KEY = envText.match(/OPENROUTER_KEY\s*=\s*(\S+)/)?.[1]?.trim();
if (!KEY) { console.error("OPENROUTER_KEY not found in .env"); process.exit(1); }

const MODEL = "google/gemini-2.5-flash";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const GENRE_LABELS = { fantasy: "fantasy", scifi: "sci-fi", reality: "modern reality", mystery: "mystery" };

function buildPrompt({ genre, chNum, total, character, skills = [], premise = "", summaryContext = "" }) {
  const genreLabel = GENRE_LABELS[genre] || "fantasy";
  const SYSTEM =
    `You are a story architect for an interactive ${genreLabel} adventure. ` +
    `Design ONE concrete situation the player must solve to finish this chapter, and decide NOW how it can be solved.\n\n` +
    `RESPOND WITH VALID JSON ONLY — a single object (NOT an array), four fields, nothing else:\n` +
    `{\n` +
    `  "title": "evocative chapter title (3-6 words)",\n` +
    `  "situation": "1-2 sentences. A specific, concrete predicament facing the player RIGHT NOW — who or what opposes them, here, in this place. Not a theme or a quest description: a scene. The player is stuck in it until they solve it.",\n` +
    `  "winCondition": "ONE sentence naming the objectively checkable state of the world that ends this situation. It must be answerable yes/no by looking at the world — e.g. 'Aran is inside the city walls', 'The identity of the traitor is spoken aloud to Aran', 'The seal is in Aran's hands'. NEVER use vague verbs like 'investigate', 'explore', 'confront' or 'uncover' on their own — name the end STATE, not the activity.",\n` +
    `  "approaches": ["2-4 genuinely different ways the player could reach the win condition. Each must be concrete and actually workable in this situation. These are hidden from the player — they are a sanity check that the situation is solvable at all, and a menu of hints."]\n` +
    `}\n` +
    `The situation and the winCondition must match: solving the situation MUST be exactly what the winCondition describes.\n` +
    `Return ONLY the JSON object — no wrapping array, no markdown fences, no commentary.`;

  const parts = [
    `Chapter ${chNum} of ${total} in a ${genreLabel} adventure.`,
    `Character: ${character}${skills.length ? `, skilled in ${skills.join(", ")}` : ""}.`,
    premise ? `Premise: ${premise}` : "",
    summaryContext ? `Story so far: ${summaryContext}` : "This is the very beginning of the adventure.",
    `Design chapter ${chNum} of ${total}. ${chNum === 1 ? "This is the opening chapter — establish the world and the first concrete predicament." : chNum === total ? "This is the final chapter — its situation resolves the whole story." : "Build on events so far, escalate stakes."}`,
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
      max_completion_tokens: 700,
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
        const ap = Array.isArray(brief.approaches) ? brief.approaches : [];
        // Mirrors the validation in generateChapterBrief: a brief without a
        // checkable winCondition and at least one approach is unusable.
        const ok = brief.situation && brief.winCondition && ap.length >= 1;
        console.log(`  ${ok ? "valid" : "*** INVALID SHAPE ***"}`);
        console.log(`  title:        ${brief.title}`);
        console.log(`  situation:    ${brief.situation}`);
        console.log(`  winCondition: ${brief.winCondition}`);
        ap.forEach((a, i) => console.log(`  approach ${i + 1}:   ${a}`));
      } else {
        console.log(`  MALFORMED: ${JSON.stringify(brief).slice(0, 300)}`);
      }
    } catch (e) {
      console.log(`\n━━ ${s.label} ━━\n  FAILED: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 800));
  }
})();
