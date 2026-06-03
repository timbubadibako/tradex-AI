import os
# Silencing TensorFlow initialization logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

import time
import json
import joblib
import threading
import signal
import sys
import gc
import asyncio
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime, timedelta, timezone
import ccxt
import ccxt.async_support as ccxt_async
from ta.momentum import RSIIndicator
from ta.trend import MACD
from ta.volatility import AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator
from model_manager import ModelManager

# FASTAPI & Server dependencies
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn

# ==========================================
# 1. KONFIGURASI SISTEM
# ==========================================
MODELS_DIR = 'models'
exchange = ccxt.indodax()
exchange.timeframes['5m'] = '5'
ex_async = ccxt_async.indodax() # Global async instance

# Global Stats & Logs
AVAILABLE_COINS = ['BTC', 'ETH', 'SOL']
CURRENT_COIN = 'BTC' 
CURRENT_TF = '1h' 
global_event_log = [] 
global_smoothed_obi = {coin: 0.0 for coin in AVAILABLE_COINS}
manual_signal = None
refresh_event = threading.Event()
stop_event = threading.Event()
shutdown_in_progress = False

# Global Manager (Now has access to event_log)
manager = ModelManager(MODELS_DIR, event_log=global_event_log)

asset_states = {coin: {
    "market_data_1h": [],
    "market_data_5m": [],
    "trade_history": [],
    "prediction_history_1h": [],
    "prediction_history_5m": [],
    "bot_status": {
        "winrate": 0, "profit_pct": 0, 
        "error_rate_1h": 0, "best_error_rate_1h": 1.5,
        "error_rate_5m": 0, "best_error_rate_5m": 2.5
    },
    "prediction_1h": {"price": 0, "confidence": 0},
    "prediction_5m": {"price": 0, "confidence": 0},
    "consensus": {"signal": "WAIT", "macro": "NEUTRAL", "confidence": 0},
    "quant": {"obi": 0.0, "atr": 0.0, "current_price": 0.0},
    "last_ts_1h": 0, "last_ts_5m": 0,
    "last_input_1h": None, "last_input_5m": None
} for coin in AVAILABLE_COINS}

INITIAL_BALANCE_IDR = 500000  
INITIAL_BALANCE_BTC = 0.5       
TRADING_FEE = 0.001             
LOT_SIZE_BTC = 0.0005 # Reduced lot size for smaller capital

# The Vault: Accumulated 30% withdrawals
vault_balance_idr = 0.0
daily_target_idr = 150000.0 # Target 150rb per day
manual_override_config = {
    "active": False,
    "conf_threshold": 0.55, # Lowered for 20-30x trades per day
    "signal_threshold": 0.3, # Lowered for faster entry
    "use_macro": True
}
# Global Safety Settings
safety_settings = {
    "sl_atr_mult": 1.5,
    "tp_atr_mult": 2.5,
    "emergency_stop": False
}

# Global State Persistence Helpers
def pull_bot_state():
    """Initial state fetch from Supabase."""
    global vault_balance_idr, daily_target_idr, INITIAL_BALANCE_IDR
    if not manager.supabase: return
    try:
        res = manager.supabase.table("bot_state").select("*").execute()
        for row in res.data:
            key, data = row['key'], row['data']
            if key == 'global_config':
                daily_target_idr = data.get('daily_target', daily_target_idr)
                vault_balance_idr = data.get('vault', vault_balance_idr)
            elif key.endswith('_sandbox'):
                coin = key.split('_')[0]
                if coin in AVAILABLE_COINS:
                    sb = sandboxes[coin]
                    sb.balance_idr = data.get('balance_idr', sb.balance_idr)
                    sb.btc_holdings = data.get('holdings', sb.btc_holdings)
                    sb.baseline = data.get('baseline', sb.baseline)
        print("[CLOUD PERSISTENCE] Global state successfully restored from Supabase.")
    except Exception as e: print(f"[CLOUD PULL ERROR] Failed to restore state: {e}")

def push_bot_state(coin_or_global: str):
    """Saves current balance/config to Supabase."""
    if not manager.supabase: return
    try:
        if coin_or_global == 'global':
            payload = {"daily_target": daily_target_idr, "vault": vault_balance_idr}
            manager.supabase.table("bot_state").upsert({"key": "global_config", "data": payload, "updated_at": datetime.now().isoformat()}).execute()
        else:
            sb = sandboxes[coin_or_global.upper()]
            payload = {"balance_idr": sb.balance_idr, "holdings": sb.btc_holdings, "baseline": sb.baseline}
            manager.supabase.table("bot_state").upsert({"key": f"{coin_or_global.upper()}_sandbox", "data": payload, "updated_at": datetime.now().isoformat()}).execute()
    except Exception as e: print(f"[CLOUD PUSH ERROR] Failed to save state for {coin_or_global}: {e}")

