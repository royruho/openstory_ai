# CLAUDE.md — Project Guide for Claude Code

This file tells Claude Code everything it needs to know to work effectively in this repository.

---

## What this project is

An AI-powered choose-your-own-adventure game with three modes, a chapter-based structure, and dice-roll fate checks.

- **Frontend**: React + Vite (`frontend/`) — static, deployed on Vercel.
- **Proxy**: Vercel serverless function (`api/proxy.js`) — holds the preloaded OpenRouter key server-side, never exposed to the browser.
- **AI**: OpenRouter. Primary `google/gemini-2.5-flash`, fallback `deepseek/deepseek-chat`. First 20 turns use the app's preloaded key (free to the player). Turn 20+ prompts the player for their own OpenRouter key.
- **Save/Load**: File-based (JSON files on the user's machine). No server-side persistence.
- **There is no backend and no database.** Everything runs in the browser plus the one serverless proxy function.

### Freemium model

```
Turns 1–19  → frontend calls /api/proxy (server holds OPENROUTER_KEY, hidden from browser)
Turn 20+    → modal prompts player for their own OpenRouter key
            → stored in localStorage("openrouter_key"), used directly from browser
```

`FREE_TURN_LIMIT = 20` in `frontend/src/api.js`.

### App phases

```
phase = "home"  (no login/key required to start; picks mode + language)
  ├── Start New Adventure → phase = "setup" → phase = "game"
  └── Load Saved Adventure → file picker → phase = "game"

At turn 20, if no user key: modal overlay → enter OpenRouter key → continue game
```

---

## Repository layout

```
api/
  proxy.js        Vercel serverless function — proxies LLM calls using server-side OPENROUTER_KEY
  dev-server.js   Local dev only — runs proxy.js on port 3001 (not deployed)

frontend/
  src/
    adventure.jsx  Entire game UI — mode picker, setup wizard, gameplay, all state
    api.js         LLM client — routes turns 1-19 through /api/proxy, turn 20+ uses user's own key
  vite.config.js  Proxies /api/* → localhost:3001 in dev mode

package.json      Minimal root package.json (required for Vercel function detection)
vercel.json       Build config + SPA catch-all rewrite
docker-compose.yml  Optional local dev — runs the `proxy` and `frontend` services only
```

---

## The three modes

`config.mode` is chosen on the home screen and drives the wizard, the system prompt, and gameplay features.

| Mode | Value | Notes |
|---|---|---|
| Adventure | `"adventure"` | Default CYOA. d6 fate checks. |
| D&D | `"dnd"` | DM persona, race/class/ability scores, **d20** rolls, rolls required far more often. |
| Educational | `"educational"` | Adds a target learning language, per-word translation gloss, simplified vocabulary directive. |

Mode-aware helpers (near the top of `adventure.jsx`):

| Helper | Description |
|---|---|
| `getStepDefs(mode)` | Returns the step list for the mode — `{id, key, icon, labelKey}` |
| `getSetupSteps(mode)` | Just the step keys, in order |
| `getAutoAdvanceSteps(mode)` | Set of step **ids** that auto-advance, derived from step `key` — never hardcoded |

Step lists per mode:

```
adventure  : genre, age, length, duration, rules, prompt, character          (7)
dnd        : age, duration, prompt, dnd-character                            (4)
educational: learnlang, genre, age, length, duration, rules, prompt, character (8)
```

Auto-advance keys: `genre`, `age`, `length`, `duration`, `learnlang`. Those steps auto-advance ~120 ms after a single-choice click via `pickAndAdvance(idx, label, applyConfig)` and render only a text-link `← Back`. Steps needing multiple inputs or free text (`rules`, `prompt`, `character`, `dnd-character`) keep their Continue / Begin Adventure buttons.

**Navigation:** A persistent `StepStrip` icon row sits at the top of every wizard card, showing each step's icon + short label plus a preview of the chosen value. Clicking any strip icon jumps to that step. The strip color tracks the selected genre's primary color (`activePrimary`).

Language is set on the home screen (not a wizard step). Supported: **English, Hebrew, Arabic, Portuguese** (RTL handled automatically for Hebrew and Arabic).

---

## Running locally (dev mode)

Two terminals required:

**Terminal 1 — proxy server** (loads `.env`, serves the OpenRouter key on port 3001):
```bash
node api/dev-server.js
```

**Terminal 2 — frontend** (Vite on 5173, proxies /api/* to 3001):
```bash
cd frontend
npm run dev
```

Open `http://localhost:5173`. The game works exactly as in production:
- Turns 1–19 call `POST /api/proxy` → forwarded to OpenRouter using `.env` key
- Turn 20+ shows the user-key modal

**Local environment variables (`.env` at repo root, gitignored):**

| Variable | Description |
|---|---|
| `OPENROUTER_KEY` | Your OpenRouter API key (`sk-or-v1-...`) |

---

## Deploying to Vercel (prod mode)

### One-time setup

1. Push repo to GitHub
2. Import project in Vercel dashboard — **leave Root Directory blank**
3. Vercel auto-detects `vercel.json` and uses:
   - Build: `cd frontend && npm install && npm run build`
   - Output: `frontend/dist`
4. Add environment variable in Vercel dashboard → **Settings → Environment Variables**:
   - `OPENROUTER_KEY` = `sk-or-v1-...` (mark as Production + Preview)
5. Deploy

### Re-deploying after code changes

```bash
git add .
git commit -m "your message"
git push
```
Vercel auto-deploys on every push to `main`.

### How prod routing works

```
https://openstory-ai*.vercel.app/
  /api/proxy  → api/proxy.js (serverless function, reads OPENROUTER_KEY from env)
  /*          → frontend/dist/index.html (SPA catch-all via vercel.json rewrite)
```

The `OPENROUTER_KEY` is **only ever accessible inside the serverless function** — never sent to the browser.

### CORS

`isAllowedOrigin()` in `proxy.js` allows:
- `http://localhost:5173` — local dev
- Any `https://choose-your-adventure*.vercel.app` — legacy project name
- Any `https://openstory-ai*.vercel.app` — current preview + production deployments
- `process.env.ALLOWED_ORIGIN` — optional override for a custom domain

---

## Environment variables

| Variable | Where set | Description |
|---|---|---|
| `OPENROUTER_KEY` | `.env` (local) / Vercel dashboard (prod) | OpenRouter API key — server-side only, never in frontend |
| `ALLOWED_ORIGIN` | Vercel dashboard (optional) | Extra allowed CORS origin for custom domains |

---

## Model configuration

The model IDs are **duplicated** in `frontend/src/api.js` and `api/proxy.js` — change both together.

```js
const OPENROUTER_MODEL = "google/gemini-2.5-flash";
const FALLBACK_MODELS  = ["deepseek/deepseek-chat"];
```

The fallback chain is used only when the caller sets `useFallback: true`, after retrying the primary for `RETRY_WINDOW_MS` (5 s) on a retryable status. `RETRY_STATUSES = {429, 503, 504}` — **404 is deliberately not retryable**, so a retired/misspelled model ID fails loudly and immediately rather than silently degrading. If calls suddenly 404 with "No endpoints found", the model was retired from OpenRouter: check `https://openrouter.ai/api/v1/models` and update both files.

`ATTEMPT_TIMEOUT_MS = 25000` — a per-attempt hard timeout aborts slow-but-not-erroring models and flips to the fallback chain.

## Vercel serverless function: api/proxy.js

POST `/api/proxy` — the only server-side route. Accepts the same body OpenRouter expects (minus the model, which is locked server-side).

- Validates `Content-Type: application/json` and `messages` array
- Locks the model and the fallback chain server-side — the caller cannot override either; the only choice it has is the `useFallback` boolean
- Caps `max_completion_tokens` at 2000
- CORS-restricted to allowed origins only
- Returns the raw OpenRouter response (pass-through)

---

## JSON parsing and the malformed-output invariant

Models routinely emit JSON with **unescaped `"` inside string values** — especially in Hebrew/Arabic, where dialogue leans on quotation marks. `extractJSON()` in `api.js` handles this in stages: strip `<think>` blocks and code fences → `JSON.parse` → slice first `{` to last `}` → `repairUnescapedQuotes()`.

`repairUnescapedQuotes()` decides whether a `"` inside a string closes the value. It closes **only** if followed by `}`, `]`, `:`, or a comma that precedes a real `"key":` pair or another string element. A comma followed by prose means it was dialogue — escape it.

> ⚠️ Do **not** simplify this back to "next non-whitespace char is one of `}],:`". That treats `אמר: "עצור שם", ואז שלף` as end-of-value, derails the parse, and returns `null`.

**Invariant: a response that fails to parse must never reach `storyLog`.** `callWithKey` and `callViaProxy` must never `return { story: raw, ... }` — that writes a raw JSON blob into `storyLog`, which `makeChoice` then re-serializes into history every turn, compounding escape artifacts until the run degrades into gibberish.

Instead they **retry** on an unparseable response (flipping to the fallback chain), up to `MAX_PARSE_FAILURES` (3), and only throw once exhausted. The retry matters: OpenRouter intermittently returns **HTTP 200 with `finish_reason: "error"`, `completion_tokens: 0`, and content truncated mid-sentence** when the upstream provider fails mid-generation. That is a transient blip, not a bad turn — but it never touches the `RETRY_STATUSES` path, because the HTTP status is 200. Failing terminally on it ends the game mid-adventure.

Every `api.chat` caller is wrapped in try/catch, so a genuine exhaustion degrades to the normal error + retry entry, which is filtered out of history.

---

## Frontend architecture

Everything lives in `frontend/src/adventure.jsx` — a single React component.

### Game state

| State | Type | Description |
|---|---|---|
| `storyLog` | `Array<LogEntry>` | Full story log (see entry types below) |
| `config` | object | All setup choices — includes `mode`, `language`, `chapterCount` |
| `character` | object | name, gender, age, appearance, skills + `dndRace`, `dndClass`, `abilityScores` |
| `stats` | object | health, inventory, relationships |
| `choices` | string[] | Current choice buttons |
| `turnCount` | number | Current turn number |
| `storySummary` | object | Rolling LLM summary `{narrative, world}` |
| `worldState` | object | `{npcs, locations, facts}` — persistent, merged every turn |
| `chapterNumber` | number | Current chapter (1-based) |
| `chapterBrief` | object\|null | `{title, situation, winCondition, approaches}` — generated once, immutable for the chapter |
| `chapterBanner` | string\|null | Title shown in overlay when chapter starts |
| `chapterProgress` | object | `{achieved: string[], clues: string[]}` |
| `hintLevel` | number | How many of `chapterBrief.approaches` are revealed. Monotonic within a chapter (never re-hidden — each was earned), resets on transition, **is saved** |
| `stuckTurns` | number | Turns with no `chapterProgress` movement; at `STUCK_TURNS_LIMIT` the costly out is required |
| `briefStatus` | string | `"idle" \| "loading" \| "error"` — gates the choices panel while the brief lands |
| `pendingRoll` | object\|null | `{context, choiceText}` — dice waiting to be rolled |
| `nextRollRequired` | object | `{required, context}` from last LLM response |
| `currentMood` | string | Drives ambient UI tone; from the LLM's `mood` field |
| `translations` / `wordCache` / `glossLoading` | object | Educational-mode translation state |

### Persisted localStorage keys

| Key | Contents |
|---|---|
| `openrouter_key` | The player's own OpenRouter key (turn 20+) |
| `openstory_prefs` | themeMode, font, size, language, translationLanguage, wordHintDismissed |
| `openstory_word_cache` | Educational-mode word gloss cache (FIFO trim at `WORD_CACHE_MAX = 5000`) |

### storyLog entry types

```js
{ role: "narrator",  text: string }
{ role: "player",    text: string }
{ role: "roll",      value: number, outcome: string, context: string, skillBonus: bool }
{ role: "chapter",   text: string, num: number }
```

Only `narrator` and `player` entries are sent to the LLM as history. `roll` and `chapter` entries are display-only.

Error/retry entries (localized "Something went wrong" narrator + "Try again" player) are filtered out before building LLM history so failed calls never contaminate subsequent turns. The filter matches on `ERROR_MARKERS` / `RETRY_TEXTS` — **if you change those strings, update both lists in all four languages.**

### Key functions

| Function | Description |
|---|---|
| `buildSystemPrompt()` | Assembles the full system prompt: mode persona, language, perspective, character, stats, world state, compact chapter brief, story arc phase, rolling summary |
| `generateChapterBrief(chNum, total, summaryCtx)` | Background call → `{title, goal, obstacle}`. `max_tokens_override: 500`. Fired 5 s after start, 10 s after a chapter transition. Never awaited. |
| `startAdventure()` | Sends the opening prompt, fires chapter 1 brief generation |
| `handleChoiceClick(choiceText)` | If `nextRollRequired`, opens the dice overlay; otherwise calls `makeChoice` |
| `handleRollResult(rollInfo)` | Receives the dice result, dismisses the overlay, calls `makeChoice(choiceText, rollInfo)` |
| `makeChoice(choiceText, rollInfo?)` | Filters error/retry history, builds the sliding window, injects `[CURRENT STATE]`, appends roll outcome, calls the LLM, updates all state |
| `triggerSummarize(fullLog, currentSummary)` | Background call every 5 turns. `max_tokens_override: 700`, fired ~3 s after the turn (2 s on a chapter transition). Never awaited. |
| `translateWord` / `translateAllWords` / `translatePassage` | Educational-mode translation calls, all cached and guarded |
| `handleExport()` | Downloads a `.txt` transcript |
| `handleSaveGame()` / `handleLoadGame()` / `handleFileChange()` | Save/restore full game state as `.json` |
| `resetGame()` | Resets all state, returns to home |

---

## Chapter system

**A chapter is ONE situation with a solution decided up front.** The player cannot progress until it is solved; the narrative keeps pointing back at it.

**There is no turn cap.** Adventure size is measured only in chapters — `config.chapterCount`, chosen directly by the duration step (`CHAPTER_COUNTS = [1, 2, 4, 8]` = Sprint/Short/Standard/Epic). A chapter lasts exactly as long as the player takes to solve it. The story ends only when the final chapter's win condition is met.

**Chapter brief format** (`chapterBrief`): `{title, situation, winCondition, approaches}`.
- `situation` — the concrete predicament. **Always visible to the player.**
- `winCondition` — the objectively checkable end-state that resolves it. Must be answerable yes/no by looking at the world ("Aran is inside the city walls"), never an activity ("investigate the ruins"). **Always visible.**
- `approaches` — 2-4 pre-decided viable routes. **Hidden**; sent to the LLM (it needs them to judge), revealed one per click of the hint bulb via `hintLevel`.
- `goal`/`obstacle` are gone; `setting`/`resolutionCondition` remain intentionally absent.

The brief is **generated once per chapter and awaited** — see the blocking exception below. The chapter ends when the LLM returns `chapterSolved: true`, never by turn count.

**Judging.** The LLM checks each turn whether the player's action genuinely achieved `winCondition`. An unlisted-but-valid approach still counts. Intent, planning and near-misses do not. The prompt explicitly forbids advancing the plot, opening unrelated threads, or relocating the player until it is met.

**Stuck / costly out.** `stuckTurns` counts turns where `chapterProgress` did not move (an *absent* `chapterProgress` counts as no movement). At `STUCK_TURNS_LIMIT` (4) the `[CURRENT STATE]` block requires the narrator to offer exactly one choice that resolves the situation at a concrete, named price. The player opts in; a hard gate never becomes a dead end.

**Chapter progress** (`chapterProgress`) is tracked cumulatively in the `[CURRENT STATE]` user message block — NOT in the system prompt. The stuck directive lives there too, since it is derived from `chapterProgress` (and it keeps the system prompt stable turn to turn). Achieved items and clues accumulate (deduped) and both reset on chapter transition.

### The blocking exception

`startChapter(chNum, summaryCtx, cfgOv, charOv, totalOv)` is the **one background call that blocks play** (`briefStatus: "idle" | "loading" | "error"` gates the choices panel): without a `winCondition` there is nothing to solve against. It:
- bumps `chapterNumber` **immediately**, not in the brief's success handler — that used to mean a failed brief silently left the player in the previous chapter forever;
- retries up to `BRIEF_MAX_ATTEMPTS` (3), then offers **Retry** or **Continue anyway** (plays on with no `chapterSection` rather than bricking the run);
- uses `briefReqRef` to discard a brief that resolves after a reset/load;
- **returns** the brief, because `setChapterBrief` has not landed for a caller building a prompt in the same tick.

`startAdventure` awaits chapter 1's brief **before** the opening call and passes it via `buildSystemPrompt(cfg, char, briefOverride, chapNumOverride)`. Previously the brief was on a 5 s timer racing an opening written with `chapterBrief === null`, so the opening and the chapter routinely described different things.

`generateChapterBrief` is a pure producer (returns brief or null, sets no state) and takes `cfgOverride`/`charOverride` — `startAdventure` calls `setConfig(finalCfg)` and starts chapter 1 in the same tick, so the closure's `config` is still pre-defaults.

---

## Dice rolling (fate checks)

When the LLM returns `rollRequired: true`, clicking any choice triggers the `DiceRoller` overlay before the LLM call. `getDiceOutcome(value, isDnd)` resolves the outcome.

**Adventure / Educational — d6:**

| Roll | Outcome |
|---|---|
| 1 | Critical Failure — something goes badly wrong |
| 2–3 | Setback — the attempt fails with a complication |
| 4–5 | Partial Success — works, but with a cost or catch |
| 6 | Critical Success — exceptional, better than expected |

**D&D mode — d20:** 1 = critical failure, 2–9 = clear failure, 10–14 = partial success, 15–19 = solid success, 20 = critical success.

**Bonuses:** in adventure mode, if `rollContext` fuzzy-matches a character skill, the die is rolled twice and the higher kept ("Skill Bonus Applied"). In D&D mode, `getDndStatBonus()` maps `rollContext` to an ability via `DND_STAT_KEYWORDS` and applies the ability modifier.

---

## State consistency (LLM sync)

Every outgoing `makeChoice` message includes a `[CURRENT STATE]` block:

```
[CURRENT STATE — carry these values forward and return updated versions]
Health: 72/100 | Inventory: [Rusty Key, Torch] | Relationships: {Guard: suspicious} | Chapter achieved so far: Found the map room | Clues found: The seal breaks at midnight
```

The system prompt also shows authoritative current stats and `WORLD STATE`. This ensures the LLM never has to infer state from trimmed history, which would cause drift on long adventures.

---

## Long-context management

**Near-duplicate merging.** The LLM re-emits the cumulative lists every turn and rewords them slightly each time, so exact-match `new Set()` never deduped them and they grew forever (`"…של מפה."` / `"…של מפה"` / `"הקלף המפותל…"` as three entries; `"מערה חסרת מוצא"` alongside `"מערה חסרת מוצא — מלאה בעשן…"`). `mergeDedup()` merges on meaning — equal after normalisation, one containing the other, or ≥90% Levenshtein similarity — and keeps the longest variant. `saysSame()` refuses to merge strings whose **digits** differ, so "room 1" and "room 2" stay distinct facts. `mergeNpcs()` does the same for NPC keys. Used for `chapterProgress.achieved/clues` and `worldState.locations/facts`.

This is load-bearing for `stuckTurns`: only a genuinely new item counts as movement, otherwise a reworded restatement would reset the counter every turn and a stuck player would never be offered the costly way out.

| Mechanism | Detail |
|---|---|
| Sliding window | Only the last `WINDOW_SIZE` (16) `storyLog` entries are sent as raw history once a summary exists |
| Rolling summary | Every `SUMMARY_EVERY` (5) turns a background call (`max_tokens_override: 700`) produces `{narrative, world: {npcs, locations, decisions, threads}}` — injected as `STORY CONTEXT` |
| World state | Merged from every turn's `worldState`; `facts` capped at the 8 most important |

**Windowed history structure**: when the window is active, the message array starts from the earliest windowed player entry (no "Continue the adventure" anchor). A `[story continues]` guard is prepended only if the first windowed entry is a narrator turn (keeps API message-role ordering valid).

---

## LLM JSON response contract

Every game turn the LLM must return:

```json
{
  "story": "narrative text",
  "choices": ["choice 1", "choice 2", "choice 3"],
  "stats": { "health": 85, "inventory": ["Torch"], "relationships": { "Elena": "ally" } },
  "gameOver": false,
  "gameOverReason": "",
  "rollRequired": false,
  "rollContext": "",
  "chapterSolved": false,
  "solvedVia": "",
  "chapterProgress": { "achieved": ["milestone"], "clues": ["hint"] },
  "mood": "neutral",
  "worldState": { "npcs": {}, "locations": [], "facts": [] }
}
```

- `stats` only required when `config.trackStats` is true
- `rollRequired` / `rollContext`: signal to show dice before the next action
- `chapterSolved`: the chapter's `winCondition` is objectively met (renamed from `chapterComplete` — "complete" invited "we've spent enough time here"; "solved" is binary). `makeChoice` reads `result.chapterSolved ?? result.chapterComplete` for one release.
- `solvedVia`: short phrase naming what the player actually did; shown on the chapter marker
- `chapterProgress` / `worldState`: cumulative — the LLM carries forward existing entries and adds new ones. An **empty** `chapterProgress` is meaningful: it is how the stuck counter detects no headway, so the prompt tells the LLM not to pad it.
- `mood`: one of peaceful, tense, action, dramatic, sad, triumphant, mysterious, neutral

---

## Story arc pacing

Phase is keyed to **chapter number, never turn count**. There is no turn budget, so the story cannot end because turns ran out.

| Progress | Phase | Instruction |
|---|---|---|
| Turn 0 | OPENING | Establish world and character, drop the player into chapter 1's situation |
| Chapter 1 | EARLY | Develop world and cast while the player works the situation |
| Middle chapters (<65%) | MIDDLE | Escalate; earlier consequences resurface |
| Later chapters | LATE | Push toward the climax |
| Last chapter | CLIMAX | Bring all threads to a head |

There is no separate FINALE phase. The last chapter's solve **is** the ending: the CLIMAX instruction tells the LLM to set `chapterSolved` and `gameOver` together and narrate the conclusion in the same response. A separate finale turn would leave the player a turn with nothing to choose.

---

## Adding a new setup step

1. Add translation keys to the `TR` object — the step's title/subtitle plus a short strip label (`stepXxx`). All four languages: English, Hebrew, Arabic, Portuguese.
2. Add the step to the relevant mode's list in `getStepDefs(mode)` (`{id, key, icon, labelKey}`), renumbering `id`s so they stay contiguous from 0. `getSetupSteps` and `getAutoAdvanceSteps` derive from this automatically. For the adventure mode, the list is built from `STEP_DEFS_ADVENTURE` + `SETUP_STEPS` — update both.
3. Pick an existing icon from the `ICONS` map or add one.
4. If the step should auto-advance, add its **key** to the `auto` set inside `getAutoAdvanceSteps`.
5. Add the new field to the `config` state initializer **and** to the `resetGame` re-initializer.
6. Add a `case "stepname":` in `renderSetupStep()`. For single-choice steps call `pickAndAdvance(stepIdx("key"), displayLabel, () => setConfig(...))`. For multi-input steps render `<NavButtons>`.
7. Pass `{...cardProps}` to the `<SetupCard>` so the strip renders inside the card.
8. Use `stepIdx("key")` for navigation — **never a numeric literal.** Step indices differ per mode.
9. Use the new config field in `buildSystemPrompt()` and add it to the `useCallback` deps.

---

## Adding a new language

1. Add `{ code: "LangName", label: "Native Label" }` to the `LANGUAGES` array
2. Add translation keys to `TR` for all existing keys in the new language
3. If RTL, add the language code to `RTL_LANGS`
4. Add the code to the `langs` whitelist in `loadPrefs()` — otherwise the preference silently resets to English
5. Add the localized error/retry strings to `ERROR_MARKERS` / `RETRY_TEXTS` in `makeChoice`, or failed turns in that language will leak into LLM history
6. Background calls (`generateChapterBrief`, `triggerSummarize`) build a `langDirective` from `config.language` and fall through to the language label automatically. Add a special case only if the language needs disambiguation (e.g. European vs Brazilian Portuguese)

---

## What NOT to do

- Do not hardcode the OpenRouter key anywhere in the frontend — turns 1–19 go through `/api/proxy`; turn 20+ uses the player's own key from `localStorage("openrouter_key")`
- Do not let the caller pick the model — `proxy.js` locks both the primary and the fallback chain server-side
- Do not change the model ID in only one file — `api.js` and `proxy.js` must stay in sync
- Do not return `{ story: raw }` when `extractJSON` fails — it poisons `storyLog` and compounds through the history round-trip (see the malformed-output invariant above)
- Do not make an unparseable response terminal — retry first. An HTTP 200 carrying `finish_reason: "error"` is a transient provider blip and must not end the game
- Do not interpolate `worldState` / `storySummary.world` values into the prompt without `asText()` — models return objects where a string is documented, and `[object Object]` then merges forward permanently
- Do not loosen `repairUnescapedQuotes` back to the "any of `}],:`" heuristic — it breaks on Hebrew/Arabic dialogue
- Do not add 404 to `RETRY_STATUSES` — a retired model must fail loudly, not silently fall back forever
- Do not hardcode step numbers — indices differ per mode; always use `stepIdx("key")`
- `triggerSummarize` must never block gameplay — never `await` it. The chapter brief is the **deliberate exception**: it is awaited, because a chapter with no `winCondition` has nothing to solve against
- **Never read `config.storyLength` as a chapter count.** In v2/v3 saves it is a TURN budget (5/10/20/40); `LEGACY_CHAPTER_MAP` exists solely to migrate it to `config.chapterCount`, and nothing else may read it
- Do not reintroduce a turn cap — pacing is chapters only, and the story must never end because turns ran out
- Do not set `chapterSolved: true` on intent, planning, a near-miss, or because the player is struggling — only when the `winCondition` is objectively met
- Do not render `chapterBrief.approaches` — they are the puzzle. They go to the LLM only. (They *are* visible in the save JSON; unavoidable with no backend, and self-inflicted.)
- Do not gate the `chapterProgress` merge on `result.chapterProgress` being present — an absent value is exactly the no-movement signal `stuckTurns` depends on
- Do not dedupe cumulative lists with plain `new Set()` — the LLM rewords entries every turn, so exact matching lets them grow forever. Use `mergeDedup()`, and count movement by whether it actually added an item
- Do not add `setting` or `resolutionCondition` back to the chapter brief — both were intentionally removed. `winCondition` is the goal made falsifiable, not a revival of `resolutionCondition` (which described how the narration should wrap up)
- Do not put `chapterProgress` — or the stuck directive derived from it — in the system prompt; both belong only in the `[CURRENT STATE]` user message block
- Do not bump `chapterNumber` inside the brief's success handler — a failed brief then silently strands the player in the previous chapter forever. `startChapter` bumps it up front
- Save files use `version: 4`. `loadAndValidateSave()` accepts v2/v3 and migrates them (`storyLength` → `chapterCount`, `{goal, obstacle}` → `{situation, winCondition, approaches: []}`); anything below v2 throws the `"version"` error so the caller shows `t("versionError")` instead of `t("loadError")`
