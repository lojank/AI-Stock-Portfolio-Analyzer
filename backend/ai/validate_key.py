from google import genai

VALIDATION_MODEL = "gemini-2.5-flash"


def validate_gemini_api_key(api_key: str) -> dict:
    # verify gemini key works by making a simple dummy model call
    try:
        client = genai.Client(api_key=api_key)
        client.models.generate_content(
            model=VALIDATION_MODEL,
            contents="Reply with exactly: OK",
        )
        return {
            "valid": True,
            "status": "ok",
            "message": "API key is valid and ready to use.",
        }
    except Exception as e:
        err = str(e)
        if "429" in err or "RESOURCE_EXHAUSTED" in err:
            return {
                "valid": True,
                "status": "rate_limited",
                "message": "Key is valid, but you've hit a rate or daily quota limit. Briefings may fail until quota resets.",
            }
        if any(
            token in err
            for token in ("401", "403", "API_KEY_INVALID", "API key not valid", "PERMISSION_DENIED")
        ):
            return {
                "valid": False,
                "status": "invalid",
                "message": "Invalid API key. Check the key in Google AI Studio and try again.",
            }
        return {
            "valid": False,
            "status": "error",
            "message": "Could not verify this key. Check your connection and try again.",
        }