# ==========================================
# 2. CLASS SANDBOX ENGINE
# ==========================================
class TradingSandbox:
    def __init__(self, idr, btc, baseline=0.5):
        self.initial_idr = idr
        self.balance_idr = idr # This is REALIZED CASH
        self.btc_holdings = btc # The baseline/inventory
        self.baseline = baseline
        self.realized_pnl = 0.0
        self.wins = 0; self.losses = 0; self.history = []
        self.active_position = None; self.entry_price = 0
        self.daily_pnl_start = 0.0 # Initial baseline realized PnL
        
        # Fase 2: Behavioral Guard (MUST BE INITIALIZED)
        self.consecutive_losses = 0
        self.dynamic_conf_adder = 0.0
        self.cooldown_until = 0

    def get_floating_pnl(self, current_price):
        if self.active_position == 'LONG':
            return (current_price - self.entry_price) * LOT_SIZE_BTC
        elif self.active_position == 'SHORT':
            return (self.entry_price - current_price) * LOT_SIZE_BTC
        return 0.0

    def get_net_pnl_idr(self, current_price):
        # Total Realized + Floating (Relative to Zero)
        return self.realized_pnl + self.get_floating_pnl(current_price)

    def get_equity(self, current_price): 
        # Total value including baseline assets
        return self.balance_idr + (self.btc_holdings * current_price)

    def open_long(self, coin, price):
        if self.active_position is None:
            # Check if we have enough realized cash to open
            cost = LOT_SIZE_BTC * price
            if self.balance_idr >= cost:
                self.trade_id = f"T-{int(time.time())}"
                self.active_position = 'LONG'; self.entry_price = price
                # We don't deduct from balance_idr yet? 
                # Actually, in Spot we MUST deduct. Let's treat it as realized cash.
                self.balance_idr -= cost * (1 + TRADING_FEE)
                self.btc_holdings += LOT_SIZE_BTC
                trade = {'id': self.trade_id, 'coin': coin, 'type': 'OPEN_LONG', 'price': price, 'time': datetime.now().isoformat(), 'pnl': 0, 'tf': CURRENT_TF}
                self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
                return True
        return False

    def close_long(self, coin, price):
        if self.active_position == 'LONG':
            revenue = (LOT_SIZE_BTC * price) * (1 - TRADING_FEE)
            cost = LOT_SIZE_BTC * self.entry_price
            pnl = revenue - (cost * (1 + TRADING_FEE)) # Net PnL including both fees
            
            self.balance_idr += revenue
            self.btc_holdings -= LOT_SIZE_BTC
            self.realized_pnl += pnl
            
            if pnl > 0: 
                self.wins += 1; self.consecutive_losses = 0
                self.dynamic_conf_adder = max(0.0, self.dynamic_conf_adder - 0.05)
            else: 
                self.losses += 1; self.consecutive_losses += 1
                self.dynamic_conf_adder = min(0.3, self.dynamic_conf_adder + 0.07)
                if self.consecutive_losses >= 3: self.cooldown_until = time.time() + 1800
                
            self.active_position = None
            trade = {'id': self.trade_id, 'coin': coin, 'type': 'CLOSE_LONG', 'price': price, 'time': datetime.now().isoformat(), 'pnl': pnl, 'tf': CURRENT_TF}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False

    def open_short(self, coin, price):
        if self.active_position is None:
            # SHORT in Spot = Selling the baseline/borrowed asset
            self.trade_id = f"T-{int(time.time())}"
            revenue = (LOT_SIZE_BTC * price) * (1 - TRADING_FEE)
            # IMPORTANT: We don't add revenue to realized balance yet 
            # to avoid the "fake profit" jump. We store it as a pending revenue.
            self.active_position = 'SHORT'; self.entry_price = price
            self.btc_holdings -= LOT_SIZE_BTC
            
            trade = {'id': self.trade_id, 'coin': coin, 'type': 'OPEN_SHORT', 'price': price, 'time': datetime.now().isoformat(), 'pnl': 0, 'tf': CURRENT_TF}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False

    def close_short(self, coin, price):
        if self.active_position == 'SHORT':
            # Closing SHORT = Buying back the asset
            cost = (LOT_SIZE_BTC * price) * (1 + TRADING_FEE)
            revenue = (LOT_SIZE_BTC * self.entry_price) * (1 - TRADING_FEE)
            pnl = revenue - cost
            
            # Now we realize the PnL into the cash balance
            self.balance_idr += pnl
            self.btc_holdings += LOT_SIZE_BTC
            self.realized_pnl += pnl
            
            if pnl > 0: 
                self.wins += 1; self.consecutive_losses = 0
                self.dynamic_conf_adder = max(0.0, self.dynamic_conf_adder - 0.05)
            else: 
                self.losses += 1; self.consecutive_losses += 1
                self.dynamic_conf_adder = min(0.3, self.dynamic_conf_adder + 0.07)
                if self.consecutive_losses >= 3: self.cooldown_until = time.time() + 1800
                
            self.active_position = None
            trade = {'id': self.trade_id, 'coin': coin, 'type': 'CLOSE_SHORT', 'price': price, 'time': datetime.now().isoformat(), 'pnl': pnl, 'tf': CURRENT_TF}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False

