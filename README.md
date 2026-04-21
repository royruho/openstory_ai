# Choose Your Adventure

An AI-powered choose-your-own-adventure game with a FastAPI backend and React/Vite frontend.

![Adventure Image](./static/pixiquest_small1.png "Choose Your Adventure")

---

## Architecture

```
Browser
  │
  └─► React/Vite frontend (port 5173)
        │
        └─► FastAPI backend (port 8000)
              │
              ├─► LLM API (Groq / Gemini / Anthropic)
              │
              └─► SQLite (local) or PostgreSQL (cloud)
```

The frontend never calls the LLM directly. All AI requests go through the backend, which holds the API key, handles provider differences, and retries on rate limits.

---

## Features

### Setup wizard (9 steps)

1. **Language** — English, Hebrew, Arabic (full RTL support for Hebrew and Arabic)
2. **Genre** — Fantasy, Sci-Fi, Reality, Mystery — each with its own theme, fonts, and icon set
3. **Content rating** — Kids (8+), Teen (13+), Adult (18+)
4. **Story pacing** — Quick & Punchy (1–2 sentences), Balanced (paragraph), Rich & Immersive (2–3 paragraphs)
5. **Adventure length** — Sprint (5 turns / 1 chapter), Short (10 / 2), Standard (20 / 4), Epic (40 / 8)
6. **Game rules** — death possible / not; stat tracking on / off
7. **Narrative perspective** — First person ("I drew my sword") or Second person ("You draw your sword")
8. **Story seed** — optional premise text to steer the opening
9. **Character** — name, gender, age, appearance, and up to 3 skills (genre-specific list)

### Chapter-based structure

Adventures are divided into chapters, each with a **single overarching goal** the player must earn through play:

- The LLM generates a hidden chapter brief (`{title, goal, obstacle}`) once at the start of each chapter via a background call — it never changes mid-chapter
- The goal is always one broad objective, never a list of specific items or steps — the path to the goal emerges through play
- Chapter length is not fixed — it ends when the player achieves the goal, regardless of turn count
- Players can explore freely, hit dead ends, and attempt multiple approaches
- A cinematic banner fades in when a new chapter begins
- The active chapter title is shown in the game header

**Chapter count per adventure length:**

| Length | Turns | Chapters |
|---|---|---|
| Sprint | 5 | 1 |
| Short | 10 | 2 |
| Standard | 20 | 4 |
| Epic | 40 | 8 |

### Dice rolling (fate checks)

When the player attempts something risky, the LLM signals a fate check. A d6 overlay appears before the action resolves:

| Roll | Outcome | Effect |
|---|---|---|
| 1 | Critical Failure | Serious setback; health may drop |
| 2–3 | Setback | Complication or failure |
| 4–5 | Partial Success | Works, but with a catch |
| 6 | Critical Success | Exceptional result |

**Skill bonus**: if the attempt matches one of the character's skills, the die is rolled twice and the higher result is kept.

### Chapter progress tracking

Every turn, the LLM updates `chapterProgress`:

- **Achieved** — milestones completed toward the chapter goal (cumulative)
- **Clues** — hints and info discovered (cumulative)

Shown as tags in the game header and a sidebar panel.

### State consistency

The current values of stats and chapter progress are stamped into every outgoing LLM message. This prevents drift on long adventures where early history has been trimmed from the context window.

### Gameplay

- AI narrates the story in the chosen language and perspective
- Free-text action input is the primary way to play — players write what they want to do
- 2–5 suggested choices are shown below as quick-pick alternatives
- Optional stat tracking: health bar, inventory, relationships
- Story arc pacing — the LLM receives its current phase (Opening / Early / Middle / Late / Climax / Finale) so the story develops and concludes naturally

### Long-story context management

For long adventures the app uses a **rolling summary** to prevent the LLM from losing early details:

- Every 5 turns a background call (fired 20 s after the main turn) summarises key events, NPC relationships, locations, decisions, and active plot threads
- Only the last ~6 turns of raw dialogue are sent to the LLM; earlier history is covered by the summary
- Summarisation is skipped entirely for Sprint and Short adventures (≤ 10 turns)
- The LLM is told not to contradict any established facts

### Save / Export

