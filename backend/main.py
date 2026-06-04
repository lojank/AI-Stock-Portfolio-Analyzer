import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from ingestion.pipeline import run_pipeline
from ai.storage import get_summaries, save_summary
from ai.risk_narrative import generate_risk_narrative
from ingestion.rss_scraper import fetch_news, is_valid_ticker, is_valid_ticker_format
from ai.summarizer import summarize_articles, summarize_articles_batch
from ai.validate_key import validate_gemini_api_key
from ai.summary_cache import (
    is_rate_limit_summary,
    is_ticker_rate_limited,
    mark_ticker_rate_limited,
    summary_is_fresh,
)
from ingestion.storage import get_cached_narrative, save_cached_narrative
from cachetools import TTLCache
from typing import Optional

app = FastAPI(title="AI Stock Portfolio Analyzer")

# In-memory cache to save GCS latency (100 items max, 24 hr TTL)
NARRATIVE_MEMORY_CACHE = TTLCache(maxsize=100, ttl=86400)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

# Local helper functions for API keys and quota limits

def resolve_gemini_api_key(*, is_demo: bool, header_key: str | None) -> tuple[str | None, bool]:
    if is_demo:
        key = os.getenv("DEMO_GEMINI_API_KEY", "").strip()
        return key or None, False
    if header_key and header_key.strip():
        return header_key.strip(), True
    return None, False

def is_rate_limit_narrative(narrative: str) -> bool:
    if not narrative:
        return False
    lower = narrative.lower()
    quota_signal = "exceeded" in lower or "unavailable" in lower or "constraints" in lower
    return "rate limit" in lower or ("quota" in lower and quota_signal)

def _quota_message(
    *,
    status: str,
    used_custom_key: bool,
    failed_tickers: list[str],
    narrative_limited: bool,
    is_demo: bool,
    using_demo_key: bool,
) -> str:
    tickers_note = f" ({', '.join(failed_tickers)})" if failed_tickers else ""

    if status == "server_exhausted":
        if is_demo and using_demo_key:
            return (
                "Demo briefings are temporarily unavailable due to API limits. "
                "Please try again later, or sign in to use your own Gemini API key."
            )
        if is_demo:
            return (
                "The shared briefing API limit for demo mode has been reached. "
                "Sign in and add your own Gemini API key on the Dashboard to generate briefings with your personal quota."
            )
        return (
            "The app's shared Gemini API quota has been used up for now. "
            "Add your own free API key on the Dashboard - briefings will then use your personal quota instead."
        )

    if status == "user_exhausted":
        return (
            "Your Gemini API key has reached its rate or daily quota limit. "
            "Limits typically reset at midnight Pacific time. "
            "Check usage at https://ai.dev/rate-limit or try again later."
        )

    parts = []
    if failed_tickers:
        if used_custom_key:
            parts.append(
                f"These asset briefings could not be generated because your API key hit its quota limit{tickers_note}."
            )
        elif is_demo and using_demo_key:
            parts.append(
                f"These demo briefings are temporarily unavailable{tickers_note}. Try again later or sign in to use your own API key."
            )
        elif is_demo:
            parts.append(
                f"These asset briefings are unavailable because the shared API limit was reached{tickers_note}. Sign in to use your own API key."
            )
        else:
            parts.append(
                f"These asset briefings could not be generated because the shared API limit was reached{tickers_note}. "
                "Add your own API key on the Dashboard to continue."
            )
    if narrative_limited:
        parts.append(
            "The portfolio overview could not be generated due to API limits; individual briefings below may still be available."
        )
    return " ".join(parts)

