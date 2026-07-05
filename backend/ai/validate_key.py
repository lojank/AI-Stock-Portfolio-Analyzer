import re
from google import genai

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
    
    try:
        client = genai.Client(api_key=key)
        # Test key validity with a lightweight API call
        client.models.list()
        return {
            "valid": True,
            "status": "ok",
            "message": "API key is active and ready to use. Briefings will use your Gemini quota.",
        }
    except Exception as e:
        err_msg = str(e)
        if "API_KEY_INVALID" in err_msg or "API key not valid" in err_msg:
            return {
                "valid": False,
                "status": "invalid",
                "message": "API key is invalid. Please check the key and try again.",
            }
        elif "RESOURCE_EXHAUSTED" in err_msg or "429" in err_msg:
            return {
                "valid": False,
                "status": "rate_limited",
                "message": "This API key has reached its rate limit or quota limit.",
            }
        else:
            return {
                "valid": False,
                "status": "error",
                "message": f"Validation failed: {err_msg}",
            }
