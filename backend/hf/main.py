import os
# FORCE CPU ONLY
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

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
from ta.volatility import AverageTrueRange, BollingerBands
from ta.volume import OnBalanceVolumeIndicator
from model_manager import ModelManager
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# 1. CONFIGURATION
MODELS_DIR = 'models'
exchange = ccxt.indodax()
exchange.timeframes['5m'] = '5'
ex_async = ccxt_async.indodax()
ex_async.timeframes['5m'] = '5'

AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL'] 
CURRENT_COIN = 'BTC'
CURRENT_TF = '1h'
global_event_log = []
global_smoothed_obi = {coin: 0.0 for coin in AVAILABLE_ASSETS}
manual_signal = None
stop_event = asyncio.Event()
manager = ModelManager(MODELS_DIR, event_log=global_event_log)

asset_states = {coin: {
    "market_data_1h": [], "market_data_5m": [], "trade_history": [],
    "prediction_history_1h": [], "prediction_history_5m": [],
    "bot_status": {"winrate": 0, "profit_pct": 0, "error_rate_1h": 0.85, "error_rate_5m": 0.45, "best_error_rate_1h": 100.0, "best_error_rate_5m": 100.0},
    "prediction_1h": {"price": 0, "confidence": 0}, "prediction_5m": {"price": 0, "confidence": 0},
    "consensus": {"signal": "WAIT", "trend_macro": "NEUTRAL", "signal_micro": "WAIT", "confidence": 0},
    "quant": {"obi": 0.0, "atr": 0.0, "current_price": 0.0},
    "active_pulse": "Initializing Engine...", "last_training": "Never",
    "last_ts_1h": 0, "last_ts_5m": 0,
    "last_input_1h": None, "last_input_5m": None,
    "rl_reward": 0.0
} for coin in AVAILABLE_ASSETS}

INITIAL_BALANCE_IDR = 500000; INITIAL_BALANCE_BTC = 0.5; TRADING_FEE = 0.001
BASE_LOT_SIZE = 0.0005
vault_balance_idr = 0.0; daily_target_idr = 150000.0
manual_override_config = {"active": False, "conf_threshold": 0.55, "signal_threshold": 0.3, "use_macro": True}
safety_settings = {"sl_atr_mult": 1.5, "tp_atr_mult": 2.5, "emergency_stop": False}

