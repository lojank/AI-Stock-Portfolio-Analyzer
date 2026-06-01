import os
import json
import hashlib
from google.cloud import storage
from datetime import datetime

BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")

_storage_client = None

def get_client():
    global _storage_client
    if _storage_client is None:
        _storage_client = storage.Client()
    return _storage_client

def article_exists(url: str) -> bool:
    """Check if we've already stored this article"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    article_id = hashlib.md5(url.encode()).hexdigest()
    blob = bucket.blob(f"articles/{article_id}.json")
    return blob.exists()

def save_article(article: dict):
    """Save raw article to GCS"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    article_id = hashlib.md5(article["url"].encode()).hexdigest()
    blob = bucket.blob(f"articles/{article_id}.json")
    blob.upload_from_string(
        json.dumps(article),
        content_type="application/json"
    )

def get_unsummarized(ticker: str) -> list[dict]:
    """Fetch articles not yet summarized"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    blobs = bucket.list_blobs(prefix=f"articles/")
    articles = []
    for blob in blobs:
        data = json.loads(blob.download_as_text())
        if data.get("ticker") == ticker and not data.get("summarized"):
            articles.append(data)
    return articles

def get_cached_narrative(cache_key: str) -> str:
    """Fetch cached narrative from GCS if it exists, otherwise return None"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"narratives/{cache_key}.json")
    if blob.exists():
        try:
            data = json.loads(blob.download_as_text())
            return data.get("narrative")
        except Exception as e:
            print(f"Error reading cached narrative: {e}")
            return None
    return None

def save_cached_narrative(cache_key: str, narrative: str):
    """Save generated narrative to GCS"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    blob = bucket.blob(f"narratives/{cache_key}.json")
    data = {
        "narrative": narrative,
        "created_at": datetime.utcnow().isoformat()
    }
    blob.upload_from_string(
        json.dumps(data),
        content_type="application/json"
    )

def clear_narrative_cache():
    """Clear all cached narratives in GCS"""
    client = get_client()
    bucket = client.bucket(BUCKET_NAME)
    blobs = bucket.list_blobs(prefix="narratives/")
    bucket.delete_blobs(list(blobs))
