# VibeTime (Feel-Good Calendar)

Conversational brutalist calendar: chat with the coach, realtime blocks in Supabase, Adventure Mode, unblock flow, thermal receipt.

## Setup

1. **Supabase** — Create a project, run the SQL in [`supabase/migrations/001_initial_schema.sql`](supabase/migrations/001_initial_schema.sql) (SQL editor or Supabase CLI migrations).  
   - If `alter publication supabase_realtime add table` errors (already added), skip those lines or use the dashboard to enable Realtime on `days` and `blocks`.

2. **Auth (no login UI)** — Prefer **Anonymous**: **Authentication → Providers → Anonymous** → enable.

   **Alternative:** add **`DEV_AUTO_EMAIL`** and **`DEV_AUTO_PASSWORD`** in `.env.local` for a normal user created in **Authentication → Users**. In **`npm run dev`**, bootstrap runs automatically without `ALLOW_DEV_AUTH_BOOTSTRAP`. For deployed builds, also set **`ALLOW_DEV_AUTH_BOOTSTRAP=1`** (unsafe for public prod — enable Anonymous instead).

3. **Env** — Copy [`.env.example`](.env.example) to `.env.local` and fill in:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY`
   - Optional: `GEMINI_MODEL` (primary; default chain tries `gemini-2.5-flash`, then `gemini-2.0-flash`, `gemini-1.5-flash`).
   - Optional: `GEMINI_MODEL_FALLBACKS` — comma-separated models tried after your primary (helpful when one model’s free-tier quota is **0/exhausted**).
   - If you still see HTTP 429, wait for the cooldown, enable billing on the Gemini project, or pick another model ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)).

4. **Install & run**

```bash
npm install --legacy-peer-deps
npm run dev
```

Open **`/today`** (or `/`).

## Scripts

- `npm run dev` — Dev server
- `npm run build` — Production build
- `npm run lint` — ESLint

## Stack

Next.js App Router · Supabase (Auth + Postgres + Realtime) · Gemini · Tailwind v4
# build-with-dev
