from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer("all-MiniLM-L6-v2")

# Cache for query embeddings to optimize performance
_QUERY_EMB_CACHE = {}

COMPANY_NAMES = {
    "AAPL": "Apple",
    "MSFT": "Microsoft",
    "GOOG": "Google",
    "GOOGL": "Google",
    "AMZN": "Amazon",
    "TSLA": "Tesla",
    "META": "Meta",
    "NVDA": "Nvidia",
    "NFLX": "Netflix",
    "AMD": "AMD",
    "INTC": "Intel",
    "LMT": "Lockheed Martin",
    "BA": "Boeing",
    "JPM": "JPMorgan Chase",
    "GS": "Goldman Sachs",
    "V": "Visa",
    "MA": "Mastercard",
    "DIS": "Disney",
    "CRM": "Salesforce",
    "ORCL": "Oracle",
    "PYPL": "PayPal",
    "SQ": "Block",
    "UBER": "Uber",
    "LYFT": "Lyft",
    "COIN": "Coinbase",
    "PLTR": "Palantir",
    "SNAP": "Snap",
    "SHOP": "Shopify",
    "WMT": "Walmart",
    "TGT": "Target",
    "COST": "Costco",
    "HD": "Home Depot",
    "JNJ": "Johnson & Johnson",
    "PFE": "Pfizer",
    "UNH": "UnitedHealth",
    "XOM": "Exxon Mobil",
    "CVX": "Chevron",
}

def is_relevant(article: dict, ticker: str, threshold: float = 0.4) -> bool:
    """Return True if article is meaningfully about this ticker"""
    company_name = COMPANY_NAMES.get(ticker.upper(), ticker.upper())
    query = f"News specifically about the company {company_name} ({ticker.upper()})"
    
    if query not in _QUERY_EMB_CACHE:
        _QUERY_EMB_CACHE[query] = model.encode(query)
        
    query_emb = _QUERY_EMB_CACHE[query]
    
    article_text = article["title"] + " " + article.get("summary", "")
    article_emb = model.encode(article_text)

    # Cosine similarity
    similarity = np.dot(query_emb, article_emb) / (
        np.linalg.norm(query_emb) * np.linalg.norm(article_emb)
    )
    return float(similarity) > threshold