# 2. CLASSES
class TradingSandbox:
    def __init__(self, idr, btc):
        self.balance_idr = idr; self.btc_holdings = btc; self.realized_pnl = 0.0
        self.active_position = None; self.entry_price = 0; self.daily_pnl_start = 0.0
        self.active_lot = 0.0; self.consecutive_losses = 0; self.dynamic_conf_adder = 0.0; self.cooldown_until = 0

    def get_net_pnl_idr(self, current_price):
        floating = 0.0
        if self.active_position == 'LONG': floating = (current_price - self.entry_price) * self.active_lot
        elif self.active_position == 'SHORT': floating = (self.entry_price - current_price) * self.active_lot
        return self.realized_pnl + floating

    def open_long(self, coin, price, lot):
        if self.active_position is None and self.balance_idr >= (lot * price):
            self.active_position = 'LONG'; self.entry_price = price; self.active_lot = lot
            self.balance_idr -= (lot * price) * (1 + TRADING_FEE); self.btc_holdings += lot
            trade = {'coin': coin, 'type': 'OPEN_LONG', 'price': price, 'lot': lot, 'time': datetime.now().isoformat(), 'pnl': 0, 'status': 'OPEN'}
            asset_states[coin]['trade_history'].insert(0, trade); manager.log_trade(trade)
            return True
        return False

    def close_long(self, coin, price):
        if self.active_position == 'LONG':
            rev = (self.active_lot * price) * (1 - TRADING_FEE); pnl = rev - (self.active_lot * self.entry_price * (1 + TRADING_FEE))
            self.balance_idr += rev; self.btc_holdings -= self.active_lot; self.realized_pnl += pnl
            self.active_position = None; asset_states[coin]['rl_reward'] += pnl
            bias_change = 0.05 if pnl > 0 else -0.07
            manager.loaded_models[coin]['1h']['rl_bias'] = max(-0.3, min(0.3, manager.loaded_models[coin]['1h']['rl_bias'] + bias_change))
            manager.loaded_models[coin]['5m']['rl_bias'] = max(-0.3, min(0.3, manager.loaded_models[coin]['5m']['rl_bias'] + bias_change))
            manager.push_neural_memory(coin, '1h'); manager.push_neural_memory(coin, '5m')
            trade = {'coin': coin, 'type': 'CLOSE_LONG', 'price': price, 'lot': self.active_lot, 'time': datetime.now().isoformat(), 'pnl': pnl, 'status': 'CLOSED'}
            asset_states[coin]['trade_history'].insert(0, trade); manager.log_trade(trade)
            return True
        return False

    def open_short(self, coin, price, lot):
        if self.active_position is None:
            self.active_position = 'SHORT'; self.entry_price = price; self.active_lot = lot
            self.btc_holdings -= lot
            trade = {'coin': coin, 'type': 'OPEN_SHORT', 'price': price, 'lot': lot, 'time': datetime.now().isoformat(), 'pnl': 0, 'status': 'OPEN'}
            asset_states[coin]['trade_history'].insert(0, trade); manager.log_trade(trade)
            return True
        return False

    def close_short(self, coin, price):
        if self.active_position == 'SHORT':
            cost = (self.active_lot * price) * (1 + TRADING_FEE); rev = (self.active_lot * self.entry_price) * (1 - TRADING_FEE); pnl = rev - cost
            self.balance_idr += pnl; self.btc_holdings += self.active_lot; self.realized_pnl += pnl
            self.active_position = None; asset_states[coin]['rl_reward'] += pnl
            bias_change = 0.05 if pnl > 0 else -0.07
            manager.loaded_models[coin]['1h']['rl_bias'] = max(-0.3, min(0.3, manager.loaded_models[coin]['1h']['rl_bias'] + bias_change))
            manager.loaded_models[coin]['5m']['rl_bias'] = max(-0.3, min(0.3, manager.loaded_models[coin]['5m']['rl_bias'] + bias_change))
            manager.push_neural_memory(coin, '1h'); manager.push_neural_memory(coin, '5m')
            trade = {'coin': coin, 'type': 'CLOSE_SHORT', 'price': price, 'lot': self.active_lot, 'time': datetime.now().isoformat(), 'pnl': pnl, 'status': 'CLOSED'}
            asset_states[coin]['trade_history'].insert(0, trade); manager.log_trade(trade)
            return True
        return False

sandboxes = {c: TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC) for c in AVAILABLE_ASSETS}

# 3. HELPERS
def pull_bot_state():
    global vault_balance_idr, daily_target_idr
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
                if coin in sandboxes:
                    sandboxes[coin].balance_idr = data.get('balance_idr', sandboxes[coin].balance_idr)
                    sandboxes[coin].btc_holdings = data.get('holdings', sandboxes[coin].btc_holdings)
        print("[CLOUD] Evolution state synchronized.")
    except: pass

def fetch_predictions_from_db(coin: str, tf_label: str):
    if not manager.supabase: return []
    try:
        res = manager.supabase.table("predictions").select("created_at, predicted_price").eq("coin", coin.upper()).eq("timeframe", tf_label).order("created_at", desc=True).limit(100).execute()
        history = []
        for row in reversed(res.data):
            dt = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
            history.append({"timestamp": int(dt.timestamp() * 1000), "price": float(row['predicted_price'])})
        return history
    except: return []

def get_status():
    s = asset_states[CURRENT_COIN]; p_obj = s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']; con = s['consensus']
    return {"coin": CURRENT_COIN, "tf": CURRENT_TF, "balance_idr": sandboxes[CURRENT_COIN].balance_idr, "btc_holdings": sandboxes[CURRENT_COIN].btc_holdings, "error_rate": s['bot_status'].get('error_rate_1h' if CURRENT_TF == '1h' else 'error_rate_5m', 0), "obi": s['quant']['obi'], "prediction": {"price": p_obj['price'], "confidence": p_obj['confidence'], "signal": con.get('signal', 'WAIT'), "macro": con.get('trend_macro', 'NEUTRAL'), "micro": con.get('signal_micro', 'WAIT')}}