def build_api_quota(
    *,
    used_custom_key: bool,
    rate_limited_tickers: list[str],
    summaries: list[dict],
    narrative: str,
    is_demo: bool,
    using_demo_key: bool = False,
) -> dict:
    failed_tickers = list(dict.fromkeys(rate_limited_tickers))
    narrative_limited = is_rate_limit_narrative(narrative)

    if not failed_tickers and not narrative_limited:
        return {
            "status": "ok",
            "used_custom_key": used_custom_key,
            "using_demo_key": using_demo_key,
            "failed_tickers": [],
            "narrative_limited": False,
            "message": "",
        }

    if len(summaries) == 0 and (failed_tickers or narrative_limited):
        status = "user_exhausted" if used_custom_key else "server_exhausted"
    else:
        status = "partial"

    message = _quota_message(
        status=status,
        used_custom_key=used_custom_key,
        failed_tickers=failed_tickers,
        narrative_limited=narrative_limited,
        is_demo=is_demo,
        using_demo_key=using_demo_key,
    )

    return {
        "status": status,
        "used_custom_key": used_custom_key,
        "using_demo_key": using_demo_key,
        "failed_tickers": failed_tickers,
        "narrative_limited": narrative_limited,
        "message": message,
    }

class PortfolioRequest(BaseModel):
    tickers: list[str]
    name: Optional[str] = None

@app.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    result = supabase.table("portfolios").select("*").eq("user_id", user_id).order("created_at").execute()
    return result.data

@app.post("/portfolio/{user_id}")
def save_portfolio(user_id: str, request: PortfolioRequest):
    # Check for duplicates
    existing = supabase.table("portfolios").select("*").eq("user_id", user_id).execute()
    new_tickers_sorted = sorted(request.tickers)
    
    for p in existing.data:
        if sorted(p.get("tickers", [])) == new_tickers_sorted:
            # Return the existing duplicate to avoid creating a new one
            return p

    result = supabase.table("portfolios").upsert({
        "user_id": user_id,
        "tickers": request.tickers,
        "name": request.name
    }).execute()
    return result.data

@app.put("/portfolio/{user_id}/{portfolio_id}")
def update_portfolio(user_id: str, portfolio_id: str, request: PortfolioRequest):
    result = supabase.table("portfolios").update({
        "tickers": request.tickers,
        "name": request.name
    }).eq("id", portfolio_id).eq("user_id", user_id).execute()
    return result.data

@app.delete("/portfolio/{user_id}/{portfolio_id}")
def delete_portfolio(user_id: str, portfolio_id: str):
    result = supabase.table("portfolios").delete().eq("id", portfolio_id).eq("user_id", user_id).execute()
    return result.data

@app.post("/ingest")
async def trigger_ingestion():
    # Clear both L1 and L2 caches when a new ingestion runs
    NARRATIVE_MEMORY_CACHE.clear()
    from ingestion.storage import clear_narrative_cache
    try:
        clear_narrative_cache()
    except Exception as e:
        print(f"Failed to clear GCS narrative cache: {e}")

    result = await run_pipeline()
    return result

@app.get("/summaries/{ticker}")
def get_ticker_summary(ticker: str):
    return get_summaries(ticker.upper())


@app.post("/validate-gemini-key")
async def validate_gemini_key_endpoint(x_gemini_api_key: Optional[str] = Header(None)):
    if not x_gemini_api_key or not x_gemini_api_key.strip():
        return {
            "valid": False,
            "status": "missing",
            "message": "Enter an API key to validate.",
        }
    return validate_gemini_api_key(x_gemini_api_key.strip())


@app.get("/validate-ticker/{ticker}")
def validate_ticker_endpoint(ticker: str):
    ticker = ticker.upper().strip()
    if not is_valid_ticker_format(ticker):
        return {
            "valid": False,
            "status": "invalid_ticker",
            "message": f"{ticker} is not a valid ticker symbol. Use 1–10 letters, numbers, dots, or hyphens with no spaces.",
        }
    if not is_valid_ticker(ticker):
        return {
            "valid": False,
            "status": "invalid_ticker",
            "message": f"{ticker} doesn't appear to be a valid ticker. Please check the symbol and try again.",
        }
    return {
        "valid": True,
        "status": "ok",
        "message": f"{ticker} is valid.",
    }


