from google import genai
import os

client = genai.Client()

def generate_risk_narrative(portfolio_summaries: list[dict], api_key: str = None) -> str:
    if not portfolio_summaries:
        return "No portfolio data available."

    # use custom api key if available
    local_client = genai.Client(api_key=api_key) if api_key else client

    # format all ticker summaries to pass into prompt
    portfolio_text = "\n\n".join([
        f"{s['ticker']}:\n{s.get('summary', '')}\nRisk: {s.get('key_risk', '')}"
        for s in portfolio_summaries
    ])

    prompt = f"""You are a portfolio risk analyst. A user holds stocks in all of these companies.
Analyze the following summaries and identify cross-portfolio risks and themes.

{portfolio_text}

Respond in this exact format:
PORTFOLIO_SUMMARY: 2-3 sentences summarizing the overall state of this portfolio this week.
SHARED_RISKS: Any risks that affect multiple holdings simultaneously (e.g. interest rates, regulation, supply chain).
CONCENTRATION_WARNING: Flag if multiple holdings are exposed to the same sector or macro theme.
WEEKLY_WATCHLIST: The 1-2 tickers that need the most attention this week and why."""

    try:
        response = local_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        return response.text
    except Exception as e:
        print(f"Error generating risk narrative: {e}")
        err_msg = str(e)
        from ai.summarizer import _is_invalid_key_error
        if _is_invalid_key_error(err_msg):
            return (
                "PORTFOLIO_SUMMARY: The high-level portfolio narrative could not be generated because the provided Gemini API key is invalid or inactive. Please update your API key on the Dashboard.\n"
                "SHARED_RISKS: High-level narrative unavailable (Invalid Gemini API key).\n"
                "CONCENTRATION_WARNING: Invalid Gemini API key.\n"
                "WEEKLY_WATCHLIST: N/A"
            )
        return (
            "PORTFOLIO_SUMMARY: The high-level portfolio narrative could not be generated at this time. "
            "This is typically due to API rate limits or quota constraints. However, your individual asset briefings below are still fully active and available.\n"
            "SHARED_RISKS: High-level narrative unavailable (Gemini API rate limit or quota exceeded).\n"
            "CONCENTRATION_WARNING: Macro theme analysis unavailable.\n"
            "WEEKLY_WATCHLIST: N/A"
        )