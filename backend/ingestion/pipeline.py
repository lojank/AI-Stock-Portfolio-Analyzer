from ingestion.rss_scraper import fetch_news
from ai.summarizer import summarize_articles
from ai.risk_narrative import generate_risk_narrative
from ai.storage import save_summary, get_summaries
from supabase import create_client
import os

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

DEFAULT_DEMO_TICKERS = frozenset({"AAPL", "NVDA", "TSLA", "MSFT", "GOOG", "META", "AMZN"})


def get_demo_gemini_api_key() -> str | None:
    key = os.getenv("DEMO_GEMINI_API_KEY", "").strip()
    return key or None


async def run_pipeline():
    # Get all unique tickers
    result = supabase.table("portfolios").select("tickers").execute()
    all_tickers = set(
        ticker.upper()
        for row in result.data
        for ticker in row["tickers"]
    )

    # Always include the default demo tickers so they are pre-analyzed and instant
    all_tickers.update(DEFAULT_DEMO_TICKERS)
    demo_api_key = get_demo_gemini_api_key()

    all_tickers = list(all_tickers)
    print(f"Processing {len(all_tickers)} tickers: {all_tickers}")

    portfolio_summaries = []

    for ticker in all_tickers:
        try:
            print(f"Fetching news for {ticker}...")
            articles = fetch_news(ticker)

            # Filter articles using SentenceTransformers relevance checker
            from ingestion.relevance import is_relevant
            relevant_articles = [a for a in articles if is_relevant(a, ticker)]
            print(f"Filtered {len(relevant_articles)} relevant articles (out of {len(articles)}) for {ticker}...")

            print(f"Summarizing {len(relevant_articles)} articles for {ticker}...")
            api_key = demo_api_key if ticker in DEFAULT_DEMO_TICKERS else None
            result = summarize_articles(ticker, relevant_articles, api_key=api_key)

            save_summary(result)
            portfolio_summaries.append(result)
            print(f"  {ticker} done - sentiment: {result.get('sentiment')}")
        except Exception as e:
            print(f"Error processing ticker {ticker} in pipeline: {e}")

    # Generate cross-portfolio narrative
    print("Generating portfolio risk narrative...")
    narrative = generate_risk_narrative(portfolio_summaries)
    print("\n=== PORTFOLIO NARRATIVE ===")
    print(narrative)

    return {
        "status": "ok",
        "tickers_processed": len(all_tickers),
        "narrative": narrative
    }