def get_all_status():
    data = {}; total_rel = 0
    for c in AVAILABLE_ASSETS:
        sb = sandboxes[c]; s = asset_states[c]; curr_p = s['quant'].get('current_price', 0)
        rel = sb.get_net_pnl_idr(curr_p) - sb.daily_pnl_start; total_rel += rel
        p1 = s['prediction_1h'].get('price', 0); p5 = s['prediction_5m'].get('price', 0)
        data[c] = {
            "mape_1h": s['bot_status']['error_rate_1h'], "mape_5m": s['bot_status']['error_rate_5m'], 
            "best_mape_1h": s['bot_status']['best_error_rate_1h'], "best_mape_5m": s['bot_status']['best_error_rate_5m'], 
            "net_pnl": sb.get_net_pnl_idr(curr_p), "btc_holdings": sb.btc_holdings, "balance_idr": sb.balance_idr, 
            "obi": s['quant']['obi'], "pulse": s['active_pulse'], "last_training": s['last_training'], "rl_score": s['rl_reward'],
            "current_price": curr_p, "pred_price_1h": p1, "pred_price_5m": p5
        }
    return {"assets": data, "vault": vault_balance_idr, "daily_target": daily_target_idr, "total_net_pnl": total_rel, "manual_config": manual_override_config}

def generate_monitor_html():
    status = get_all_status(); trades = sorted([t for c in AVAILABLE_ASSETS for t in asset_states[c]['trade_history']], key=lambda x: x['time'], reverse=True)[:5]
    html = f"<html><head><title>Zenith AI Cloud Evolution</title><meta http-equiv='refresh' content='10'><style>body {{ font-family: sans-serif; background: #0b0f1a; color: #f1f5f9; padding: 25px; }} .grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }} .card {{ background: #161b22; padding: 15px; border-radius: 12px; border: 1px solid #30363d; }} .label {{ font-size: 9px; color: #8b949e; font-weight: 800; text-transform: uppercase; }} .value {{ font-size: 22px; font-weight: 900; margin: 8px 0; }} .positive {{ color: #3fb950; }} .negative {{ color: #f85149; }} table {{ width: 100%; border-collapse: collapse; font-size: 11px; }} th, td {{ text-align: left; padding: 12px 10px; border-bottom: 1px solid #30363d; }} .pulse {{ display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #38bdf8; margin-right: 8px; animation: blink 1s infinite; }} @keyframes blink {{ 0% {{ opacity: 1; }} 50% {{ opacity: 0.3; }} 100% {{ opacity: 1; }} }} .status-tag {{ font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: #21262d; color: #c9d1d9; }}</style></head><body>"
    html += f"<h1>ZENITH <span style='color: #58a6ff;'>CLOUD_EVOLUTION</span></h1><div class='grid'><div class='card'><div class='label'>Cash Balance</div><div class='value'>Rp {status['assets']['BTC']['balance_idr']:,.0f}</div></div><div class='card'><div class='label'>Net Realtime Profit</div><div class='value {'positive' if status['total_net_pnl'] >= 0 else 'negative'}'>Rp {status['total_net_pnl']:,.0f}</div></div><div class='card'><div class='label'>The Vault</div><div class='value' style='color:#f59e0b'>Rp {status['vault']:,.0f}</div></div></div>"
    html += "<div class='card'><div class='label'>Neural Matrix (24/7 Learning)</div><table><thead><tr><th>Node</th><th>Live Status</th><th>Current Accuracy</th><th>RL Reward</th><th>Synced</th></tr></thead><tbody>"
    for c, d in status['assets'].items(): html += f"<tr><td>{c}/IDR</td><td><span class='pulse'></span>{d['pulse']}</td><td>{d['mape_1h']:.2f}% (1H) / {d['mape_5m']:.2f}% (5M)</td><td style='color: #3fb950; font-weight: 900;'>Rp {d['rl_score']:,.0f}</td><td><span class='status-tag'>{d['last_training']}</span></td></tr>"
    html += "</tbody></table></div><div class='card' style='margin-top:20px'><div class='label'>Execution Ledger</div><table><tbody>"
    for t in trades: html += f"<tr><td>{t['time'][11:19]}</td><td style='color:#58a6ff; font-weight: 800;'>{t['type']}</td><td>Rp {t['price']:,.0f}</td><td><span class='status-tag'>FINALIZED</span></td></tr>"
    html += "</tbody></table></div></body></html>"
    return html

