# UniMate AI — Student Life OS

A student productivity app with a real backend: timetable, tasks, assignments, attendance, GPA tracking, an AI study assistant, and account-based sync across devices.

## What's in here
- `src/` — the React (Vite) frontend
- `api/` — Vercel serverless functions (the backend)
  - `api/auth/signup.js`, `api/auth/login.js` — email/password accounts (JWT sessions)
  - `api/data.js` — saves/loads each user's full app state (tasks, timetable, grades, etc.)
  - `api/claude.js` — proxies AI Chat requests to Anthropic, keeping your API key server-side
- `lib/` — shared backend helpers (`db.js` for Postgres, `auth.js` for hashing/JWT)

## ⚠️ Important: upload these files directly into your repo root
Don't upload this as a nested folder (e.g. `YourRepo/UniMateAI/package.json`). `package.json`, `index.html`, `src/`, `api/`, and `lib/` must sit directly at the top level of your GitHub repo, or Vercel won't find them and you'll get a 404.

## Run locally
```
npm install
npm run dev
```
(The backend routes need real env vars to work locally — see below. Without them, the app still loads but signup/login/save will fail.)

## Deploy to Vercel

1. **Push these files to your GitHub repo root**, replacing everything currently there.
2. Import the repo at vercel.com (Framework Preset: Vite — auto-detected).
3. **Add a Postgres database:** in your Vercel project → Storage tab → Create Database → Postgres. Connect it to this project. Vercel automatically injects the `POSTGRES_URL` env vars your backend needs — no manual copying required.
4. **Add environment variables** in Settings → Environment Variables:
   - `JWT_SECRET` — any long random string (used to sign login sessions). You can generate one with `openssl rand -hex 32`.
   - `ANTHROPIC_API_KEY` — your key from console.anthropic.com (powers AI Chat).
5. Deploy (or redeploy if you already deployed before adding the database/env vars — env var changes require a redeploy to take effect).
6. Open your live URL, sign up with an email + password, and your data will now sync across any device you log into.

## How sync works
- Each user's entire app state (tasks, timetable, assignments, attendance, GPA, profile) is saved as one JSON document per account in Postgres.
- The app saves automatically ~800ms after you stop making changes (debounced), and reloads your latest data on login.
- A local `localStorage` copy is kept as an offline cache/fallback if the network is unavailable.

## Security notes
- Passwords are hashed with bcrypt before storage — never stored in plain text.
- Sessions are stateless JWTs valid for 30 days, sent as a Bearer token.
- The Anthropic API key never reaches the browser — only your `/api/claude` serverless function sees it.