def _fetch_relevant_articles(ticker: str) -> list[dict]:
    from ingestion.relevance import is_relevant

    articles = fetch_news(ticker)
    if not articles:
        return []
    relevant_articles = [a for a in articles if is_relevant(a, ticker)]
    if not relevant_articles:
        relevant_articles = articles[:5]
    return relevant_articles


def _run_batch_on_demand_analysis(
    tickers: list[str],
    gemini_api_key: str | None,
    rate_limited_tickers: list[str],
) -> list[dict]:
    """Fetch news and batch-summarize uncached tickers."""
    ticker_articles: dict[str, list[dict]] = {}
    new_summaries: list[dict] = []

    for ticker in tickers:
        if is_ticker_rate_limited(ticker, gemini_api_key):
            rate_limited_tickers.append(ticker)
            continue
        articles = _fetch_relevant_articles(ticker)
        if articles:
            ticker_articles[ticker] = articles
            print(f"  {ticker}: queued {len(articles)} articles for batch analysis")
        else:
            print(f"  {ticker}: no articles found from RSS feed")

    if not ticker_articles:
        return new_summaries

    print(f"Batch analyzing {len(ticker_articles)} tickers: {list(ticker_articles.keys())}")
    results = summarize_articles_batch(ticker_articles, api_key=gemini_api_key)

    for ticker, result in results.items():
        if is_rate_limit_summary(result):
            mark_ticker_rate_limited(ticker, gemini_api_key)
            rate_limited_tickers.append(ticker)
            print(f"  {ticker}: analysis returned rate-limit error")
        else:
            save_summary(result)
            new_summaries.append(result)
            print(f"  {ticker}: analysis saved successfully")

    return new_summaries


def _narrative_payload(
    narrative: str,
    summaries: list,
    tickers_list: list,
    used_custom_key: bool,
    rate_limited_tickers: list,
    is_demo: bool,
    using_demo_key: bool,
) -> dict:
    return {
        "narrative": narrative,
        "summaries": summaries,
        "tickers": tickers_list,
        "api_quota": build_api_quota(
            used_custom_key=used_custom_key,
            rate_limited_tickers=rate_limited_tickers,
            summaries=summaries,
            narrative=narrative,
            is_demo=is_demo,
            using_demo_key=using_demo_key,
        ),
    }