sandboxes = {c: TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC) for c in AVAILABLE_COINS}

# ==========================================
# 3. UTILS & DB PERSISTENCE
# ==========================================
def log_prediction_to_db(coin: str, tf_label: str, curr_price: float, pred_price: float, conf: float, sig: str, macro: str, timestamp=None):
    if not manager.supabase: return
    try:
        payload = {"coin": coin.upper(), "timeframe": tf_label, "current_price": float(curr_price), "predicted_price": float(pred_price), "confidence": float(conf), "signal": sig, "macro_trend": macro}
        if timestamp: payload["created_at"] = timestamp
        manager.supabase.table("predictions").insert(payload).execute()
    except Exception as e: print(f"[DB ERROR] Failed to log prediction: {e}")

def fetch_predictions_from_db(coin: str, tf_label: str, limit: int = 100):
    if not manager.supabase: return []
    try:
        res = manager.supabase.table("predictions").select("created_at, predicted_price").eq("coin", coin.upper()).eq("timeframe", tf_label).order("created_at", desc=True).limit(limit).execute()
        history = []
        for row in reversed(res.data):
            dt = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
            ts_ms = int(dt.timestamp() * 1000)
            interval = 300000 if tf_label == '5m' else 3600000
            rounded_ts = int(round(ts_ms / interval) * interval)
            history.append({"timestamp": rounded_ts, "price": float(row['predicted_price'])})
        return history
    except Exception as e:
        print(f"[DB FETCH ERROR] Failed to restore history for {coin} {tf_label}: {e}"); return []

def prune_old_predictions(coin: str):
    if not manager.supabase: return
    try:
        ts_limit_5m = (datetime.now() - timedelta(hours=12)).isoformat()
        ts_limit_1h = (datetime.now() - timedelta(days=5)).isoformat()
        manager.supabase.table("predictions").delete().eq("coin", coin.upper()).eq("timeframe", "5m").lt("created_at", ts_limit_5m).execute()
        manager.supabase.table("predictions").delete().eq("coin", coin.upper()).eq("timeframe", "1h").lt("created_at", ts_limit_1h).execute()
    except Exception as e: print(f"[PRUNING ERROR] Clean up failed for {coin}: {e}")

def get_processed_df(symbol, timeframe, limit=100, btc_data=None):
    # SAKTI STABILITY FIX: Retry with backoff for Indodax API
    ohlcv = []
    for attempt in range(3):
        try:
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            if ohlcv: break
        except Exception as e:
            if attempt == 2: raise e
            time.sleep(2 ** attempt)

    if not ohlcv: return pd.DataFrame()
    
    df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    df['vol_sma9'] = df['volume'].rolling(window=9).mean()
    df['rsi'] = RSIIndicator(close=df['close']).rsi()
    df['macd'] = MACD(close=df['close']).macd()
    df['atr'] = AverageTrueRange(high=df['high'], low=df['low'], close=df['close']).average_true_range()
    from ta.volatility import BollingerBands
    bb_calc = BollingerBands(close=df['close'])
    df['bb_h'] = bb_calc.bollinger_hband(); df['bb_l'] = bb_calc.bollinger_lband()
    df['obv'] = OnBalanceVolumeIndicator(close=df['close'], volume=df['volume']).on_balance_volume()
    if btc_data is not None:
        btc_data = btc_data.set_index('timestamp')
        df = df.set_index('timestamp').join(btc_data[['close', 'volume']], rsuffix='_BTC').reset_index()
        df.rename(columns={'close_BTC': 'btc_close', 'volume_BTC': 'btc_volume'}, inplace=True)
    return df.dropna()

