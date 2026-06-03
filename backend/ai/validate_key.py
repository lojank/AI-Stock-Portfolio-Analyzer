import re

# Google AI Studio keys: AIza… or newer AQ.… prefixed keys
GEMINI_KEY_PATTERN = re.compile(r"^(AIza[0-9A-Za-z_-]{20,}|AQ\.[A-Za-z0-9_-]{20,})$")


def validate_gemini_api_key(api_key: str) -> dict:
    key = api_key.strip()
    if not key:
        return {
            "valid": False,
            "status": "missing",
            "message": "Enter an API key to validate.",
        }
    if not GEMINI_KEY_PATTERN.match(key):
        return {
            "valid": False,
            "status": "invalid",
            "message": "Invalid API key format. Copy a key from Google AI Studio (starts with AIza… or AQ.…).",
        }
    return {
        "valid": True,
        "status": "ok",
        "message": "API key format looks valid. Briefings will use your Gemini quota.",
    }
