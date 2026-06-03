import hashlib
from datetime import datetime, timezone

from cachetools import TTLCache

SUMMARY_MAX_AGE_HOURS = 24
RATE_LIMIT_COOLDOWN_SECONDS = 900  # 15 minutes

RATE_LIMIT_KEY_RISK = "Gemini API rate limit or quota exceeded."

# ticker + api-key fingerprint -> cooldown after a rate-limit failure
RATE_LIMIT_CACHE: TTLCache = TTLCache(maxsize=500, ttl=RATE_LIMIT_COOLDOWN_SECONDS)


def _key_fingerprint(api_key: str | None) -> str:
    if not api_key:
        return "server"
    return hashlib.sha256(api_key.encode()).hexdigest()[:16]


def rate_limit_cache_key(ticker: str, api_key: str | None) -> str:
    return f"{ticker.upper()}:{_key_fingerprint(api_key)}"


def is_ticker_rate_limited(ticker: str, api_key: str | None) -> bool:
    return rate_limit_cache_key(ticker, api_key) in RATE_LIMIT_CACHE


def mark_ticker_rate_limited(ticker: str, api_key: str | None) -> None:
    RATE_LIMIT_CACHE[rate_limit_cache_key(ticker, api_key)] = True


def mark_tickers_rate_limited(tickers: list[str], api_key: str | None) -> None:
    for ticker in tickers:
        mark_ticker_rate_limited(ticker, api_key)


def summary_age_hours(summary: dict) -> float:
    raw = summary.get("created_at", "")
    if not raw:
        return float("inf")
    last_updated = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if last_updated.tzinfo is None:
        last_updated = last_updated.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - last_updated).total_seconds() / 3600


def summary_is_fresh(summary: dict, max_hours: float = SUMMARY_MAX_AGE_HOURS) -> bool:
    return summary_age_hours(summary) < max_hours


def is_rate_limit_summary(summary: dict) -> bool:
    key_risk = summary.get("key_risk") or ""
    summary_text = summary.get("summary") or ""
    return (
        key_risk == RATE_LIMIT_KEY_RISK
        or "Gemini API free tier daily quota" in summary_text
    )