# 4. APP & LIFESPAN
@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(bot_thinker())
    asyncio.create_task(ticker_loop())
    yield

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/monitor", response_class=HTMLResponse)
def api_monitor(): return generate_monitor_html()
@app.get("/api/all_status")
def api_all(): return get_all_status()
@app.get("/api/status")
def api_st(): return get_status()
@app.get("/api/trades")
def api_tr():
    all_t = []
    for c in AVAILABLE_ASSETS: all_t.extend(asset_states[c]['trade_history'])
    return sorted(all_t, key=lambda x: x['time'], reverse=True)
@app.get("/api/persistent_trades")
def api_pt():
    if not manager.supabase: return []
    try:
        res = manager.supabase.table("trade_ledger").select("*").order("time", desc=True).limit(50).execute()
        return res.data
    except: return []
@app.get("/api/checkpoints")
def api_cp():
    if not manager.supabase: return []
    try:
        res = manager.supabase.table("neural_checkpoints").select("*").order("created_at", desc=True).limit(20).execute()
        return res.data
    except: return []
@app.get("/api/events")
def api_ev(): return global_event_log[-50:]
@app.get("/api/chart")
def api_ch():
    try:
        s = asset_states[CURRENT_COIN]
        ohlcv = s['market_data_1h'] if CURRENT_TF == '1h' else s['market_data_5m']
        p_obj = s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']
        h = s['prediction_history_1h' if CURRENT_TF == '1h' else 'prediction_history_5m']
        return {"ohlcv": ohlcv, "prediction": p_obj, "prediction_history": h}
    except: return {"ohlcv": [], "prediction": {"price": 0, "confidence": 0}, "prediction_history": []}

@app.get("/api/safety")
def api_safety():
    return safety_settings

@app.post("/api/update_safety")
async def update_safety(sl: float, tp: float):
    safety_settings['sl_atr_mult'] = sl
    safety_settings['tp_atr_mult'] = tp
    return {"status": "success"}

@app.post("/api/panic_sell")
def panic_sell():
    """Force liquidation of all active positions and pause engine."""
    safety_settings['emergency_stop'] = True
    liquidated_count = 0
    
    for c in AVAILABLE_ASSETS:
        sb = sandboxes[c]
        curr_p = asset_states[c]['quant']['current_price']
        
        if sb.active_position == 'LONG':
            sb.close_long(c, curr_p)
            liquidated_count += 1
            print(f"[EMERGENCY] Liquidated LONG position for {c}")
            
        elif sb.active_position == 'SHORT':
            sb.close_short(c, curr_p)
            liquidated_count += 1
            print(f"[EMERGENCY] Liquidated SHORT position for {c}")
            
        # Push the finalized empty state to cloud
        manager.push_neural_memory(c, '1h')
        manager.push_neural_memory(c, '5m')

    global_event_log.append({
        "time": datetime.now().isoformat(), 
        "message": f"PANIC PROTOCOL TRIGGERED. Liquidated {liquidated_count} positions. Engine paused.", 
        "type": "WARNING"
    })
    
    return {"status": "success", "liquidated": liquidated_count}

@app.post("/api/set_coin")
def set_c(coin: str): global CURRENT_COIN; CURRENT_COIN = coin.upper(); return {"status": "success"}
@app.post("/api/set_timeframe")
def set_t(tf: str): global CURRENT_TF; CURRENT_TF = tf; return {"status": "success"}

@app.post("/api/update_manual_config")
async def update_cfg(active: str, conf: float, sig: float, macro: str):
    global manual_override_config
    manual_override_config = {
        "active": active.lower() == 'true', 
        "conf_threshold": conf, 
        "signal_threshold": sig, 
        "use_macro": macro.lower() == 'true'
    }
    return {"status": "success"}

@app.post("/api/update_daily_target")
async def update_target(target: float):
    global daily_target_idr
    daily_target_idr = target
    push_bot_state('global')
    return {"status": "success"}

@app.post("/api/update_safety")
async def update_safety(sl: float, tp: float):
    safety_settings['sl_atr_mult'] = sl
    safety_settings['tp_atr_mult'] = tp
    return {"status": "success"}

