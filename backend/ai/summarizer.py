from google import genai
import os

client = genai.Client()

def summarize_articles(ticker: str, articles: list[dict], api_key: str = None) -> dict:
    if not articles:
        return {"ticker": ticker, "summary": "No recent news found.", "sentiment": "neutral"}

    # use custom api key if passed in, otherwise default client
    local_client = genai.Client(api_key=api_key) if api_key else client

    # combine first 10 articles into one prompt to save rate limit/calls
    articles_text = "\n\n".join([
        f"Title: {a['title']}\nSummary: {a['summary']}"
        for a in articles[:10]
    ])

    prompt = f"""You are a financial analyst. Analyze these recent news articles about {ticker} stock.

{articles_text}

Respond in this exact format:
SUMMARY: A 3-4 sentence summary of the most important developments for {ticker} investors.
SENTIMENT: One word only: Positive, Negative, or Neutral.
KEY_RISKS: One sentence describing the biggest risk mentioned.
KEY_OPPORTUNITY: One sentence describing the biggest opportunity mentioned."""

    try:
        response = local_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        text = response.text

        # parse the output lines robustly (handles markdown bolding like **SUMMARY:**)
        import re
        
        def extract_section(section_name, raw_text):
            pattern = rf'(?i)(?:\*\*|)\s*{section_name}\s*(?:\*\*|)\s*:\s*(.*?)(?=\n(?:\*\*|)\s*(?:SUMMARY|SENTIMENT|KEY_RISKS|KEY_OPPORTUNITY)\s*(?:\*\*|)\s*:|$)'
            match = re.search(pattern, raw_text, re.DOTALL)
            return match.group(1).strip() if match else ""

        result = {
            "ticker": ticker,
            "raw": text,
            "summary": extract_section("SUMMARY", text),
            "sentiment": extract_section("SENTIMENT", text).lower() or "neutral",
            "key_risk": extract_section("KEY_RISKS", text),
            "key_opportunity": extract_section("KEY_OPPORTUNITY", text)
        }

        return result
    except Exception as e:
        print(f"Error generating summary for {ticker}: {e}")
        return {
            "ticker": ticker,
            "raw": f"Error: {e}",
            "summary": f"Recent news summaries for {ticker} could not be generated because the Gemini API free tier daily quota or rate limit has been reached.",
            "sentiment": "neutral",
            "key_risk": "Gemini API rate limit or quota exceeded.",
            "key_opportunity": "N/A"
        }