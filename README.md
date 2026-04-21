# OpenStory AI

Become the author of your own story. An AI-powered choose-your-own-adventure game with a chapter-based structure and dice-roll fate checks.

---

## Architecture

```
Browser
  │
  └─► React/Vite frontend (static, deployed on Vercel)
        │
        ├─► /api/proxy  (Vercel serverless function — turns 1–19)
        │     │
        │     └─► OpenRouter (server-side OPENROUTER_KEY, never exposed)
        │
        └─► OpenRouter directly (turn 20+, using player's own key)
```

No backend, no database, no accounts. The app's free key is hidden behind a serverless proxy for the first 20 turns; after that the player supplies their own OpenRouter key, stored only in `localStorage`.

Save/load is file-based — players download a `.json` snapshot and reload it later.

---

## Freemium model

| Turns | Key used | Stored |
|---|---|---|
| 1–19 | App's `OPENROUTER_KEY` via `/api/proxy` | Server-side env var only |
| 20+ | Player's own OpenRouter key | Browser `localStorage("openrouter_key")` |

At turn 20 a modal prompts the player to paste an OpenRouter key. Free keys work — `openai/gpt-oss-20b:free` is the locked model.

---

## Features

### Setup wizard (9 steps)

1. **Language** — English, Hebrew, Arabic (full RTL support)
2. **Genre** — Fantasy, Sci-Fi, Reality, Mystery (each with its own theme, fonts, icon set)
3. **Content rating** — Kids (8+), Teen (13+), Adult (18+)
4. **Story pacing** — Quick & Punchy / Balanced / Rich & Immersive
5. **Adventure length** — Sprint (5 turns / 1 chapter), Short (10 / 2), Standard (20 / 4), Epic (40 / 8)
6. **Game rules** — death possible / not; stat tracking on / off
7. **Narrative perspective** — First or second person
8. **Story seed** — optional premise text
9. **Character** — name, gender, age, appearance, up to 3 skills

### Chapter-based structure

Each chapter has **one overarching goal** the player must earn through play:

- A hidden chapter brief (`{title, goal, obstacle}`) is generated once per chapter by a background LLM call and never changes mid-chapter
- The goal is one broad objective, never a list of items or steps — the path emerges through play
- Chapter ends when the LLM signals `chapterComplete: true`, not by turn count
- A cinematic banner fades in when a new chapter begins

| Length | Turns | Chapters |
|---|---|---|
| Sprint | 5 | 1 |
| Short | 10 | 2 |
| Standard | 20 | 4 |
| Epic | 40 | 8 |

### Dice rolling (fate checks)

When the LLM flags a risky action, a d6 overlay appears before it resolves:

| Roll | Outcome |
|---|---|
| 1 | Critical Failure |
| 2–3 | Setback |
| 4–5 | Partial Success |
| 6 | Critical Success |

**Skill bonus** — if the attempt matches one of the character's skills, the die is rolled twice and the higher value is kept.

### State consistency & long-story context

- Every outgoing LLM message carries a `[CURRENT STATE]` block with current stats and cumulative chapter progress (achieved milestones + clues)
- A rolling summary is generated every 5 turns in the background; only the last ~6 turns of raw dialogue are sent once a summary exists
- Summarisation is skipped for Sprint/Short adventures (≤ 10 turns)

### Save / Load / Export

- **Save Game** — downloads a `.json` snapshot of the full game state (version 3)
- **Load Game** — file picker restores any saved `.json` (v2 and v3 accepted)
- **Export Story** — downloads a human-readable `.txt` transcript

### Theming

| Genre | Colour | Font | Icons |
|---|---|---|---|
| Fantasy | Gold | Cinzel serif | ⚔️ 🧙 🐉 🏰 🌿 |
| Sci-Fi | Cyan | Orbitron | 🚀 🤖 👾 🛸 ⚡ |
| Reality | Blue-grey | DM Sans | 🌍 🏙️ 🚗 💼 🗺️ |
| Mystery | Amber | Playfair Display | 🔍 🕯️ 🗝️ 💀 🌫️ |

---

## Running locally

Two terminals.

**Terminal 1 — proxy server** (reads `.env`, serves OpenRouter key on port 3001):

```bash
node api/dev-server.js
```

**Terminal 2 — frontend** (Vite on 5173, proxies `/api/*` to 3001):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Turns 1–19 call the proxy; turn 20+ shows the user-key modal.

### Local `.env` (repo root, gitignored)

```env
OPENROUTER_KEY=sk-or-v1-...
```

Get a free OpenRouter key at [openrouter.ai](https://openrouter.ai). The free `openai/gpt-oss-20b:free` model is the only one the proxy will use.

---

## Deploying to Vercel

1. Push the repo to GitHub
2. Import the project in Vercel — **leave Root Directory blank**
3. Vercel auto-detects `vercel.json` and uses:
   - Build: `cd frontend && npm install && npm run build`
   - Output: `frontend/dist`
4. Add environment variable in **Settings → Environment Variables**:
   - `OPENROUTER_KEY` = `sk-or-v1-...` (Production + Preview)
5. Deploy

See [deployment.md](./deployment.md) for full instructions.

---

## Environment variables

| Variable | Where set | Description |
|---|---|---|
| `OPENROUTER_KEY` | `.env` (local) / Vercel dashboard (prod) | OpenRouter API key — server-side only |
| `ALLOWED_ORIGIN` | Vercel dashboard (optional) | Extra allowed CORS origin for a custom domain |

---

## Project structure

```
api/
  proxy.js         Vercel serverless function — proxies LLM calls with OPENROUTER_KEY
  dev-server.js    Local dev only — runs proxy.js on port 3001

frontend/
  src/
    adventure.jsx  Entire game UI — setup wizard, gameplay, all state
    api.js         LLM client — routes via /api/proxy or user's key
  vite.config.js   Proxies /api/* → localhost:3001 in dev

package.json       Minimal root package.json (required for Vercel function detection)
vercel.json        Build config + SPA catch-all rewrite
CLAUDE.md          Deep project guide for Claude Code
```

The `app/` FastAPI backend from the previous version has been removed. All runtime state lives in the browser; the only server-side code is the OpenRouter proxy.