async def calculate_obi_async(coin):
    global global_smoothed_obi, ex_async
    try:
        symbol = f"{coin}/IDR"
        ob = await ex_async.fetch_order_book(symbol, limit=50)
        mid = (ob['bids'][0][0] + ob['asks'][0][0]) / 2
        def w_vol(orders): return sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in orders])
        w_bids = w_vol(ob['bids']); w_asks = w_vol(ob['asks'])
        curr = (w_bids - w_asks) / (w_bids + w_asks)
        global_smoothed_obi[coin] = (curr * 0.2) + (global_smoothed_obi[coin] * 0.8)
        return global_smoothed_obi[coin]
    except Exception: return global_smoothed_obi[coin]

# ==========================================
# 4. FASTAPI & WEBSOCKETS
# ==========================================
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# SAKTI CLOUD FEATURE: Serve Frontend from Backend on same port
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend/out")
if os.path.exists(frontend_path):
    app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

class ConnectionManager:
    def __init__(self): self.active_connections: list[WebSocket] = []
    async def connect(self, websocket: WebSocket): await websocket.accept(); self.active_connections.append(websocket)
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections: self.active_connections.remove(websocket)
    async def broadcast(self, message: dict):
        msg_str = json.dumps(message)
        for connection in self.active_connections.copy():
            try: await connection.send_text(msg_str)
            except Exception: self.active_connections.remove(connection)

ws_manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect: ws_manager.disconnect(websocket)

