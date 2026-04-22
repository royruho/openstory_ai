# CLAUDE.md — Project Guide for Claude Code

This file tells Claude Code everything it needs to know to work effectively in this repository.

---

## What this project is

An AI-powered choose-your-own-adventure game with a chapter-based structure and dice-roll fate checks.

- **Frontend**: React + Vite (`frontend/`) — static, deployed on Vercel.
- **Proxy**: Vercel serverless function (`api/proxy.js`) — holds the preloaded OpenRouter key server-side, never exposed to the browser.
- **AI**: `openai/gpt-oss-20b:free` via OpenRouter. First 20 turns use the app's preloaded key (free to the player). Turn 20+ prompts the player to provide their own OpenRouter key.
- **Save/Load**: File-based (JSON files on user's machine). No server-side persistence.
- **Backend**: FastAPI (`app/`) — unused by the frontend, kept for a potential future accounts feature.

### Freemium model

```
Turns 1–19  → frontend calls /api/proxy (server holds OPENROUTER_KEY, hidden from browser)
Turn 20+    → modal prompts player for their own OpenRouter key
            → stored in localStorage("openrouter_key"), used directly from browser
```

### App phases

```
Load app
  ↓
phase = "home"  (no login/key required to start)
  ├── Start New Adventure → phase = "setup" → phase = "game"
  └── Load Saved Adventure → file picker → phase = "game"

At turn 20, if no user key: modal overlay → enter OpenRouter key → continue game
```

Phase progression: `"home"` → `"setup"` → `"game"`

---

## Repository layout

```
api/
  proxy.js        Vercel serverless function — proxies LLM calls using server-side OPENROUTER_KEY
  dev-server.js   Local dev only — runs proxy.js on port 3001 (not deployed)

frontend/
  src/
    adventure.jsx  Entire game UI — setup wizard, gameplay, all state
    api.js         LLM client — routes turns 1-19 through /api/proxy, turn 20+ uses user's own key
  vite.config.js  Proxies /api/* → localhost:3001 in dev mode

package.json      Minimal root package.json (required for Vercel function detection)
vercel.json       Build config + SPA catch-all rewrite

app/              FastAPI backend — unused, kept for future accounts feature
```

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
https://choose-your-adventure*.vercel.app/
  /api/proxy  → api/proxy.js (serverless function, reads OPENROUTER_KEY from env)
  /*          → frontend/dist/index.html (SPA catch-all via vercel.json rewrite)
```

The `OPENROUTER_KEY` is **only ever accessible inside the serverless function** — it is never sent to the browser. The browser calls `/api/proxy` with the game messages; the function adds the key before forwarding to OpenRouter.

### CORS

`isAllowedOrigin()` in `proxy.js` allows:
- `http://localhost:5173` — local dev
- Any `https://choose-your-adventure*.vercel.app` — all preview + production deployments
- `process.env.ALLOWED_ORIGIN` — optional override for a custom domain

If you add a custom domain, set `ALLOWED_ORIGIN=https://yourdomain.com` in Vercel env vars.

---

## Environment variables

| Variable | Where set | Description |
|---|---|---|
| `OPENROUTER_KEY` | `.env` (local) / Vercel dashboard (prod) | OpenRouter API key — server-side only, never in frontend |
| `ALLOWED_ORIGIN` | Vercel dashboard (optional) | Extra allowed CORS origin for custom domains |

---

## Vercel serverless function: api/proxy.js

POST `/api/proxy` — the only server-side route. Accepts the same body that OpenRouter expects (minus the model, which is locked server-side).

- Validates `Content-Type: application/json` and `messages` array
- Locks model to `openai/gpt-oss-20b:free` — caller cannot override
- Caps `max_completion_tokens` at 2000
- CORS-restricted to allowed origins only
- Returns the raw OpenRouter response (pass-through)

---

## Frontend architecture

Everything lives in `frontend/src/adventure.jsx` — a single React component.

### Setup wizard (8 steps)

genre → age tier → story pacing → adventure length → game rules → narrative perspective → story seed → character

Language is set on the home screen (not a wizard step). Supported languages: **English, Hebrew, Arabic, Portuguese** (RTL handled automatically for Hebrew and Arabic).

**Navigation:** A persistent `StepStrip` icon row sits at the top of every wizard card. Each icon shows the step's icon + short label, plus a 7-char preview of the chosen value once a step is completed. The strip color tracks the selected genre's primary color (`activePrimary`). Clicking any strip icon jumps directly to that step.

**Auto-advance:** Steps in `AUTO_ADVANCE_STEPS` (`{0, 1, 2, 3, 5}` — genre, age, pacing, duration, perspective) auto-advance 120 ms after a single-choice click via the `pickAndAdvance(idx, label, applyConfig)` helper. They render only a text-link `← Back` (no Continue button). Steps 4 (rules), 6 (seed), 7 (character) keep their Continue / Begin Adventure buttons because they require multiple inputs or free text.

### Game state

| State | Type | Description |
|---|---|---|
| `storyLog` | `Array<LogEntry>` | Full story log (see entry types below) |
| `config` | object | All setup choices |
| `character` | object | name, gender, age, appearance, skills |
| `stats` | object | health, inventory, relationships |
| `choices` | string[] | Current choice buttons |
| `turnCount` | number | Current turn number |
| `storySummary` | object | Rolling LLM summary `{narrative, world}` |
| `storyId` | number\|null | DB story ID (null for guests) |
| `chapterNumber` | number | Current chapter (1-based) |
| `chapterBrief` | object\|null | `{title, goal, obstacle}` — generated once, immutable for the chapter |
| `chapterBanner` | string\|null | Title shown in overlay when chapter starts |
| `chapterProgress` | object | `{achieved: string[], clues: string[]}` |
| `pendingRoll` | object\|null | `{context, choiceText}` — dice waiting to be rolled |
| `nextRollRequired` | object | `{required: bool, context: string}` from last LLM response |

### storyLog entry types

```js
{ role: "narrator",  text: string }
{ role: "player",    text: string }
{ role: "roll",      value: 1-6, outcome: string, context: string, skillBonus: bool }
{ role: "chapter",   text: string, num: number }
```

Only `narrator` and `player` entries are sent to the LLM as history. `roll` and `chapter` entries are display-only.

Error/retry entries (`"Something went wrong"` narrator + `"Try again"` player) are filtered out before building LLM history so failed calls never contaminate subsequent turns.

### Key functions

| Function | Description |
|---|---|
| `buildSystemPrompt()` | Assembles full system prompt: perspective, character, stats (current values), compact chapter brief, story arc phase, rolling summary context |
| `generateChapterBrief(chNum, total, summaryCtx)` | Background call — generates `{title, goal, obstacle}`. Delayed 5 s on start, 10 s on chapter transition. No await. |
| `startAdventure()` | Sends opening prompt, fires chapter 1 brief generation (delayed 5 s), creates DB record for logged-in users |
| `handleChoiceClick(choiceText)` | Checks `nextRollRequired` — if true, opens dice overlay; otherwise calls `makeChoice` directly |
| `handleRollResult(rollInfo)` | Receives dice result, dismisses overlay, calls `makeChoice(choiceText, rollInfo)` |
| `makeChoice(choiceText, rollInfo?)` | Filters error/retry history, builds sliding-window history, injects `[CURRENT STATE]` block, appends roll outcome, calls LLM, updates all state |
| `triggerSummarize(fullLog, currentSummary)` | Background call every 5 turns (skipped for adventures ≤ 10 turns). Delayed 20 s. No await. |
| `handleExport()` | Downloads `.txt` transcript |
| `handleSaveGame()` | Downloads full game state as `.json` (version 2) |
| `handleLoadGame()` / `handleFileChange()` | Restores game state from `.json` |
| `resetGame()` | Resets all state, returns to setup |

---

## Chapter system

Adventure length maps to chapter count:

| Length | Turns | Chapters |
|---|---|---|
| Sprint | 5 | 1 |
| Short | 10 | 2 |
| Standard | 20 | 4 |
| Epic | 40 | 8 |

Each chapter has **one single overarching goal** (not a list of steps or items). The chapter brief is generated once by a background LLM call and never changes mid-chapter:
- Adventure start → chapter 1 brief (fired 5 s after opening call)
- When LLM returns `chapterComplete: true` → next chapter brief (fired 10 s after the completing turn)

Chapter ends when the LLM signals `chapterComplete: true`, not by turn count. The player can explore freely, hit dead ends, and try multiple approaches before achieving the goal.

**Chapter brief format** (`chapterBrief`): `{title, goal, obstacle}` — three fields only.
- `goal`: one overarching objective — what to achieve, NOT specific items or steps
- `obstacle`: the main force or challenge blocking the goal
- `setting` and `resolutionCondition` are intentionally omitted — the premise sets the world; the goal IS the resolution condition

**Chapter section in system prompt** (compact, 2 lines):
```
CHAPTER 1 of 2: "Title" — Goal: X | Obstacle: Y
→ Set chapterComplete:true only when this goal is conclusively achieved.
```

**Chapter progress** (`chapterProgress`) is tracked cumulatively in the `[CURRENT STATE]` user message block — NOT in the system prompt:
- `achieved`: specific milestones completed toward the single chapter goal
- `clues`: hints and information discovered useful for reaching the goal

Progress is merged: achieved items accumulate (deduped), clues accumulate (deduped). Both are reset when a chapter transitions.

Progress is shown in the game UI:
- Header: achieved milestones as small tags
- Sidebar: full progress + clues list (in stats panel or standalone panel when stats are off)

---

## Dice rolling (fate checks)

When the LLM returns `rollRequired: true`, clicking any choice triggers the `DiceRoller` overlay before the LLM call.

| Roll | Outcome | LLM instruction |
|---|---|---|
| 1 | Critical Failure | "something goes badly wrong — a real setback with consequences" |
| 2–3 | Setback | "the attempt fails with a complication" |
| 4–5 | Partial Success | "partial success — it works but with a cost or catch" |
| 6 | Critical Success | "exceptional success, better than expected" |

**Skill bonus**: if `rollContext` fuzzy-matches a character skill, the die is rolled twice and the higher value is kept. The "Skill Bonus Applied" badge is shown in the dice UI.

The roll result, outcome label, and narrative direction are appended to the outgoing LLM message.

---

## State consistency (LLM sync)

Every outgoing `makeChoice` message includes a `[CURRENT STATE]` block:

```
[CURRENT STATE — carry these values forward and return updated versions]
Health: 72/100 | Inventory: [Rusty Key, Torch] | Relationships: {Guard: suspicious} | Chapter achieved so far: Found the map room | Clues found: The seal breaks at midnight
```

The system prompt also shows the authoritative current stats values. This ensures the LLM never has to infer state from trimmed conversation history, which would cause drift on long adventures.

---

## Long-context management (rolling summary)

| Mechanism | Detail |
|---|---|
| Sliding window | Only the last 12 `storyLog` entries (~6 turns) are sent as raw history when a summary exists |
| Rolling summary | Every 5 turns a background call (delayed 20 s, `max_tokens_override: 350`) produces `{narrative, world: {npcs, locations, decisions, threads}}` — injected into system prompt as `STORY CONTEXT` |
| Short adventure skip | Summarization is skipped entirely for adventures of 10 turns or fewer (Sprint/Short) |

Constants: `SUMMARY_EVERY = 5`, `WINDOW_SIZE = 12`

**Windowed history message structure**: when the window is active, the message array starts directly from the earliest windowed player entry (no "Continue the adventure" anchor). A `[story continues]` guard is prepended only if the first windowed entry happens to be a narrator turn (keeps API message-role ordering valid).

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
  "chapterComplete": false,
  "chapterProgress": { "achieved": ["milestone"], "clues": ["hint"] }
}
```

- `stats` only required when `config.trackStats` is true
- `rollRequired` / `rollContext`: signal to show dice before the next action
- `chapterComplete`: signal to generate next chapter brief and reset progress
- `chapterProgress`: cumulative — the LLM should carry forward existing entries and add new ones

---

## Story arc pacing

Phase is calculated from `Math.min(turnCount, storyLength)` so it never overflows beyond the intended range. FINALE and CLIMAX are additionally gated by `isLastChapter` — the LLM is never told "last turn, set gameOver" while the player is still on an earlier chapter.

| Progress | Phase | Instruction |
|---|---|---|
| Turn 0 | OPENING | Establish world, character, inciting situation |
| 0–35% | EARLY | Develop world, introduce complications |
| 35–65% | MIDDLE | Escalate tension, introduce twist |
| 65–100% | LATE | Push toward climax, N turns remaining |
| Last 2 turns + last chapter | CLIMAX | Bring all threads to a head |
| At/past turn limit + last chapter | FINALE | Satisfying conclusion, `gameOver: true` |

---

## Adding a new setup step

1. Add translation keys to the `TR` object — the step's title/subtitle plus a short label for the strip (`stepXxx`). All four languages: English, Hebrew, Arabic, Portuguese.
2. Add the step name to the `SETUP_STEPS` array (string id).
3. Add a matching entry to `STEP_DEFS` (`{ id, icon, labelKey }`). Pick an existing icon from the `ICONS` map or add one. The strip is sized for 8 steps via `grid-template-columns: repeat(8, 1fr)` — bump that grid count if you exceed 8.
4. Add the new field to the `config` state initializer (and to the `resetGame` re-initializer).
5. Add a `case "stepname":` in `renderSetupStep()`. For single-choice steps, call `pickAndAdvance(idx, displayLabel, () => setConfig(...))` from each option's `onClick` and add the index to `AUTO_ADVANCE_STEPS`. For multi-input steps, render `<NavButtons>` and have the `onNext` set `stepSelections[idx]` before calling `setSetupStep(idx + 1)`.
6. Pass `{...cardProps}` to the `<SetupCard>` so the strip renders inside the card.
7. Update `onBack` / `BackLink to={n}` and any explicit `setSetupStep(n)` numbers in adjacent steps (+1 each).
8. Use the new config field in `buildSystemPrompt()` and add it to the `useCallback` deps.

---

## Adding a new language

1. Add `{ code: "LangName", label: "Native Label" }` to the `LANGUAGES` array
2. Add translation keys to `TR` for all existing keys in the new language
3. If RTL, add the language code to `RTL_LANGS`
4. Background LLM calls (`generateChapterBrief`, `triggerSummarize`) build a `langDirective` from `config.language` and inject a `LANGUAGE:` line into the system prompt — they fall through to the language label automatically. Add a special case there only if the language needs disambiguation (e.g., European Portuguese vs Brazilian Portuguese).

---

## Migrations

```bash
# After changing models.py:
docker compose exec backend alembic revision --autogenerate -m "description"
docker compose exec backend alembic upgrade head

# Against Aiven (cloud):
DATABASE_URL="postgres://..." alembic upgrade head
```

---

## What NOT to do

- Do not route LLM calls through the backend — `api.js` calls Gemini directly from the browser
- Do not hardcode the Gemini API key anywhere — it is user-provided and stored only in `localStorage` under `"gemini_api_key"`
- Do not hardcode step numbers — always update all `setSetupStep()` calls when inserting a step
- Background calls (`triggerSummarize`, `generateChapterBrief`) must not block gameplay — never `await` them
- Do not set `chapterComplete: true` based on turn count — it must be triggered only when the single chapter goal is achieved
- Chapter goals must be a single overarching objective — never a list of specific items or steps
- Do not add `setting` or `resolutionCondition` back to the chapter brief — both were intentionally removed
- Do not put `chapterProgress` in the system prompt — it belongs only in the `[CURRENT STATE]` user message block
- Do not trigger FINALE/CLIMAX phases when the player is not on the last chapter — the phase calculation uses `isLastChapter` guard for exactly this reason
- Save files use `version: 3`. `loadAndValidateSave()` accepts v2 and v3; reject anything below v2 with the `"version"` error so the caller shows `t("versionError")` instead of `t("loadError")`