@app.get("/portfolio/{user_id}/narrative/{portfolio_id}")
async def get_portfolio_narrative(user_id: str, portfolio_id: str, tickers: Optional[str] = None, x_gemini_api_key: Optional[str] = Header(None)):
    is_demo = user_id == "demo"
    gemini_api_key, used_custom_key = resolve_gemini_api_key(
        is_demo=is_demo, header_key=x_gemini_api_key
    )
    using_demo_key = is_demo and bool(gemini_api_key)
    rate_limited_tickers: list[str] = []

    if is_demo and tickers:
        tickers_list = [t.strip().upper() for t in tickers.split(",") if t.strip()]
    else:
        # Get user's tickers for the specific portfolio
        port = supabase.table("portfolios")\
            .select("tickers")\
            .eq("id", portfolio_id)\
            .eq("user_id", user_id)\
            .execute()

        if not port.data:
            return {"error": "Portfolio not found"}

        tickers_list = port.data[0]["tickers"]

    # Get latest summary for each ticker (24h TTL, skip rate-limit cooldown)
    summaries = []
    tickers_needing_analysis = []
    for ticker in tickers_list:
        if is_ticker_rate_limited(ticker, gemini_api_key):
            rate_limited_tickers.append(ticker)
            continue

        data = get_summaries(ticker, limit=1)
        if data and not is_rate_limit_summary(data[0]) and summary_is_fresh(data[0]):
            summaries.append(data[0])
        else:
            tickers_needing_analysis.append(ticker)

    # Batch on-demand analysis for stale or missing summaries
    if tickers_needing_analysis:
        print(f"Tickers needing on-demand analysis: {tickers_needing_analysis}")
        summaries.extend(
            _run_batch_on_demand_analysis(
                tickers_needing_analysis,
                gemini_api_key,
                rate_limited_tickers,
            )
        )

    if not summaries:
        return _narrative_payload(
            "No portfolio data available.",
            [],
            tickers_list,
            used_custom_key,
            rate_limited_tickers,
            is_demo,
            using_demo_key,
        )

    # Generate a cache key based on the sorted list of tickers and their latest summary timestamps
    import hashlib
    sorted_summaries = sorted(summaries, key=lambda s: s["ticker"])
    key_components = [f"{s['ticker']}:{s.get('created_at', '')}" for s in sorted_summaries]
    cache_string = "|".join(key_components)
    cache_key = hashlib.sha256(cache_string.encode()).hexdigest()

    # L1 Cache Check (Memory)
    if cache_key in NARRATIVE_MEMORY_CACHE:
        return _narrative_payload(
            NARRATIVE_MEMORY_CACHE[cache_key],
            summaries,
            tickers_list,
            used_custom_key,
            rate_limited_tickers,
            is_demo,
            using_demo_key,
        )

    # L2 Cache Check (GCS)
    try:
        cached_narrative = get_cached_narrative(cache_key)
        if cached_narrative:
            NARRATIVE_MEMORY_CACHE[cache_key] = cached_narrative
            return _narrative_payload(
                cached_narrative,
                summaries,
                tickers_list,
                used_custom_key,
                rate_limited_tickers,
                is_demo,
                using_demo_key,
            )
    except Exception as e:
        print(f"Error checking GCS cache (L2 cache bypass): {e}")

    # Cache miss - generate new narrative and save to both caches (unless rate-limited)
    narrative = generate_risk_narrative(summaries, api_key=gemini_api_key)
    
    if not is_rate_limit_narrative(narrative):
        try:
            save_cached_narrative(cache_key, narrative)
        except Exception as e:
            print(f"Error saving to GCS cache (ignoring): {e}")
        NARRATIVE_MEMORY_CACHE[cache_key] = narrative

    return _narrative_payload(
        narrative,
        summaries,
        tickers_list,
        used_custom_key,
        rate_limited_tickers,
        is_demo,
        using_demo_key,
    )

@app.post("/analyze/{ticker}")
async def analyze_ticker(ticker: str, x_gemini_api_key: Optional[str] = Header(None)):
    ticker = ticker.upper()

    # Validate ticker exists
    if not is_valid_ticker(ticker):
        return {
            "status": "invalid_ticker",
            "message": f"{ticker} doesn't appear to be a valid ticker. Please check the symbol and try again."
        }

    # Check if we already have a recent summary (within 24 hours)
    existing = supabase.table("summaries")\
        .select("*")\
        .eq("ticker", ticker)\
        .order("created_at", desc=True)\
        .limit(1)\
        .execute()

    if existing.data:
        summary_data = existing.data[0]
        if not is_rate_limit_summary(summary_data) and summary_is_fresh(summary_data):
            return {"status": "cached", "data": summary_data}

    if is_ticker_rate_limited(ticker, x_gemini_api_key):
        return {
            "status": "error",
            "message": f"{ticker} briefing temporarily unavailable due to API rate limits. Try again in about 15 minutes.",
        }

    # No recent summary - fetch and summarize now
    relevant_articles = _fetch_relevant_articles(ticker)
    if not relevant_articles:
        return {"status": "error", "message": f"No news found for {ticker}"}

    result = summarize_articles(ticker, relevant_articles, api_key=x_gemini_api_key)

    if is_rate_limit_summary(result):
        mark_ticker_rate_limited(ticker, x_gemini_api_key)
    else:
        save_summary(result)

    return {"status": "ok", "data": result}