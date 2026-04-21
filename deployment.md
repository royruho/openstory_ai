# Deployment Guide

OpenStory AI is a static React app with a single Vercel serverless function. There's no database, no backend server, and no user accounts — just the frontend plus `api/proxy.js` holding the OpenRouter key.

This guide covers:

1. **Local development** — running the proxy and frontend on your PC
2. **Cloud deployment** — pushing to Vercel

---

## Part 1 — Local development

### What you'll need

- **Node.js 20+** — download from [nodejs.org](https://nodejs.org)
- **Git** — to clone the project
- A **free OpenRouter API key** — see below

### Getting an OpenRouter key

1. Go to [openrouter.ai](https://openrouter.ai) and sign in
2. Click **Keys** → **Create Key**
3. Copy the key (starts with `sk-or-v1-`)

The app uses the free `openai/gpt-oss-20b:free` model — no billing setup required.

---

### Step 1 — Get the code

```bash
git clone <your-repo-url>
cd openstory_ai
```

### Step 2 — Create your `.env` file

Create a file called `.env` in the repo root (same folder as `vercel.json`):

```env
OPENROUTER_KEY=sk-or-v1-...your_key_here...
```

This file is gitignored and only read by the local dev server.

### Step 3 — Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 4 — Run the app (two terminals)

**Terminal 1 — proxy server** (loads `.env`, serves port 3001):

```bash
node api/dev-server.js
```

**Terminal 2 — frontend** (Vite on port 5173):

```bash
cd frontend
npm run dev
```

Open **http://localhost:5173**. The game works exactly as in production:

- Turns 1–19 call `POST /api/proxy` → proxied to OpenRouter with your `.env` key
- Turn 20+ shows the user-key modal

---

### Troubleshooting (local)

| Problem | Fix |
|---|---|
| `ECONNREFUSED` on `/api/proxy` | The proxy server isn't running — start Terminal 1 |
| "OPENROUTER_KEY not set" | Make sure `.env` is in the repo root and the dev-server was restarted after creating it |
| Port 5173 or 3001 already in use | Stop the other process, or edit the ports in `vite.config.js` / `api/dev-server.js` |
| 429 rate limit | The free OpenRouter model has modest rate limits — wait and retry |

---

## Part 2 — Deploy to Vercel

### One-time setup

1. **Push the repo to GitHub** (or GitLab/Bitbucket):

   ```bash
   git remote add origin https://github.com/<you>/openstory_ai.git
   git push -u origin main
   ```

2. **Import the project in Vercel**:
   - Go to [vercel.com](https://vercel.com) and sign in
   - Click **Add New → Project**
   - Select your GitHub repository
   - **Leave Root Directory blank** — the root `vercel.json` handles everything

3. **Verify build settings** (Vercel auto-detects these from `vercel.json`):

   | Field | Value |
   |---|---|
   | Build Command | `cd frontend && npm install && npm run build` |
   | Output Directory | `frontend/dist` |
   | Install Command | (leave default) |
   | Root Directory | (leave blank) |

4. **Add the environment variable**:
   - Go to **Settings → Environment Variables**
   - Add `OPENROUTER_KEY` = `sk-or-v1-...`
   - Check **Production** and **Preview**
   - Save

5. Click **Deploy**. First build takes ~60 seconds.

When it's done you'll get a URL like `https://openstory-ai.vercel.app`.

---

### How prod routing works

```
https://<your-app>.vercel.app/
  /api/proxy  → api/proxy.js (serverless function, reads OPENROUTER_KEY from env)
  /*          → frontend/dist/index.html (SPA catch-all via vercel.json rewrite)
```

The `OPENROUTER_KEY` is **only accessible inside the serverless function** — it is never sent to the browser. The browser posts game messages to `/api/proxy`; the function injects the key and forwards to OpenRouter.

---

### Re-deploying after code changes

```bash
git add .
git commit -m "your message"
git push
```

Vercel auto-deploys every push to `main`. Pushes to other branches create preview deployments with their own preview URL.

---

### Custom domain (optional)

If you point a custom domain at the Vercel project, set an extra env var so the proxy accepts requests from it:

1. **Settings → Environment Variables**
2. Add `ALLOWED_ORIGIN` = `https://yourdomain.com` (no trailing slash)
3. Redeploy

`api/proxy.js` already allows `http://localhost:5173` and any `https://choose-your-adventure*.vercel.app` domain — `ALLOWED_ORIGIN` adds your custom domain to the CORS allowlist.

---

### Cloud troubleshooting

| Problem | Fix |
|---|---|
| Build fails | Check build logs — usually a missing dependency in `frontend/package.json` or a Node version mismatch |
| `500` on `/api/proxy` | Open **Deployments → latest → Functions → proxy** and check logs. Most often the `OPENROUTER_KEY` env var is missing or blank |
| `403 CORS` in browser console | Your domain isn't in the allowlist — set `ALLOWED_ORIGIN` (see above) |
| `401` from OpenRouter | The `OPENROUTER_KEY` is invalid or revoked — regenerate at [openrouter.ai](https://openrouter.ai) and update the env var |
| Works on preview, fails on production | Verify `OPENROUTER_KEY` is set for the **Production** environment, not just Preview |

---

## Environment variable reference

| Variable | Where | Required | Description |
|---|---|---|---|
| `OPENROUTER_KEY` | `.env` (local) / Vercel env (prod) | Yes | OpenRouter API key. Server-side only — never exposed to the browser |
| `ALLOWED_ORIGIN` | Vercel env (prod) | No | Extra CORS-allowed origin for a custom domain |

That's it — no database URL, no JWT secret, no separate frontend env. The frontend is a static bundle; all runtime state lives in the browser.
