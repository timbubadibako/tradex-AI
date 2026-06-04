import os
# FORCE CPU
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'

import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from backend.core.state import *
from backend.core.config import *
from backend.services.trading import TradingSandbox
from backend.services.database import pull_bot_state
from backend.services.workers import ticker_loop, bot_thinker
from backend.ai.manager import BrainManager
from backend.api.routes import router, init_api

# 1. INITIALIZE INSTANCES
manager = BrainManager(event_log=global_event_log)
sandboxes = {c: TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC) for c in AVAILABLE_ASSETS}

# 2. LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Sync API context
    init_api(manager, sandboxes)
    
    # Pre-load best brains from history
    print("[INIT] Restoring Global Neural Matrix...")
    for c in AVAILABLE_ASSETS:
        try:
            manager.load_pair(c)
        except Exception as e:
            print(f"[CRITICAL] Brain sync failed for {c}: {e}")
    
    pull_bot_state(sandboxes)
    
    # --- LAUNCH PRODUCTION WORKERS ---
    from backend.services.workers import ticker_loop, bot_thinker, financial_heartbeat
    asyncio.create_task(ticker_loop(manager, sandboxes))
    asyncio.create_task(bot_thinker(manager, sandboxes))
    asyncio.create_task(financial_heartbeat(manager, sandboxes))
    
    yield
    print("[SYSTEM] Graceful shutdown complete.")

# 3. APP SETUP
app = FastAPI(title="Zenith AI: Predictive Candle Engine", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

if __name__ == "__main__":
    # Standard Production Port with Auto-Reload fallback
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
