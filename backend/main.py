from fastapi import FastAPI, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

from typing import Optional

class PortfolioRequest(BaseModel):
    tickers: list[str]
    name: Optional[str] = None

@app.get("/portfolio/{user_id}")
def get_portfolio(user_id: str):
    result = supabase.table("portfolios").select("*").eq("user_id", user_id).execute()
    return result.data

@app.post("/portfolio/{user_id}")
def save_portfolio(user_id: str, request: PortfolioRequest):
    # Check for duplicates
    existing = supabase.table("portfolios").select("*").eq("user_id", user_id).execute()
    new_tickers_sorted = sorted(request.tickers)
    
    for p in existing.data:
        if sorted(p.get("tickers", [])) == new_tickers_sorted:
            # Return the existing duplicate to avoid creating a new one
            return p

    result = supabase.table("portfolios").upsert({
        "user_id": user_id,
        "tickers": request.tickers,
        "name": request.name
    }).execute()
    return result.data

@app.put("/portfolio/{user_id}/{portfolio_id}")
def update_portfolio(user_id: str, portfolio_id: str, request: PortfolioRequest):
    result = supabase.table("portfolios").update({
        "tickers": request.tickers,
        "name": request.name
    }).eq("id", portfolio_id).eq("user_id", user_id).execute()
    return result.data

@app.delete("/portfolio/{user_id}/{portfolio_id}")
def delete_portfolio(user_id: str, portfolio_id: str):
    result = supabase.table("portfolios").delete().eq("id", portfolio_id).eq("user_id", user_id).execute()
    return result.data