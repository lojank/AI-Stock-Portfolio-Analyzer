from google import genai
import os
import re

from ai.summary_cache import RATE_LIMIT_KEY_RISK

client = genai.Client()

MODEL = "gemini-2.5-flash"
BATCH_MAX_TICKERS = 6
BATCH_MAX_ARTICLES_PER_TICKER = 3


def _extract_section(section_name: str, raw_text: str) -> str:
    pattern = (
        rf"(?i)(?:\*\*|)\s*{section_name}\s*(?:\*\*|)\s*:\s*"
        rf"(.*?)(?=\n(?:\*\*|)\s*(?:SUMMARY|SENTIMENT|KEY_RISKS|KEY_OPPORTUNITY)\s*(?:\*\*|)\s*:|$)"
    )
    match = re.search(pattern, raw_text, re.DOTALL)
    return match.group(1).strip() if match else ""


def _parse_summary_block(ticker: str, text: str) -> dict:
    return {
        "ticker": ticker,
        "raw": text,
        "summary": _extract_section("SUMMARY", text),
        "sentiment": _extract_section("SENTIMENT", text).lower() or "neutral",
        "key_risk": _extract_section("KEY_RISKS", text),
        "key_opportunity": _extract_section("KEY_OPPORTUNITY", text),
    }


def _rate_limit_result(ticker: str, error: str = "") -> dict:
    return {
        "ticker": ticker,
        "raw": f"Error: {error}" if error else "",
        "summary": (
            f"Recent news summaries for {ticker} could not be generated because the Gemini API "
            "free tier daily quota or rate limit has been reached."
        ),
        "sentiment": "neutral",
        "key_risk": RATE_LIMIT_KEY_RISK,
        "key_opportunity": "N/A",
    }


def _is_rate_limit_error(err: str) -> bool:
    return "429" in err or "RESOURCE_EXHAUSTED" in err


def summarize_articles(ticker: str, articles: list[dict], api_key: str = None) -> dict:
    if not articles:
        return {"ticker": ticker, "summary": "No recent news found.", "sentiment": "neutral"}

    local_client = genai.Client(api_key=api_key) if api_key else client

    articles_text = "\n\n".join(
        f"Title: {a['title']}\nSummary: {a['summary']}"
        for a in articles[:10]
    )

    prompt = f"""You are a financial analyst. Analyze these recent news articles about {ticker} stock.

{articles_text}

Respond in this exact format:
SUMMARY: A 3-4 sentence summary of the most important developments for {ticker} investors.
SENTIMENT: One word only: Positive, Negative, or Neutral.
KEY_RISKS: One sentence describing the biggest risk mentioned.
KEY_OPPORTUNITY: One sentence describing the biggest opportunity mentioned."""

    try:
        response = local_client.models.generate_content(model=MODEL, contents=prompt)
        return _parse_summary_block(ticker, response.text)
    except Exception as e:
        print(f"Error generating summary for {ticker}: {e}")
        if _is_rate_limit_error(str(e)):
            return _rate_limit_result(ticker, str(e))
        return _rate_limit_result(ticker, str(e))


def summarize_articles_batch(
    ticker_articles: dict[str, list[dict]],
    api_key: str | None = None,
) -> dict[str, dict]:
    """Summarize multiple tickers in one Gemini call (chunked by BATCH_MAX_TICKERS)."""
    if not ticker_articles:
        return {}

    local_client = genai.Client(api_key=api_key) if api_key else client
    all_results: dict[str, dict] = {}
    tickers = list(ticker_articles.keys())

    for i in range(0, len(tickers), BATCH_MAX_TICKERS):
        chunk = tickers[i : i + BATCH_MAX_TICKERS]
        chunk_articles = {t: ticker_articles[t] for t in chunk}
        chunk_results = _summarize_batch_chunk(chunk_articles, local_client)
        all_results.update(chunk_results)

    return all_results


def _summarize_batch_chunk(
    ticker_articles: dict[str, list[dict]],
    local_client: genai.Client,
) -> dict[str, dict]:
    tickers = list(ticker_articles.keys())
    sections = []

    for ticker in tickers:
        articles = ticker_articles[ticker]
        articles_text = "\n\n".join(
            f"Title: {a['title']}\nSummary: {a['summary']}"
            for a in articles[:BATCH_MAX_ARTICLES_PER_TICKER]
        )
        sections.append(f"=== {ticker} ===\n{articles_text}")

    stocks_block = "\n\n".join(sections)
    ticker_list = ", ".join(tickers)

    prompt = f"""You are a financial analyst. Analyze recent news for each of these stocks: {ticker_list}.

{stocks_block}

For EACH stock above, output one block using this exact format (repeat for every ticker):

=== TICKER: SYMBOL ===
SUMMARY: A 3-4 sentence summary of the most important developments for SYMBOL investors.
SENTIMENT: One word only: Positive, Negative, or Neutral.
KEY_RISKS: One sentence describing the biggest risk mentioned.
KEY_OPPORTUNITY: One sentence describing the biggest opportunity mentioned."""

    try:
        response = local_client.models.generate_content(model=MODEL, contents=prompt)
        return _parse_batch_response(response.text, tickers, ticker_articles, local_client)
    except Exception as e:
        print(f"Error generating batch summary for {tickers}: {e}")
        err = str(e)
        if _is_rate_limit_error(err):
            return {ticker: _rate_limit_result(ticker, err) for ticker in tickers}
        return {ticker: _rate_limit_result(ticker, err) for ticker in tickers}


def _parse_batch_response(
    text: str,
    tickers: list[str],
    ticker_articles: dict[str, list[dict]],
    local_client: genai.Client,
) -> dict[str, dict]:
    results: dict[str, dict] = {}
    blocks = re.split(r"(?i)===\s*TICKER:\s*", text)

    for block in blocks:
        block = block.strip()
        if not block:
            continue
        lines = block.split("\n", 1)
        header = lines[0].strip().upper().replace("=", "").strip()
        body = lines[1] if len(lines) > 1 else ""
        if header in tickers and header not in results:
            results[header] = _parse_summary_block(header, body)

    for ticker in tickers:
        if ticker not in results:
            print(f"  Batch parse missed {ticker}, falling back to single-ticker call")
            articles = ticker_articles.get(ticker, [])
            if articles:
                try:
                    articles_text = "\n\n".join(
                        f"Title: {a['title']}\nSummary: {a['summary']}"
                        for a in articles[:10]
                    )
                    single_prompt = f"""You are a financial analyst. Analyze these recent news articles about {ticker} stock.

{articles_text}

Respond in this exact format:
SUMMARY: A 3-4 sentence summary of the most important developments for {ticker} investors.
SENTIMENT: One word only: Positive, Negative, or Neutral.
KEY_RISKS: One sentence describing the biggest risk mentioned.
KEY_OPPORTUNITY: One sentence describing the biggest opportunity mentioned."""
                    response = local_client.models.generate_content(model=MODEL, contents=single_prompt)
                    results[ticker] = _parse_summary_block(ticker, response.text)
                except Exception as e:
                    results[ticker] = _rate_limit_result(ticker, str(e))
            else:
                results[ticker] = {
                    "ticker": ticker,
                    "summary": "No recent news found.",
                    "sentiment": "neutral",
                }

    return results
