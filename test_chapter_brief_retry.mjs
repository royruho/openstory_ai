import fs from "node:fs";
import path from "node:path";

const envText = fs.readFileSync(path.resolve(".env"), "utf8");
const KEY = envText.match(/OPENROUTER_KEY\s*=\s*(\S+)/)?.[1]?.trim();

const MODEL = "google/gemini-2.0-flash-001";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const GENRE_LABELS = { fantasy: "fantasy", scifi: "sci-fi", reality: "modern reality", mystery: "mystery" };

function buildPrompt({ genre, chNum, total, character, skills = [], premise = "", summaryContext = "" }) {
  const genreLabel = GENRE_LABELS[genre] || "fantasy";
  const SYSTEM =
    `You are a story architect for an interactive ${genreLabel} adventure. ` +
    `Design a short chapter brief. The player explores freely and may hit dead ends. ` +
    `RESPOND WITH VALID JSON ONLY — three fields, nothing else:\n` +
    `{"title":"evocative chapter title (3-6 words)","goal":"ONE overarching objective — describe what to achieve, not specific items or steps (e.g. 'Prove your worth to the wizard scout', NOT 'Collect herb A, herb B, and herb C')","obstacle":"the main force or challenge blocking the goal (one sentence)"}`;

  const parts = [
    `Chapter ${chNum} of ${total} in a ${genreLabel} adventure.`,
    `Character: ${character}${skills.length ? `, skilled in ${skills.join(", ")}` : ""}.`,
    premise ? `Premise: ${premise}` : "",
    summaryContext ? `Story so far: ${summaryContext}` : "This is the very beginning of the adventure.",
    `Design chapter ${chNum} of ${total}. ${chNum === 1 ? "This is the opening chapter — establish the world and first conflict." : chNum === total ? "This is the final chapter — converge all threads for a satisfying conclusion." : "Build on events so far, escalate stakes."}`,
  ].filter(Boolean);
  return { SYSTEM, user: parts.join("\n") };
}

async function run(scenario, attempts = 3) {
  const { SYSTEM, user } = buildPrompt(scenario);
  for (let i = 1; i <= attempts; i++) {
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
        max_completion_tokens: 300,
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: user }],
        response_format: { type: "json_object" },
      }),
    });
    const data = await resp.json();
    const raw = data?.choices?.[0]?.message?.content || "";
    console.log(`\n── ${scenario.label} — attempt ${i} ──`);
    console.log("RAW:", JSON.stringify(raw));
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(clean);
      console.log("  title:   ", parsed.title);
      console.log("  goal:    ", parsed.goal);
      console.log("  obstacle:", parsed.obstacle);
      return;
    } catch (e) {
      console.log("  parse error:", e.message);
    }
    await new Promise(r => setTimeout(r, 600));
  }
}

const S = [
  { label: "Sci-fi ch1 — space station",
    genre: "scifi", chNum: 1, total: 2, character: "Nova",
    skills: ["hacking", "piloting"],
    premise: "A malfunctioning space station drifts toward a black hole while its crew uncovers a sinister conspiracy." },
  { label: "Reality ch1 — alley discovery",
    genre: "reality", chNum: 1, total: 2, character: "Maya",
    skills: ["street smarts", "photography"],
    premise: "A chance discovery in a city alley pulls an ordinary person into a web of dangerous secrets." },
];

(async () => { for (const s of S) await run(s); })();
