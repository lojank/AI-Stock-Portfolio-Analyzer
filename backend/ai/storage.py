from supabase import create_client
from datetime import datetime
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

def save_summary(result: dict):
    supabase.table("summaries").insert({
        "ticker": result["ticker"],
        "summary": result.get("summary", ""),
        "sentiment_score": map_sentiment(result.get("sentiment", "neutral")),
        "key_risk": result.get("key_risk", ""),
        "key_opportunity": result.get("key_opportunity", ""),
        "created_at": datetime.utcnow().isoformat()
    }).execute()

def get_summaries(ticker: str, limit: int = 30) -> list[dict]:
    result = supabase.table("summaries")\
        .select("*")\
        .eq("ticker", ticker)\
        .order("created_at", desc=True)\
        .limit(limit)\
        .execute()
    return result.data

def map_sentiment(sentiment: str) -> float:
    return {"positive": 1.0, "neutral": 0.0, "negative": -1.0}.get(sentiment, 0.0)