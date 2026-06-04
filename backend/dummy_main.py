import os
# FORCE CPU
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import random
from datetime import datetime, timedelta

# Import Modular Components
from backend.core.state import *
from backend.core.config import *
from backend.services.trading import TradingSandbox
from backend.ai.manager import BrainManager
from backend.api.routes import router, init_api

# 1. INITIALIZE INSTANCES (Using Real Logic Classes)
manager = BrainManager(event_log=global_event_log)
sandboxes = {c: TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC) for c in AVAILABLE_ASSETS}

# 2. LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_api(manager, sandboxes)
    print("[MOCK] Zenith AI Modular Factory Online.")
    yield

# 3. APP SETUP
app = FastAPI(title="Zenith AI - Modular Mock", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- OVERRIDE REAL ROUTES WITH MOCK DATA FOR EXPERIMENT ---
@app.get("/api/all_status")
def get_mock_all():
    assets = {}
    total_allocated = 0
    for c in AVAILABLE_ASSETS:
        alloc = random.choice([0, 150000, 245000])
        total_allocated += alloc
        assets[c] = {
            "mape_1h": 0.42, "mape_5m": 0.35, "net_pnl": random.uniform(5000, 160000), 
            "btc_holdings": 0.512 if c == "BTC" else 0.5, # BTC active
            "balance_idr": 450000.0, "obi": 0.12,
            "allocated_idr": alloc,
            "current_price": 1200000000.0, "pred_price_1h": 1225000000.0, "pred_price_5m": 1205000000.0,
            "active_pulse": "Simulating...", "rl_score": 15000.0,
            "last_training": "18:45:00"
        }
    return {
        "assets": assets, "vault": 450000.0, "total_net_pnl": 110150.0, 
        "daily_target": 150000.0, "total_cash": 450000.0,
        "total_allocated": total_allocated,
        "manual_config": global_state["manual_override_config"]
    }

@app.get("/api/status")
def get_mock_st():
    return {
        "coin": "BTC", "tf": "1h", "balance_idr": 450000.0, "btc_holdings": 0.5124, 
        "error_rate": 0.42, "obi": 0.15,
        "prediction": {"price": 1250000000.0, "confidence": 0.88, "signal": "BUY", "macro": "BULLISH", "micro": "BUY"},
        "net_pnl": 12500.0, "winrate": 78.5
    }

@app.get("/api/chart")
def get_mock_chart():
    ohlcv = []
    base_price = 1200000000.0
    preds = []
    now_ts = int(datetime.now().timestamp() * 1000)
    for i in range(100):
        ts = now_ts - (100 - i) * 3600000
        close = base_price + random.uniform(-10000000, 10000000)
        ohlcv.append({"timestamp": ts, "open": close-1000, "high": close+2000, "low": close-3000, "close": close, "volume": random.random()})
        preds.append({"timestamp": ts, "price": close + random.uniform(-5000000, 5000000)})
        
    return {
        "ohlcv": ohlcv,
        "prediction": {"price": base_price + 15000000, "confidence": 0.85},
        "prediction_history": preds
    }

# Include the rest of real routes (like set_coin, etc.)
app.include_router(router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