- **Save Game** — downloads a `.json` snapshot of the full game state (including summary, chapter progress) — can be resumed later
- **Load Game** — file picker on the setup screen restores any saved `.json`
- **Export Story** — downloads a human-readable `.txt` transcript with character info, full story log (including dice results and chapter breaks), and final stats

### User accounts and persistence

- Play as a guest (no account required) — stories are not saved server-side
- Register / log in — each adventure is saved to the database as a `Story` with ordered `StoryPart` rows
- Auth uses JWT stored in `localStorage`

### Theming

Each genre has its own colour palette, fonts, background, and persistent icon strip:

| Genre | Colour | Font | Icons |
|---|---|---|---|
| Fantasy | Gold | Cinzel serif | ⚔️ 🧙 🐉 🏰 🌿 |
| Sci-Fi | Cyan | Orbitron | 🚀 🤖 👾 🛸 ⚡ |
| Reality | Blue-grey | DM Sans | 🌍 🏙️ 🚗 💼 🗺️ |
| Mystery | Amber | Playfair Display | 🔍 🕯️ 🗝️ 💀 🌫️ |

---

## Supported LLM providers

| Provider | Free tier | Model | Endpoint |
|---|---|---|---|
| **Gemini** (recommended) | 1,500 req/day, 1M TPM | `gemini-2.5-flash` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| **Groq** | 14,400 req/day, 6K TPM | `llama-3.3-70b-versatile` | `https://api.groq.com/openai/v1/chat/completions` |
| **Anthropic** | Paid | `claude-sonnet-4-6` | `https://api.anthropic.com/v1/messages` |

**Gemini 2.5 Flash** is recommended — 1,000,000 TPM means no rate-limit issues during play. Use model `gemini-2.5-flash` (not `gemini-2.0-flash`, which has zero free-tier quota in some regions). Get a free key at [aistudio.google.com](https://aistudio.google.com) → Get API key → Create API key in new project.

**Groq** works but its 6,000 TPM free-tier limit causes 429 errors during active play sessions.

The backend automatically retries on rate-limit (429) errors, parsing the `"try again in Xs"` hint from the error body and sleeping the exact wait time before retrying (up to 2 retries).

For Gemini models the backend automatically disables thinking (`reasoning_effort: none`) so all tokens go to the actual JSON response rather than internal reasoning.

LLM configuration can be changed at runtime without restarting the server via `POST /api/config/llm`.

---

## Quick start (Docker)

```bash
git clone <repo-url>
cd choose_your_adventure_claude

cp .env.example .env
# Edit .env — set LLM_API_KEY and LLM_ENDPOINT at minimum

docker compose up --build

# First run only:
docker compose exec backend alembic upgrade head
```

Open **http://localhost:5173**

See [deployment.md](./deployment.md) for detailed instructions including cloud deployment.

---

## Manual setup (without Docker)

### Backend

```bash
pip install -r requirements.txt
cp .env.example .env        # fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

Backend: http://localhost:8000  
API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Environment variables

**Backend (`.env`)**

| Variable | Description | Example |
|---|---|---|
| `LLM_ENDPOINT` | LLM API URL | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | API key | `AIza...` (Gemini) or `gsk_...` (Groq) |
| `LLM_MODEL` | Model name | `gemini-2.5-flash` |
| `LLM_MAX_TOKENS` | Max output tokens per call | `2000` |
| `SECRET_KEY` | JWT signing secret | any long random string |
| `DATABASE_URL` | DB connection | `sqlite:///./stories.db` |
| `CORS_ORIGINS` | Allowed origins | `http://localhost:5173` |

**Frontend (`frontend/.env`)**

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `http://localhost:8000` |

---

## Project structure

```
app/
  main.py         FastAPI app entry point, CORS, startup LLM check
  db_api.py       All API routes + rate-limit retry logic
  auth.py         JWT + bcrypt
  models.py       SQLAlchemy models (User, Story, StoryPart)
  crud.py         Database operations
  db.py           Engine — SQLite locally, PostgreSQL in cloud

frontend/
  src/
    adventure.jsx  Entire game UI (setup wizard + gameplay + dice + chapters)
    api.js         API client (all backend calls)
  Dockerfile

alembic/           Database migrations
Dockerfile         Backend container
docker-compose.yml Local dev orchestration
.env.example
deployment.md      Detailed deployment guide (local + cloud)
CLAUDE.md          Guide for Claude Code (AI assistant context)
```
#   o p e n s t o r y _ a i  
 