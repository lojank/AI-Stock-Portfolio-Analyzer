import feedparser
import httpx
import re
from bs4 import BeautifulSoup
from urllib.parse import quote

RSS_FEEDS = {
    "general": [
        "https://feeds.finance.yahoo.com/rss/2.0/headline",
        "https://feeds.reuters.com/reuters/businessNews",
        "https://feeds.a.dj.com/rss/RSSMarketsMain.xml"
    ]
}

KNOWN_BAD_TITLES = [
    "symbol lookup",
    "page not found",
    "no results"
]

# US-style symbols: 1-10 chars, letters/numbers/dots/hyphens, no spaces
TICKER_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9.-]{0,9}$")

def is_valid_ticker_format(ticker: str) -> bool:
    return bool(TICKER_PATTERN.match(ticker.upper().strip()))

def fetch_news(ticker: str) -> list[dict]:
    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={quote(ticker)}&region=US&lang=en-US"
    feed = feedparser.parse(url)
    
    # Empty feed = ticker likely invalid
    if not feed.entries:
        return []

    articles = []
    for entry in feed.entries[:10]:  # grab top 10
        # Sometimes yahoo returns a valid feed but the title indicates error
        if any(bad in entry.title.lower() for bad in KNOWN_BAD_TITLES):
            continue

        articles.append({
            "ticker": ticker,
            "title": entry.title,
            "summary": entry.get("summary", ""),
            "url": entry.links[0]["href"] if entry.links else entry.get("link", ""),
            "published": entry.get("published", ""),
            "source": "yahoo_rss"
        })
    return articles

def is_valid_ticker(ticker: str) -> bool:
    ticker = ticker.upper().strip()
    if not is_valid_ticker_format(ticker):
        return False

    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={quote(ticker)}&region=US&lang=en-US"
    feed = feedparser.parse(url)

    if not feed.entries:
        return False

    # If the feed has entries and any are a known error symbol lookup page, it's invalid
    for entry in feed.entries:
        if any(bad in entry.title.lower() for bad in KNOWN_BAD_TITLES):
            return False

    return True