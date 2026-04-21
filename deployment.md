# Deployment Guide

This guide covers two ways to run the app:

1. **Local** — everything runs on your Windows PC inside Docker (great for development and testing)
2. **Cloud** — frontend on Vercel, backend on Render, database on Aiven, AI on Gemini

> **Recommended LLM**: **Gemini 2.5 Flash** via Google AI Studio — free, 1,000,000 TPM, no rate-limit issues during play. The backend automatically disables Gemini's internal thinking for JSON generation calls (thinking wastes tokens without improving structured output).
>
> **Rate limits**: The backend automatically retries on LLM rate-limit errors (HTTP 429), sleeping the exact wait time specified in the error response before retrying — up to 2 retries per request. If all retries fail the player sees a friendly "please wait and try again" message.

---

## Part 1 — Local Deployment with Docker on Windows

### What you'll need

- **Docker Desktop for Windows** — download from [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
  - During install, choose "WSL 2" backend when prompted (it's faster)
  - After install, open Docker Desktop and wait for the whale icon in the system tray to stop animating — that means it's ready
- **Git** — to clone the project (or just download the ZIP from GitHub)
- A **Gemini API key** — see Step 2 below for how to get one (free, 2 minutes)

---

### Step 1 — Get the code

Open **PowerShell** or **Windows Terminal** and run:

```powershell
git clone <your-repo-url>
cd choose_your_adventure_claude
```

---

### Step 2 — Create your `.env` file

The backend reads its configuration from a `.env` file. There's a template already in the project called `.env.example`. Copy it:

```powershell
copy .env.example .env
```

Now open `.env` in Notepad (or any text editor) and fill in your values:

```env
# ── LLM provider (choose one) ──────────────────────────────────────
# Gemini 2.5 Flash (recommended — free, 1M TPM, no rate-limit issues)
LLM_ENDPOINT=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
LLM_API_KEY=AIza...your_gemini_key_here...
LLM_MODEL=gemini-2.5-flash

# Groq alternative (free but tight TPM limits — may rate-limit during active play)
# LLM_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
# LLM_API_KEY=gsk_...your_groq_key_here...
# LLM_MODEL=llama-3.3-70b-versatile

# Anthropic (paid)
# LLM_ENDPOINT=https://api.anthropic.com/v1/messages
# LLM_API_KEY=sk-ant-...
# LLM_MODEL=claude-sonnet-4-20250514

LLM_MAX_TOKENS=2000

# Make up any random string — used to sign login tokens
SECRET_KEY=some-long-random-string-change-this

# Allow the frontend (running on port 5173) to talk to the backend
CORS_ORIGINS=http://localhost:5173
```

> **How to get a free Gemini API key (recommended):**
> 1. Go to **[aistudio.google.com](https://aistudio.google.com)** — you must use AI Studio, not the Google Cloud Console. These are different services; only AI Studio gives a free-tier key.
> 2. Sign in with your Google account
> 3. Click **"Get API key"** in the left sidebar → **"Create API key"** → **"Create API key in new project"**
> 4. Copy the key (starts with `AIza`) and paste it into your `.env`
> 5. Use model `gemini-2.5-flash` — this is the correct model for the free tier. `gemini-2.0-flash` has zero free-tier quota in some regions (including Israel).
> 6. Free tier: 1,500 requests/day, **1,000,000 tokens/minute** — no rate-limit issues during play

> **How to get a free Groq API key (alternative):**
> 1. Go to [console.groq.com](https://console.groq.com)
> 2. Sign up (free, no credit card)
> 3. Click **"API Keys"** → **"Create API Key"**
> 4. Copy the key (starts with `gsk_`) and paste it into your `.env`
> 5. Note: free tier is limited to 6,000 tokens/minute on Llama 3.3 70B — you may hit rate limits during active play sessions

---

### Step 3 — Build and start the app

Make sure Docker Desktop is running (whale icon in system tray), then:

```powershell
docker compose up --build
```

The first time you run this it will:
- Download the Python and Node base images (~a few minutes depending on your internet)
- Install all Python and JavaScript dependencies
- Build both the backend and frontend containers

You'll see log output scrolling from both services. When you see something like:

```
backend-1   | INFO:     Uvicorn running on http://0.0.0.0:8000
frontend-1  | VITE ready in 400ms
frontend-1  |   ➜  Local:   http://localhost:5173/
```

...the app is ready.

---

### Step 4 — Set up the database (first time only)

The backend container is running, but the database tables haven't been created yet. Open a **second terminal** (leave the first one running) and run:

```powershell
docker compose exec backend alembic upgrade head
```

You should see:

```
INFO  [alembic.runtime.migration] Running upgrade  -> d5641e165982, init
INFO  [alembic.runtime.migration] Running upgrade d5641e165982 -> a1b2c3d4e5f6, add json fields
```

This only needs to be done once. The SQLite database file is stored in a Docker volume, so it survives container restarts.

---

### Step 5 — Open the app

Go to **[http://localhost:5173](http://localhost:5173)** in your browser. You should see the adventure game.

The backend API docs (useful for debugging) are at **[http://localhost:8000/docs](http://localhost:8000/docs)**.

---

### Day-to-day usage

**Start the app:**
```powershell
docker compose up
```

**Stop the app:**
Press `Ctrl+C` in the terminal, or in a separate terminal:
```powershell
docker compose down
```

**See logs from just one service:**
```powershell
docker compose logs backend
docker compose logs frontend
```

**Rebuild after changing code:**
```powershell
docker compose up --build
```

---

### Troubleshooting

| Problem | Fix |
|---|---|
| "Docker daemon not running" | Open Docker Desktop and wait for it to fully start |
| Port 8000 or 5173 already in use | Something else is using that port. Stop that process, or edit the ports in `docker-compose.yml` |
| "LLM API key not configured" error | Check that `.env` has `LLM_API_KEY` set and isn't blank |
| Frontend says "Cannot connect to backend" | Make sure both containers are running: `docker compose ps` |
| Database errors after code changes | Run `docker compose exec backend alembic upgrade head` again |

---

---

## Part 2 — Cloud Deployment (Gemini 2.5 Flash + Aiven + Render + Vercel)

### Architecture overview

```
Browser
  │
  ├─► Vercel      (frontend — React/Vite, static files, global CDN)
  │
  └─► Render      (backend — FastAPI Python, free web service)
        │
        ├─► Google Gemini 2.5 Flash  (AI — free tier, AI Studio key)
        │
        └─► Aiven                    (PostgreSQL database — free tier)
```

Everything is free tier. The only cost is your time.

> **One thing to know about Render's free tier:** the backend "sleeps" after 15 minutes of no traffic and takes about 30 seconds to wake up on the next request. This is fine for a personal project. The frontend on Vercel is always instant.

---

### Step 1 — Set up your Aiven PostgreSQL database

Aiven gives you a managed PostgreSQL database for free.

1. Go to [aiven.io](https://aiven.io) and create a free account
2. Click **"Create service"**
3. Choose **PostgreSQL**
4. Select **Free plan** (look for the "Free" badge)
5. Pick any cloud region close to you
6. Give it any name, e.g. `adventure-db`
7. Click **"Create service"** and wait ~2 minutes for it to provision

Once it's running:

8. Click on your new service to open it
9. Go to the **"Overview"** tab
10. Find the **"Connection information"** section
11. Click **"Connection string"** — it looks like this:
    ```
    postgres://avnadmin:AVNS_xxxxxxxx@pg-adventure-yourname.aivencloud.com:12345/defaultdb?sslmode=require
    ```
12. **Copy this entire string** — you'll need it shortly

---

### Step 2 — Run the database migrations against Aiven (one time)

You need to create the tables in the Aiven database. The easiest way is to run Alembic from your local machine pointing at the cloud database.

On your PC, open PowerShell and run (replace the URL with your actual Aiven connection string):

```powershell
# Windows PowerShell
$env:DATABASE_URL="postgres://avnadmin:AVNS_xxx@your-host.aivencloud.com:PORT/defaultdb?sslmode=require"
alembic upgrade head
```

> If you don't have Python/alembic installed locally, you can also run this from inside the Docker container:
> ```powershell
> docker compose up -d backend
> docker compose exec -e DATABASE_URL="postgres://..." backend alembic upgrade head
> ```

You should see the same migration messages as before. Your cloud database is now ready.

---

### Step 3 — Deploy the backend to Render

Render can deploy directly from your GitHub repository.

**First, push your code to GitHub** if you haven't already:
```powershell
git add .
git commit -m "add deployment files"
git push
```

**Then on Render:**

1. Go to [render.com](https://render.com) and sign up (use your GitHub account — easier)
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect a repository"** and select your repo
4. Fill in the settings:

   | Field | Value |
   |---|---|
   | **Name** | `adventure-backend` (or anything) |
   | **Region** | Closest to you |
   | **Branch** | `main` |
   | **Runtime** | `Docker` |
   | **Dockerfile path** | `./Dockerfile` |
   | **Instance type** | **Free** |

5. Scroll down to **"Environment Variables"** and add all of these:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Your Aiven connection string from Step 1 |
   | `LLM_API_KEY` | Your Gemini AI Studio key (`AIza...`) |
   | `LLM_ENDPOINT` | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
   | `LLM_MODEL` | `gemini-2.5-flash` |
   | `LLM_MAX_TOKENS` | `2000` |
   | `SECRET_KEY` | Any long random string (e.g. generate one at [randomkeygen.com](https://randomkeygen.com)) |
   | `CORS_ORIGINS` | `https://your-app.vercel.app` (you'll update this after Vercel deploy) |

6. Click **"Create Web Service"**

Render will pull your code, build the Docker image, and deploy it. This takes 3–5 minutes the first time. Watch the logs — when you see `Uvicorn running on http://0.0.0.0:8000` it's live.

7. Note your backend URL — it will look like `https://adventure-backend-xxxx.onrender.com`

---

### Step 4 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (use your GitHub account)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect it but you need to tell it where the frontend lives:

   | Field | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | `Vite` |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

5. Expand **"Environment Variables"** and add:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | Your Render backend URL from Step 3, e.g. `https://adventure-backend-xxxx.onrender.com` |

6. Click **"Deploy"**

Vercel builds and deploys in about 60 seconds. When it's done you'll get a URL like `https://your-app.vercel.app`.

---

### Step 5 — Wire backend CORS to the Vercel URL

The backend needs to know the frontend's URL so it allows requests from it.

1. Go back to your service on [render.com](https://render.com)
2. Go to **"Environment"** tab
3. Find `CORS_ORIGINS` and update it to your actual Vercel URL:
   ```
   https://your-app.vercel.app
   ```
4. Click **"Save Changes"** — Render will automatically redeploy

---

### Step 6 — Test the full cloud setup

1. Open your Vercel URL in the browser
2. Play through the game setup and start an adventure
3. The first request after a period of inactivity will be slow (~30 seconds) because Render's free tier is waking up — subsequent requests are fast

**To verify the backend is healthy**, visit:
```
https://adventure-backend-xxxx.onrender.com/api/health
```
You should see `{"status": "ok"}`.

**To check which LLM is configured**, visit:
```
https://adventure-backend-xxxx.onrender.com/api/config/llm
```

---

### Updating the app after code changes

**Backend:** Push to GitHub → Render auto-deploys (takes ~3 minutes)

**Frontend:** Push to GitHub → Vercel auto-deploys (takes ~60 seconds)

Both services watch your `main` branch and redeploy automatically on every push.

---

### Cloud troubleshooting

| Problem | Fix |
|---|---|
| Render deploy fails | Check the build logs on Render — usually a missing dependency or wrong Dockerfile path |
| "LLM API key not configured" | Double-check the `LLM_API_KEY` environment variable on Render (no quotes, no spaces) |
| Database connection errors | Make sure `DATABASE_URL` on Render is the full Aiven string including `?sslmode=require` at the end |
| CORS errors in browser console | Update `CORS_ORIGINS` on Render to match your exact Vercel URL (no trailing slash) |
| Vercel build fails | Make sure **Root Directory** is set to `frontend` in the Vercel project settings |
| First request is very slow | Normal — Render free tier sleeps. The game works fine after the first wake-up |
| Alembic migration needed after model changes | Run `alembic upgrade head` locally with `DATABASE_URL` set to your Aiven URL |

---

### Environment variable reference

**Backend (Render / local `.env`)**

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Database connection string | `sqlite:///./data/stories.db` or Aiven URL |
| `LLM_ENDPOINT` | URL of the LLM API | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| `LLM_API_KEY` | Your API key | `AIza...` (Gemini) or `gsk_...` (Groq) |
| `LLM_MODEL` | Model name | `gemini-2.5-flash` |
| `LLM_MAX_TOKENS` | Max output tokens per call | `2000` (higher needed for Gemini 2.5 Flash which uses thinking tokens) |
| `SECRET_KEY` | JWT signing secret | Any long random string |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173` |

**Frontend (Vercel / `frontend/.env`)**

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend URL (no trailing slash) | `https://adventure-backend-xxxx.onrender.com` |