@app.post("/api/panic_sell")
def panic_sell():
    """Force liquidation of all active positions and pause engine."""
    safety_settings['emergency_stop'] = True
    liquidated_count = 0
    for c in AVAILABLE_ASSETS:
        sb = sandboxes[c]
        curr_p = asset_states[c]['quant']['current_price']
        if sb.active_position == 'LONG':
            sb.close_long(c, curr_p)
            liquidated_count += 1
        elif sb.active_position == 'SHORT':
            sb.close_short(c, curr_p)
            liquidated_count += 1
    
    global_event_log.append({
        "time": datetime.now().isoformat(), 
        "message": f"PANIC PROTOCOL TRIGGERED. Liquidated {liquidated_count} positions. Engine paused.", 
        "type": "WARNING"
    })
    return {"status": "success", "liquidated": liquidated_count}

# 5. LOOPS
async def ticker_loop():
    while not stop_event.is_set():
        try:
            for c in AVAILABLE_ASSETS:
                ticker = await ex_async.fetch_ticker(f"{c}/IDR"); curr_p = float(ticker['last'])
                await asyncio.sleep(0.5)
                ob = await ex_async.fetch_order_book(f"{c}/IDR", limit=20); mid = (ob['bids'][0][0] + ob['asks'][0][0]) / 2
                w_b = sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in ob['bids']]); w_a = sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in ob['asks']])
                obi_val = (w_b - w_a) / (w_b + w_a); global_smoothed_obi[c] = (obi_val * 0.2) + (global_smoothed_obi[c] * 0.8)
                asset_states[c]['quant']['current_price'] = curr_p; asset_states[c]['quant']['obi'] = global_smoothed_obi[c]
                
                res = asset_states[c]['consensus']; sb = sandboxes[c]
                if not safety_settings['emergency_stop']:
                    conf = float(res.get('confidence', 0)); thr = (manual_override_config['conf_threshold'] if manual_override_config['active'] else 0.55) + sb.dynamic_conf_adder
                    dynamic_lot = BASE_LOT_SIZE * (0.5 + (conf - 0.5) * 4); dynamic_lot = max(BASE_LOT_SIZE * 0.5, min(BASE_LOT_SIZE * 2.0, dynamic_lot))

                    if conf > thr:
                        if res.get('signal') == 'BUY' and global_smoothed_obi[c] > 0.03:
                            if sb.active_position == 'SHORT': sb.close_short(c, curr_p)
                            if sb.open_long(c, curr_p, dynamic_lot): pass
                        elif res.get('signal') == 'SELL' and global_smoothed_obi[c] < -0.03:
                            if sb.active_position == 'LONG': sb.close_long(c, curr_p)
                            if sb.open_short(c, curr_p, dynamic_lot): pass
                await asyncio.sleep(1)
            await asyncio.sleep(5)
        except: await asyncio.sleep(5)

