# AI Stock Portfolio Analyzer

An AI-powered portfolio briefing app that pulls financial news, summarizes each ticker, and creates a cross-portfolio risk narrative with Gemini. The app has a FastAPI backend, a Next.js frontend, Supabase persistence/auth, Yahoo Finance RSS ingestion, and optional Google Cloud Storage caching.

[Live demo](https://portfolio-summarizer-five.vercel.app)

## What It Does

- Creates, edits, and deletes named stock watchlists.
- Provides a no-login demo portfolio with AAPL, NVDA, TSLA, MSFT, GOOG, META, and AMZN.
- Fetches Yahoo Finance RSS articles and filters them for ticker relevance.
- Generates per-ticker summaries with sentiment, key risk, and key opportunity.
- Generates a portfolio-level briefing covering shared risks, concentration warnings, and a weekly watchlist.
- Supports on-demand analysis when a ticker does not have a recent cached summary.
- Lets signed-in users save a custom Gemini API key in browser local storage and send it via `X-Gemini-API-Key`.
- Shows quota/rate-limit alerts when the shared server key, demo key, or user key is exhausted.

## Tech Stack

Frontend:
- Next.js 16, React 19, TypeScript, Tailwind CSS 4
- Supabase client auth
- Vercel hosting

Backend:
- Python 3.11+, FastAPI, Uvicorn
- Supabase service-role access for portfolio and summary reads/writes
- Gemini 2.5 Flash via `google-genai`
- `sentence-transformers` relevance filtering
- Google Cloud Storage for article storage and narrative cache
- Deployable to Google Cloud Run

Data source:
- Yahoo Finance RSS

## Project Structure

```text
portfolio-summarizer/
  backend/
    main.py                    FastAPI routes and quota handling
    Dockerfile
    requirements.txt
    .env.example
    ai/
      summarizer.py            Per-ticker Gemini summaries
      risk_narrative.py        Cross-portfolio briefing generation
      storage.py               Supabase summary storage
      validate_key.py          Gemini API key validation
    ingestion/
      rss_scraper.py           Yahoo Finance RSS fetch + ticker validation
      relevance.py             Semantic relevance filtering
      pipeline.py              Scheduled ingestion orchestration
      storage.py               GCS article and narrative cache helpers
  frontend/
    app/
      dashboard/               Portfolio list, briefing, create, edit pages
      login/
      register/
      globals.css
    components/
      GeminiApiKeyCard.tsx
      NarrativePanel.tsx
      QuotaAlertBanner.tsx
      TickerCard.tsx
    lib/
      supabase.js
```

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

On Windows PowerShell, activate the environment with:

```powershell
.\venv\Scripts\Activate.ps1
```

Create `backend/.env` from `backend/.env.example`:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GCS_BUCKET_NAME=
GEMINI_API_KEY=
DEMO_GEMINI_API_KEY=
```

Run the backend:

```bash
uvicorn main:app --reload --port 8000
```

API docs are available at `http://127.0.0.1:8000/docs`.

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Run the frontend:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Supabase Tables

Create the core tables:

```sql
create table portfolios (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users,
  name text,
  tickers text[],
  created_at timestamptz default now()
);

create table summaries (
  id uuid default gen_random_uuid() primary key,
  ticker text,
  summary text,
  sentiment_score float,
  key_risk text,
  key_opportunity text,
  created_at timestamptz default now()
);
```

Enable RLS for client-side access patterns as needed. The backend uses `SUPABASE_SERVICE_ROLE_KEY` and scopes portfolio operations by `user_id`.

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/portfolio/{user_id}` | List portfolios for a user |
| `POST` | `/portfolio/{user_id}` | Create a portfolio with `tickers` and optional `name` |
| `PUT` | `/portfolio/{user_id}/{portfolio_id}` | Update a portfolio |
| `DELETE` | `/portfolio/{user_id}/{portfolio_id}` | Delete a portfolio |
| `GET` | `/portfolio/{user_id}/narrative/{portfolio_id}` | Return ticker summaries, portfolio narrative, and quota metadata |
| `GET` | `/summaries/{ticker}` | Return recent summaries for a ticker |
| `POST` | `/analyze/{ticker}` | Validate, fetch, filter, and summarize one ticker on demand |
| `POST` | `/validate-gemini-key` | Validate a Gemini key from `X-Gemini-API-Key` |
| `POST` | `/ingest` | Run the ingestion pipeline and clear narrative caches |

For demo narrative requests, the frontend can pass `?tickers=AAPL,NVDA,...` to avoid requiring a persisted demo portfolio. Signed-in custom-key requests pass `X-Gemini-API-Key`.

## Deployment

Backend deploys cleanly to Cloud Run from `backend/`. Configure:

```bash
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GCS_BUCKET_NAME
GEMINI_API_KEY
DEMO_GEMINI_API_KEY
```

Grant the Cloud Run service account access to the configured GCS bucket if article storage and narrative caching should be enabled.

Frontend deploys to Vercel from `frontend/`. Configure:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_API_URL
```

## Scheduled Ingestion

The backend exposes `POST /ingest` for scheduled runs. A Cloud Scheduler job can call it on weekdays after market close:

```bash
gcloud scheduler jobs create http daily-ingestion \
  --schedule="0 21 * * 1-5" \
  --uri="https://your-cloud-run-url.run.app/ingest" \
  --http-method=POST \
  --time-zone="America/New_York"
```

## Notes

- The frontend falls back to `http://127.0.0.1:8000` when `NEXT_PUBLIC_API_URL` is not set.
- Demo portfolio data is stored in browser `localStorage`.
- A user's custom Gemini key is also stored in browser `localStorage` under `gemini_api_key`.