def get_status():
    s = asset_states[CURRENT_COIN]
    return {"coin": CURRENT_COIN, "tf": CURRENT_TF, "balance_idr": s['bot_status'].get('balance_idr', 0), "btc_holdings": s['bot_status'].get('btc_holdings', 0), "equity": s['bot_status'].get('equity', 0), "profit_pct": s['bot_status'].get('profit_pct', 0), "winrate": s['bot_status'].get('winrate', 0), "error_rate": s['bot_status'].get('error_rate_1h' if CURRENT_TF == '1h' else 'error_rate_5m', 0), "obi": s['quant']['obi'], "atr": s['quant']['atr'], "prediction": {"price": s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']['price'], "confidence": s['consensus']['confidence'], "signal": s['consensus']['signal'], "macro": s['consensus']['macro']}}

def get_all_status():
    global vault_balance_idr, daily_target_idr
    data = {}
    total_relative_pnl = 0
    for coin in AVAILABLE_COINS:
        s = asset_states[coin]; curr_p = s['quant'].get('current_price', 0)
        if curr_p == 0: curr_p = float(s['market_data_1h'][-1]['close']) if s['market_data_1h'] else 0
        
        sb = sandboxes[coin]
        # Calculate PnL relative to the start of the day
        rel_pnl = sb.get_net_pnl_idr(curr_p) - sb.daily_pnl_start
        total_relative_pnl += rel_pnl
        
        pred_p_1h = s['prediction_1h']['price']; gap_idr_1h = pred_p_1h - curr_p; gap_pct_1h = (gap_idr_1h / curr_p * 100) if curr_p > 0 else 0
        pred_p_5m = s['prediction_5m']['price']; gap_idr_5m = pred_p_5m - curr_p; gap_pct_5m = (gap_idr_5m / curr_p * 100) if curr_p > 0 else 0
        data[coin] = {
            "mape_1h": s['bot_status'].get('error_rate_1h', 0), 
            "mape_5m": s['bot_status'].get('error_rate_5m', 0), 
            "gap_idr_1h": gap_idr_1h, 
            "gap_pct_1h": gap_pct_1h, 
            "gap_idr_5m": gap_idr_5m, 
            "gap_pct_5m": gap_pct_5m, 
            "net_pnl": sb.get_net_pnl_idr(curr_p),
            "btc_holdings": sb.btc_holdings,
            "obi": s['quant']['obi']
        }
    return {
        "assets": data, 
        "vault": vault_balance_idr, 
        "daily_target": daily_target_idr,
        "total_net_pnl": total_relative_pnl,
        "manual_config": manual_override_config
    }

async def daily_harvest_task():
    global vault_balance_idr
    while not stop_event.is_set():
        now = datetime.now()
        # Check if it's midnight
        if now.hour == 0 and now.minute == 0:
            for coin in AVAILABLE_COINS:
                sb = sandboxes[coin]
                curr_p = asset_states[coin]['quant'].get('current_price', 0)
                current_pnl = sb.get_net_pnl_idr(curr_p) - sb.daily_pnl_start
                
                if current_pnl > 0:
                    harvest_amount = current_pnl * 0.3
                    reinvest_amount = current_pnl * 0.7
                    
                    vault_balance_idr += harvest_amount
                    # Reinvest 70% is already in balance_idr theoretically, 
                    # but we clean up 'receh' by rounding down.
                    sb.balance_idr = float(int(sb.balance_idr)) # Round to nearest IDR
                    
                    global_event_log.append({
                        "time": datetime.now().isoformat(),
                        "message": f"[HARVEST] Daily profit for {coin}: Rp {current_pnl:,.0f}. 30% (Rp {harvest_amount:,.0f}) moved to Vault. 70% reinvested.",
                        "type": "SYSTEM",
                        "coin": coin
                    })
                
                # Sync each coin state and global config
                push_bot_state(coin)
                push_bot_state('global')
                
                # Reset daily baseline for next day with the new compounded capital
                sb.daily_pnl_start = sb.get_net_pnl_idr(curr_p)
            
            await asyncio.sleep(61) # Prevent double trigger
        await asyncio.sleep(30)
@app.get("/api/status")
def api_status(): return get_status()
@app.get("/api/all_status")
def api_all_status(): return get_all_status()
@app.get("/api/events")
def get_events(): return global_event_log[-50:]
@app.get("/api/safety")
def get_safety(): return safety_settings
@app.get("/api/trades")
def get_trades():
    all_trades = []
    for c in AVAILABLE_COINS: all_trades.extend(asset_states[c]['trade_history'])
    return sorted(all_trades, key=lambda x: x['time'], reverse=True)

@app.post("/api/update_manual_config")
async def update_manual_config(active: bool, conf: float, sig: float, macro: bool):
    global manual_override_config
    manual_override_config = {
        "active": active,
        "conf_threshold": conf,
        "signal_threshold": sig,
        "use_macro": macro
    }
    return {"status": "success", "config": manual_override_config}

@app.post("/api/update_daily_target")
async def update_daily_target(target: float):
    global daily_target_idr
    daily_target_idr = target
    return {"status": "success", "target": daily_target_idr}

@app.get("/api/chart")
def api_chart():
    s = asset_states[CURRENT_COIN]; ohlcv = s['market_data_1h'] if CURRENT_TF == '1h' else s['market_data_5m']; hist = s['prediction_history_1h'] if CURRENT_TF == '1h' else s['prediction_history_5m']
    pred = {"price": s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']['price'], "confidence": s['consensus']['confidence'], "signal": s['consensus']['signal'], "macro": s['consensus']['macro'], "micro": s['consensus'].get('micro', 'WAIT')}
    return {"ohlcv": ohlcv, "prediction": pred, "prediction_history": hist}


@app.post("/api/update_safety")
def update_safety(sl: float, tp: float):
    global safety_settings; safety_settings["sl_atr_mult"] = sl; safety_settings["tp_atr_mult"] = tp; return {"status": "success"}

@app.post("/api/panic_sell")
def panic_sell():
    global safety_settings, manual_signal; safety_settings["emergency_stop"] = True; manual_signal = "SELL_ALL"; return {"status": "success"}

@app.post("/api/set_timeframe")
def set_timeframe(tf: str):
    global CURRENT_TF; CURRENT_TF = tf; return {"status": "success"}

@app.post("/api/set_coin")
def set_coin(coin: str):
    global CURRENT_COIN; CURRENT_COIN = coin.upper(); return {"status": "success"}

# ==========================================
# 5. ASYNC MARKET INGESTION & EXECUTION
# ==========================================
async def fast_ticker_loop():
    global ex_async
    while not stop_event.is_set():
        try:
            tickers = await asyncio.gather(*[ex_async.fetch_ticker(f"{c}/IDR") for c in AVAILABLE_COINS], return_exceptions=True)
            obis = await asyncio.gather(*[calculate_obi_async(c) for c in AVAILABLE_COINS], return_exceptions=True)
            for i, coin in enumerate(AVAILABLE_COINS):
                if isinstance(tickers[i], Exception) or isinstance(obis[i], Exception): continue
                curr_p = float(tickers[i]['last']); s = asset_states[coin]; s['quant']['obi'] = obis[i]; s['quant']['current_price'] = curr_p
                res = s['consensus']; sb = sandboxes[coin]
                global manual_signal
                if manual_signal == "SELL_ALL":
                    if sb.active_position == 'LONG': sb.close_long(coin, curr_p)
                    elif sb.active_position == 'SHORT': sb.close_short(coin, curr_p)
                    if coin == AVAILABLE_COINS[-1]: manual_signal = None
                elif not safety_settings['emergency_stop']:
                    conf_val = float(res.get('confidence', 0)); ov = float(s['quant']['obi']); sig = res.get('signal', 'WAIT')
                    macro_tr = res.get('macro', 'NEUTRAL'); micro_sig = res.get('micro', 'WAIT')
                    
                    # Entry threshold based on manual override + dynamic penalty
                    base_threshold = manual_override_config['conf_threshold'] if manual_override_config['active'] else 0.55
                    entry_threshold = base_threshold + sb.dynamic_conf_adder
                    obi_min = (manual_override_config['signal_threshold'] / 10.0) if manual_override_config['active'] else 0.03
                    
                    # Neural Divergence Guard
                    is_conflict = (macro_tr == 'BULLISH' and micro_sig == 'SELL') or (macro_tr == 'BEARISH' and micro_sig == 'BUY')
                    is_cooldown = time.time() < sb.cooldown_until
                    
                    if conf_val > entry_threshold and not is_conflict and not is_cooldown: 
                        if sig == 'BUY' and ov > obi_min:
                            if sb.active_position == 'SHORT': sb.close_short(coin, curr_p)
                            if sb.open_long(coin, curr_p):
                                global_event_log.append({"time": datetime.now().isoformat(), "message": f"[EXECUTION] BUY signal processed for {coin} at IDR {curr_p:,.0f} (Confidence: {conf_val:.2f}, OBI: {ov:+.2f})", "type": "SYSTEM", "coin": coin})
                                print(f"\n[TRADE] OPEN LONG {coin} at {curr_p:,.0f} | Confidence: {conf_val:.2f}")
                        elif sig == 'SELL' and ov < -obi_min:
                            if sb.active_position == 'LONG': sb.close_long(coin, curr_p)
                            if sb.open_short(coin, curr_p):
                                global_event_log.append({"time": datetime.now().isoformat(), "message": f"[EXECUTION] SELL signal processed for {coin} at IDR {curr_p:,.0f} (Confidence: {conf_val:.2f}, OBI: {ov:+.2f})", "type": "SYSTEM", "coin": coin})
                                print(f"\n[TRADE] OPEN SHORT {coin} at {curr_p:,.0f} | Confidence: {conf_val:.2f}")
                    elif is_cooldown:
                        pass # Status is on UI
                    elif is_conflict:
                        pass # Divergence is visible on Logic Pipeline UI
                
                # Update status with Net PnL and Equity
                sb.btc_holdings = round(sb.btc_holdings, 8); sb.balance_idr = round(sb.balance_idr, 2)
                net_pnl = sb.get_net_pnl_idr(curr_p)
                eq = sb.get_equity(curr_p)
                wr = (sb.wins / (sb.wins + sb.losses) * 100) if (sb.wins + sb.losses) > 0 else 0
                s['bot_status'].update({
                    "balance_idr": float(sb.balance_idr), 
                    "btc_holdings": float(sb.btc_holdings), 
                    "equity": float(eq),
                    "net_pnl": float(net_pnl),
                    "winrate": float(wr)
                })
                # SYNC TO CLOUD IF POSITION CHANGED
                if i == 0 or i == len(AVAILABLE_COINS) - 1: # Throttle sync
                    push_bot_state(coin)

            await ws_manager.broadcast({"type": "TICK", "status": get_status(), "all_status": get_all_status(), "events": get_events()[-20:], "trades": get_trades()})
            # SAKTI FIX: Clear line remnants before printing next pulse
            sys.stdout.write("\033[K") 
            print(f"[WS PULSE] {CURRENT_COIN}: {curr_p:,.0f} | OBI: {s['quant']['obi']:+.2f} | Clients: {len(ws_manager.active_connections)}", end="\r")
            await asyncio.sleep(1)
        except Exception as e:
            if not stop_event.is_set(): print(f"[WS ERROR] Real-time loop exception: {e}"); await asyncio.sleep(2)

@app.on_event("startup")
async def startup_event(): 
    asyncio.create_task(fast_ticker_loop())
    asyncio.create_task(daily_harvest_task())

@app.on_event("shutdown")
async def shutdown_event():
    global ex_async; print("[SHUTDOWN] Terminating asynchronous exchange resources..."); await ex_async.close()

# ==========================================
# 6. SLOW BOT LOOP (THE THINKER)
# ==========================================
def bot_loop():
    global global_event_log
    print("[MODEL MANAGER] Commencing core intelligence sequence...")
    for c in AVAILABLE_COINS: 
        b1h, b5m = manager.load_pair(c)
        asset_states[c]['bot_status']['best_error_rate_1h'] = b1h
        asset_states[c]['bot_status']['best_error_rate_5m'] = b5m
    
    # RESTORE STATE FROM SUPABASE
    pull_bot_state()

    try:
        for coin in AVAILABLE_COINS:
            db_hist_1h = fetch_predictions_from_db(coin, '1h'); df_init_1h = get_processed_df(f"{coin}/IDR", '1h', limit=150)
            if db_hist_1h:
                asset_states[coin]['prediction_history_1h'] = db_hist_1h; asset_states[coin]['prediction_1h'] = {"price": db_hist_1h[-1]['price'], "confidence": 0}
                t_err = 0; c_err = 0
                for pred in db_hist_1h:
                    act = df_init_1h[df_init_1h['timestamp'] == pred['timestamp']]
                    if not act.empty: t_err += abs(pred['price'] - act.iloc[0]['close']) / act.iloc[0]['close']; c_err += 1
                if c_err > 0: asset_states[coin]['bot_status']['error_rate_1h'] = (t_err / c_err) * 100
                print(f"[DATA RESTORE] Successfully synchronized {len(db_hist_1h)} historical points for {coin} 1H.")
            db_hist_5m = fetch_predictions_from_db(coin, '5m'); df_init_5m = get_processed_df(f"{coin}/IDR", '5m', limit=150)
            if db_hist_5m:
                asset_states[coin]['prediction_history_5m'] = db_hist_5m; asset_states[coin]['prediction_5m'] = {"price": db_hist_5m[-1]['price'], "confidence": 0}
                t_err = 0; c_err = 0
                for pred in db_hist_5m:
                    act = df_init_5m[df_init_5m['timestamp'] == pred['timestamp']]
                    if not act.empty: t_err += abs(pred['price'] - act.iloc[0]['close']) / act.iloc[0]['close']; c_err += 1
                if c_err > 0: asset_states[coin]['bot_status']['error_rate_5m'] = (t_err / c_err) * 100
                print(f"[DATA RESTORE] Successfully synchronized {len(db_hist_5m)} historical points for {coin} 5M.")
        print("[CLOUD SYNC] Distributed network memory successfully integrated.")
    except Exception as e: print(f"[CLOUD ERROR] Dataset restoration sequence failed: {e}")

    # SAKTI FIX: Lock baseline clock immediately after restore
    try:
        init_btc_1h = exchange.fetch_ohlcv('BTC/IDR', '1h', limit=1); init_btc_5m = exchange.fetch_ohlcv('BTC/IDR', '5m', limit=1)
        init_ts_1h = int(init_btc_1h[0][0]); init_ts_5m = int(init_btc_5m[0][0])
        for coin in AVAILABLE_COINS: asset_states[coin]['last_ts_1h'] = init_ts_1h; asset_states[coin]['last_ts_5m'] = init_ts_5m
        print("[SYSTEM LOCK] Baseline internal clock synchronized with exchange timestamp.")
    except Exception as e: print(f"[SYSTEM WARNING] Failed to acquire baseline clock synchronization: {e}")

    while not stop_event.is_set():
        try:
            btc_1h = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '1h', limit=100), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            btc_5m = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '5m', limit=100), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            for coin in AVAILABLE_COINS:
                df1 = get_processed_df(f"{coin}/IDR", '1h', btc_data=btc_1h if coin != 'BTC' else None)
                df5 = get_processed_df(f"{coin}/IDR", '5m', btc_data=btc_5m if coin != 'BTC' else None)
                s = asset_states[coin]; curr_p = float(df5.iloc[-1]['close']); ts_1h = int(df1.iloc[-1]['timestamp']); ts_5m = int(df5.iloc[-1]['timestamp']); mm_assets = manager.loaded_models[coin]
                def prep_seq(df, m_key):
                    req = list(mm_assets[m_key]['scaler_x'].feature_names_in_); c = df.tail(60).copy()
                    if 'bb_high' in req and 'bb_high' not in c.columns: c['bb_high']=c['bb_h']; c['bb_low']=c['bb_l']
                    if 'bb_h' in req and 'bb_h' not in c.columns: c['bb_h']=c['bb_high']; c['bb_l']=c['bb_low']
                    return mm_assets[m_key]['scaler_x'].transform(c[req]).reshape(1, 60, -1)
                s['market_data_1h'] = df1.tail(100).to_dict('records'); s['market_data_5m'] = df5.tail(100).to_dict('records')
                # Use manual override config in thinker loop
                res = manager.get_consensus_signal(coin, prep_seq(df1, '1h'), prep_seq(df5, '5m'), curr_p, config=manual_override_config if manual_override_config['active'] else None)

                s['consensus'] = {"signal": res['signal'], "macro": res['trend_macro'], "micro": res['signal_micro'], "confidence": res['confidence']}; s['quant']['atr'] = float(df5.iloc[-1]['atr'])

                if ts_1h != s['last_ts_1h']:
                    if s['last_input_1h'] is not None:
                        manager.online_learn(coin, '1h', s['last_input_1h'], curr_p); err = abs(s['prediction_history_1h'][-1]['price'] - curr_p) / curr_p; curr_mape = (err * 100 * 0.1) + (s['bot_status'].get('error_rate_1h', 0) * 0.9); s['bot_status']['error_rate_1h'] = curr_mape
                        if curr_mape < s['bot_status']['best_error_rate_1h']: s['bot_status']['best_error_rate_1h'] = curr_mape; manager.save_single_model(coin, '1h', curr_mape)
                        tf.keras.backend.clear_session(); gc.collect()
                    new_in = prep_seq(df1, '1h'); p_p, _ = manager.predict_tf(coin, '1h', new_in, curr_p)
                    s['prediction_history_1h'].append({"timestamp": ts_1h + (3600 * 1000), "price": p_p}); s['last_ts_1h'] = ts_1h; s['last_input_1h'] = new_in; s['prediction_1h'] = {"price": p_p, "confidence": _}; log_prediction_to_db(coin, '1h', curr_p, p_p, _, res['signal'], res['trend_macro'], timestamp=datetime.fromtimestamp((ts_1h + 3600*1000)/1000, tz=timezone.utc).isoformat())
                if ts_5m != s['last_ts_5m']:
                    if s['last_input_5m'] is not None:
                        manager.online_learn(coin, '5m', s['last_input_5m'], curr_p); err = abs(s['prediction_history_5m'][-1]['price'] - curr_p) / curr_p; curr_mape_5m = (err * 100 * 0.1) + (s['bot_status'].get('error_rate_5m', 0) * 0.9); s['bot_status']['error_rate_5m'] = curr_mape_5m
                        if curr_mape_5m < s['bot_status']['best_error_rate_5m']: s['bot_status']['best_error_rate_5m'] = curr_mape_5m; manager.save_single_model(coin, '5m', curr_mape_5m)
                        tf.keras.backend.clear_session(); gc.collect()
                    new_in = prep_seq(df5, '5m'); p_p, _ = manager.predict_tf(coin, '5m', new_in, curr_p)
                    s['prediction_history_5m'].append({"timestamp": ts_5m + (300 * 1000), "price": p_p}); s['last_ts_5m'] = ts_5m; s['last_input_5m'] = new_in; s['prediction_5m'] = {"price": p_p, "confidence": _}; log_prediction_to_db(coin, '5m', curr_p, p_p, _, res['signal'], res['trend_macro'], timestamp=datetime.fromtimestamp((ts_5m + 300*1000)/1000, tz=timezone.utc).isoformat())
            prune_old_predictions(CURRENT_COIN); print(f"[THINKER CYCLE] Active Matrix Evaluated | Status: Operational", end="\r"); refresh_event.wait(15); refresh_event.clear()
        except Exception as e:
            if not stop_event.is_set(): print(f"[THINKER ERROR] Core processing loop exception: {e}"); time.sleep(10)

def graceful_shutdown(signum, frame):
    global shutdown_in_progress
    if shutdown_in_progress: print("\n[SHUTDOWN WARNING] Forced termination sequence initiated."); sys.exit(1)
    shutdown_in_progress = True; print("\n[SHUTDOWN] Final matrix validation before system offline..."); stop_event.set(); refresh_event.set()
    for c in AVAILABLE_COINS:
        s = asset_states[c]
        if s['bot_status']['error_rate_1h'] < s['bot_status']['best_error_rate_1h']: manager.save_single_model(c, '1h', s['bot_status']['error_rate_1h'])
        if s['bot_status']['error_rate_5m'] < s['bot_status']['best_error_rate_5m']: manager.save_single_model(c, '5m', s['bot_status']['error_rate_5m'])
    print("[SYSTEM OFFLINE] Zenith Factory decommissioned successfully."); sys.exit(0)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    signal.signal(signal.SIGINT, graceful_shutdown); signal.signal(signal.SIGTERM, graceful_shutdown)
    t = threading.Thread(target=bot_loop, daemon=True); t.start()
    uvicorn.run(app, host="0.0.0.0", port=port)