async def bot_thinker():
    print("[INIT] Core Intelligence Setup...")
    for c in AVAILABLE_ASSETS: 
        b1, b5 = manager.load_pair(c)
        asset_states[c]['bot_status'].update({'best_error_rate_1h': b1, 'best_error_rate_5m': b5})
        asset_states[c]['prediction_history_1h'] = fetch_predictions_from_db(c, '1h')
        asset_states[c]['prediction_history_5m'] = fetch_predictions_from_db(c, '5m')
    pull_bot_state()

    while not stop_event.is_set():
        try:
            btc_1h_raw = await ex_async.fetch_ohlcv('BTC/IDR', '1h', limit=150)
            await asyncio.sleep(1.5)
            btc_5m_raw = await ex_async.fetch_ohlcv('BTC/IDR', '5m', limit=150)
            await asyncio.sleep(1.5)
            
            btc_1h = pd.DataFrame(btc_1h_raw, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            btc_5m = pd.DataFrame(btc_5m_raw, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])

            for coin in AVAILABLE_ASSETS:
                asset_states[coin]['active_pulse'] = "Thinking..."
                o1_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '1h', limit=150)
                await asyncio.sleep(1.5)
                o5_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '5m', limit=150)
                await asyncio.sleep(1.5)
                
                def process_df(ohlcv, btc_df=None):
                    df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                    df['rsi'] = RSIIndicator(close=df['close']).rsi(); df['atr'] = AverageTrueRange(high=df['high'], low=df['low'], close=df['close']).average_true_range()
                    df['vol_sma9'] = df['volume'].rolling(window=9).mean(); macd_ind = MACD(close=df['close']); df['macd'] = macd_ind.macd()
                    bb_ind = BollingerBands(close=df['close']); df['bb_h'] = bb_ind.bollinger_hband(); df['bb_l'] = bb_ind.bollinger_lband()
                    df['obv'] = OnBalanceVolumeIndicator(close=df['close'], volume=df['volume']).on_balance_volume()
                    if btc_df is not None:
                        temp_btc = btc_df.set_index('timestamp'); df = df.set_index('timestamp').join(temp_btc[['close', 'volume']], rsuffix='_BTC').reset_index()
                        df.rename(columns={'close_BTC': 'btc_close', 'volume_BTC': 'btc_volume'}, inplace=True)
                    return df.bfill().ffill().fillna(0)

                df1 = process_df(o1_raw, btc_1h if coin != 'BTC' else None); df5 = process_df(o5_raw, btc_5m if coin != 'BTC' else None)
                asset_states[coin]['market_data_1h'] = df1.to_dict('records'); asset_states[coin]['market_data_5m'] = df5.to_dict('records')
                
                mm = manager.loaded_models[coin]
                def get_inp(df, k):
                    req = list(mm[k]['scaler_x'].feature_names_in_); c = df.tail(60).copy()
                    if 'bb_high' in req and 'bb_high' not in c.columns: c['bb_high'] = c['bb_h']; c['bb_low'] = c['bb_l']
                    if 'bb_h' in req and 'bb_h' not in c.columns: c['bb_h'] = c['bb_high']; c['bb_l'] = c['bb_low']
                    return mm[k]['scaler_x'].transform(c[req]).reshape(1, 60, -1)

                curr_p = float(df5.iloc[-1]['close']); ts1, ts5 = int(df1.iloc[-1]['timestamp']), int(df5.iloc[-1]['timestamp']); s = asset_states[coin]

                # REINFORCED ONLINE LEARNING
                if ts1 != s['last_ts_1h']:
                    if s['last_input_1h'] is not None:
                        manager.online_learn(coin, '1h', s['last_input_1h'], curr_p)
                        err = abs(s['prediction_1h']['price'] - curr_p) / curr_p; curr_m = (err * 100 * 0.1) + (s['bot_status']['error_rate_1h'] * 0.9); s['bot_status']['error_rate_1h'] = curr_m
                        if curr_m < s['bot_status']['best_error_rate_1h']: s['bot_status']['best_error_rate_1h'] = curr_m; manager.save_single_model(coin, '1h', curr_m)
                    new_in = get_inp(df1, '1h'); p_p, _ = manager.predict_tf(coin, '1h', new_in, curr_p)
                    s['prediction_1h'] = {"price": p_p, "confidence": _}
                    s['prediction_history_1h'].append({"timestamp": ts1, "price": p_p})
                    if len(s['prediction_history_1h']) > 150: s['prediction_history_1h'].pop(0)
                    s['last_ts_1h'], s['last_input_1h'] = ts1, new_in; s['last_training'] = datetime.now().strftime('%H:%M:%S')

                if ts5 != s['last_ts_5m']:
                    if s['last_input_5m'] is not None:
                        manager.online_learn(coin, '5m', s['last_input_5m'], curr_p)
                        err = abs(s['prediction_5m']['price'] - curr_p) / curr_p; curr_m = (err * 100 * 0.1) + (s['bot_status']['error_rate_5m'] * 0.9); s['bot_status']['error_rate_5m'] = curr_m
                        if curr_m < s['bot_status']['best_error_rate_5m']: s['bot_status']['best_error_rate_5m'] = curr_m; manager.save_single_model(coin, '5m', curr_m)
                    new_in = get_inp(df5, '5m'); p_p, _ = manager.predict_tf(coin, '5m', new_in, curr_p)
                    s['prediction_5m'] = {"price": p_p, "confidence": _}
                    s['prediction_history_5m'].append({"timestamp": ts5, "price": p_p})
                    if len(s['prediction_history_5m']) > 150: s['prediction_history_5m'].pop(0)
                    s['last_ts_5m'], s['last_input_5m'] = ts5, new_in; s['last_training'] = datetime.now().strftime('%H:%M:%S')

                s['consensus'] = manager.get_consensus_signal(coin, get_inp(df1, '1h'), get_inp(df5, '5m'), curr_p); s['active_pulse'] = "Monitoring Market"
            await asyncio.sleep(15)
        except Exception as e: 
            print(f"[THINKER ERROR] {e}")
            if not stop_event.is_set(): await asyncio.sleep(10)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)
