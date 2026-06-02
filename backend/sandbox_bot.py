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
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime
import ccxt
from ta.momentum import RSIIndicator
from ta.trend import MACD
from ta.volatility import AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator
from model_manager import ModelManager

# FASTAPI & Server dependencies
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ==========================================
# 1. KONFIGURASI SISTEM
# ==========================================
MODELS_DIR = 'models'
exchange = ccxt.indodax()
exchange.timeframes['5m'] = '5'

# Global Manager
manager = ModelManager(MODELS_DIR)
AVAILABLE_COINS = ['BTC', 'ETH', 'SOL']
CURRENT_COIN = 'BTC' 
CURRENT_TF = '1h' 

asset_states = {coin: {
    "market_data_1h": [],
    "market_data_5m": [],
    "trade_history": [],
    "prediction_history_1h": [],
    "prediction_history_5m": [],
    "bot_status": {
        "winrate": 0, "profit_pct": 0, 
        "error_rate_1h": 0, "best_error_rate_1h": 999.0,
        "error_rate_5m": 0, "best_error_rate_5m": 999.0
    },
    "prediction_1h": {"price": 0, "confidence": 0},
    "prediction_5m": {"price": 0, "confidence": 0},
    "consensus": {"signal": "WAIT", "macro": "NEUTRAL", "confidence": 0},
    "quant": {"obi": 0.0, "atr": 0.0},
    "last_ts_1h": 0, "last_ts_5m": 0,
    "last_input_1h": None, "last_input_5m": None
} for coin in AVAILABLE_COINS}

global_smoothed_obi = {coin: 0.0 for coin in AVAILABLE_COINS}
manual_signal = None
global_event_log = [] # In-memory event log
refresh_event = threading.Event()

INITIAL_BALANCE_IDR = 10000000  
INITIAL_BALANCE_BTC = 1.0       
TRADING_FEE = 0.001             
LOT_SIZE_BTC = 0.005 

# Global Safety Settings
safety_settings = {
    "sl_atr_mult": 1.5,
    "tp_atr_mult": 2.5,
    "emergency_stop": False
}

# ==========================================
# 2. CLASS SANDBOX ENGINE
# ==========================================
class TradingSandbox:
    def __init__(self, idr, btc):
        self.balance_idr = idr; self.btc_holdings = btc
        self.initial_equity = idr + (btc * 1300000000) 
        self.wins = 0; self.losses = 0; self.history = []
        self.active_position = None; self.entry_price = 0

    def get_equity(self, current_price): return self.balance_idr + (self.btc_holdings * current_price)
    def open_long(self, coin, price):
        if self.active_position is None:
            cost = LOT_SIZE_BTC * price
            if self.balance_idr >= cost:
                self.balance_idr -= cost * (1 + TRADING_FEE); self.btc_holdings += LOT_SIZE_BTC
                self.active_position = 'LONG'; self.entry_price = price
                trade = {'coin': coin, 'type': 'OPEN_LONG', 'price': price, 'time': datetime.now().isoformat(), 'pnl': 0}
                self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
                return True
        return False
    def close_long(self, coin, price):
        if self.active_position == 'LONG':
            self.balance_idr += (LOT_SIZE_BTC * price) * (1 - TRADING_FEE); self.btc_holdings -= LOT_SIZE_BTC
            pnl = (price - self.entry_price) * LOT_SIZE_BTC
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'coin': coin, 'type': 'CLOSE_LONG', 'price': price, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False
    def open_short(self, coin, price):
        if self.active_position is None and self.btc_holdings >= LOT_SIZE_BTC:
            self.balance_idr += (LOT_SIZE_BTC * price) * (1 - TRADING_FEE); self.btc_holdings -= LOT_SIZE_BTC
            self.active_position = 'SHORT'; self.entry_price = price
            trade = {'coin': coin, 'type': 'OPEN_SHORT', 'price': price, 'time': datetime.now().isoformat(), 'pnl': 0}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False
    def close_short(self, coin, price):
        if self.active_position == 'SHORT':
            self.balance_idr -= (LOT_SIZE_BTC * price) * (1 + TRADING_FEE); self.btc_holdings += LOT_SIZE_BTC
            pnl = (self.entry_price - price) * LOT_SIZE_BTC
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'coin': coin, 'type': 'CLOSE_SHORT', 'price': price, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade); asset_states[coin]['trade_history'].insert(0, trade)
            return True
        return False

# ==========================================
# 3. UTILS
# ==========================================
def get_processed_df(symbol, timeframe, limit=100, btc_data=None):
    ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
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

def calculate_obi(coin):
    global global_smoothed_obi
    try:
        symbol = f"{coin}/IDR"
        ob = exchange.fetch_order_book(symbol, limit=100)
        mid = (ob['bids'][0][0] + ob['asks'][0][0]) / 2
        def w_vol(orders): return sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in orders])
        w_bids = w_vol(ob['bids']); w_asks = w_vol(ob['asks'])
        curr = (w_bids - w_asks) / (w_bids + w_asks)
        global_smoothed_obi[coin] = (curr * 0.2) + (global_smoothed_obi[coin] * 0.8)
        return global_smoothed_obi[coin]
    except: return global_smoothed_obi[coin]

# ==========================================
# 4. FASTAPI
# ==========================================
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/status")
def get_status():
    s = asset_states[CURRENT_COIN]
    return {
        "coin": CURRENT_COIN, "tf": CURRENT_TF,
        "balance_idr": s['bot_status'].get('balance_idr', 0), 
        "btc_holdings": s['bot_status'].get('btc_holdings', 0),
        "equity": s['bot_status'].get('equity', 0), 
        "profit_pct": s['bot_status'].get('profit_pct', 0),
        "winrate": s['bot_status'].get('winrate', 0), 
        "error_rate": s['bot_status'].get('error_rate_1h' if CURRENT_TF == '1h' else 'error_rate_5m', 0), 
        "obi": s['quant']['obi'], "atr": s['quant']['atr'], 
        "prediction": {
            "price": s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']['price'],
            "confidence": s['consensus']['confidence'],
            "signal": s['consensus']['signal'],
            "macro": s['consensus']['macro']
        }
    }

@app.get("/api/all_status")
def get_all_status():
    data = {}
    for coin in AVAILABLE_COINS:
        s = asset_states[coin]
        # Get the actual last closing price for THIS coin specifically
        curr_p_1h = float(s['market_data_1h'][-1]['close']) if s['market_data_1h'] else 0
        curr_p_5m = float(s['market_data_5m'][-1]['close']) if s['market_data_5m'] else 0
        
        # 1H Metrics
        pred_p_1h = s['prediction_1h']['price']
        gap_idr_1h = pred_p_1h - curr_p_1h
        gap_pct_1h = (gap_idr_1h / curr_p_1h * 100) if curr_p_1h > 0 else 0
        
        # 5M Metrics
        pred_p_5m = s['prediction_5m']['price']
        gap_idr_5m = pred_p_5m - curr_p_5m
        gap_pct_5m = (gap_idr_5m / curr_p_5m * 100) if curr_p_5m > 0 else 0

        data[coin] = {
            "mape_1h": s['bot_status'].get('error_rate_1h', 0),
            "mape_5m": s['bot_status'].get('error_rate_5m', 0),
            "gap_idr_1h": gap_idr_1h,
            "gap_pct_1h": gap_pct_1h,
            "gap_idr_5m": gap_idr_5m,
            "gap_pct_5m": gap_pct_5m,
            "profit_pct": s['bot_status'].get('profit_pct', 0),
            "equity": s['bot_status'].get('equity', 0),
            "obi": s['quant']['obi']
        }
    return data

@app.get("/api/events")
def get_events(): return global_event_log[-50:]
@app.get("/api/safety")
def get_safety(): return safety_settings

@app.post("/api/update_safety")
def update_safety(sl: float, tp: float):
    global safety_settings
    safety_settings["sl_atr_mult"] = sl; safety_settings["tp_atr_mult"] = tp; return {"status": "success"}

@app.post("/api/panic_sell")
def panic_sell():
    global safety_settings, manual_signal
    safety_settings["emergency_stop"] = True; manual_signal = "SELL_ALL"; return {"status": "success"}

@app.get("/api/chart")
def get_chart():
    s = asset_states[CURRENT_COIN]
    ohlcv = s['market_data_1h'] if CURRENT_TF == '1h' else s['market_data_5m']
    hist = s['prediction_history_1h'] if CURRENT_TF == '1h' else s['prediction_history_5m']
    pred = {
        "price": s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']['price'],
        "confidence": s['consensus']['confidence'],
        "signal": s['consensus']['signal'],
        "macro": s['consensus']['macro']
    }
    return {"ohlcv": ohlcv, "prediction": pred, "prediction_history": hist}

@app.get("/api/trades")
def get_trades():
    all_trades = []
    for c in AVAILABLE_COINS: all_trades.extend(asset_states[c]['trade_history'])
    return sorted(all_trades, key=lambda x: x['time'], reverse=True)

@app.post("/api/set_timeframe")
def set_timeframe(tf: str):
    global CURRENT_TF; CURRENT_TF = tf; refresh_event.set(); return {"status": "success"}

@app.post("/api/set_coin")
def set_coin(coin: str):
    global CURRENT_COIN; CURRENT_COIN = coin.upper(); refresh_event.set(); return {"status": "success"}

# ==========================================
# 5. BOT LOOP
# ==========================================
def bot_loop():
    global global_event_log, manual_signal
    print("🚀 Zenith AI Super-Brain Engine Starting...")
    for c in AVAILABLE_COINS: manager.load_pair(c)
    sandboxes = {c: TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC) for c in AVAILABLE_COINS}
    
    # Pre-fill
    try:
        btc_init_df_1h = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '1h', limit=150), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        btc_init_df_5m = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '5m', limit=150), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        for coin in AVAILABLE_COINS:
            mm = manager.loaded_models[coin]
            # 1H Pre-fill
            df_init_1h = get_processed_df(f"{coin}/IDR", '1h', limit=150, btc_data=btc_init_df_1h if coin != 'BTC' else None)
            f_1h = list(mm['1h']['scaler_x'].feature_names_in_); m_1h = mm['1h']['model']
            total_err_1h = 0; count_1h = 0
            for i in range(len(df_init_1h) - 60):
                c_chunk = df_init_1h.iloc[i:i+60].copy()
                if 'bb_high' in f_1h and 'bb_high' not in c_chunk.columns: c_chunk['bb_high']=c_chunk['bb_h']; c_chunk['bb_low']=c_chunk['bb_l']
                if 'bb_h' in f_1h and 'bb_h' not in c_chunk.columns: c_chunk['bb_h']=c_chunk['bb_high']; c_chunk['bb_l']=c_chunk['bb_low']
                x_in = mm['1h']['scaler_x'].transform(pd.DataFrame(c_chunk[f_1h].values, columns=f_1h)).reshape(1, 60, -1)
                p_p = float(mm['1h']['scaler_y'].inverse_transform(m_1h(tf.convert_to_tensor(x_in, dtype=tf.float32), training=False).numpy())[0,0])
                ts_t = int(c_chunk.iloc[-1]['timestamp']) + (3600 * 1000)
                asset_states[coin]['prediction_history_1h'].append({"timestamp": ts_t, "price": p_p})
                act = df_init_1h[df_init_1h['timestamp'] == ts_t]
                if not act.empty: total_err_1h += abs(p_p - act.iloc[0]['close']) / act.iloc[0]['close']; count_1h += 1
            if count_1h > 0: 
                mape_1h = (total_err_1h / count_1h) * 100
                asset_states[coin]['bot_status']['error_rate_1h'] = mape_1h
                asset_states[coin]['bot_status']['best_error_rate_1h'] = mape_1h 
            
            # 5M Pre-fill
            df_init_5m = get_processed_df(f"{coin}/IDR", '5m', limit=150, btc_data=btc_init_df_5m if coin != 'BTC' else None)
            f_5m = list(mm['5m']['scaler_x'].feature_names_in_); m_5m = mm['5m']['model']
            total_err_5m = 0; count_5m = 0
            for i in range(len(df_init_5m) - 60):
                c_chunk = df_init_5m.iloc[i:i+60].copy()
                if 'bb_high' in f_5m and 'bb_high' not in c_chunk.columns: c_chunk['bb_high']=c_chunk['bb_h']; c_chunk['bb_low']=c_chunk['bb_l']
                if 'bb_h' in f_5m and 'bb_h' not in c_chunk.columns: c_chunk['bb_h']=c_chunk['bb_high']; c_chunk['bb_l']=c_chunk['bb_low']
                x_in = mm['5m']['scaler_x'].transform(pd.DataFrame(c_chunk[f_5m].values, columns=f_5m)).reshape(1, 60, -1)
                p_p = float(mm['5m']['scaler_y'].inverse_transform(m_5m(tf.convert_to_tensor(x_in, dtype=tf.float32), training=False).numpy())[0,0])
                ts_t = int(c_chunk.iloc[-1]['timestamp']) + (300 * 1000)
                asset_states[coin]['prediction_history_5m'].append({"timestamp": ts_t, "price": p_p})
                act = df_init_5m[df_init_5m['timestamp'] == ts_t]
                if not act.empty: total_err_5m += abs(p_p - act.iloc[0]['close']) / act.iloc[0]['close']; count_5m += 1
            if count_5m > 0:
                mape_5m = (total_err_5m / count_5m) * 100
                asset_states[coin]['bot_status']['error_rate_5m'] = mape_5m
                asset_states[coin]['bot_status']['best_error_rate_5m'] = mape_5m
        print("✅ All Asset Traces pre-filled.")
    except Exception as e: print(f"⚠️ Pre-fill failed: {e}")

    bot_loop.last_save_time = time.time()
    while True:
        try:
            btc_1h = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '1h', limit=100), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            btc_5m = pd.DataFrame(exchange.fetch_ohlcv('BTC/IDR', '5m', limit=100), columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            for coin in AVAILABLE_COINS:
                df1 = get_processed_df(f"{coin}/IDR", '1h', btc_data=btc_1h if coin != 'BTC' else None)
                df5 = get_processed_df(f"{coin}/IDR", '5m', btc_data=btc_5m if coin != 'BTC' else None)
                s = asset_states[coin]; curr_p = float(df5.iloc[-1]['close']); ts_1h = int(df1.iloc[-1]['timestamp']); ts_5m = int(df5.iloc[-1]['timestamp']); mm = manager.loaded_models[coin]
                def prep_seq(df, m_key):
                    req = list(mm[m_key]['scaler_x'].feature_names_in_); c = df.tail(60).copy()
                    if 'bb_high' in req and 'bb_high' not in c.columns: c['bb_high']=c['bb_h']; c['bb_low']=c['bb_l']
                    if 'bb_h' in req and 'bb_h' not in c.columns: c['bb_h']=c['bb_high']; c['bb_l']=c['bb_low']
                    return mm[m_key]['scaler_x'].transform(pd.DataFrame(c[req].values, columns=req)).reshape(1, 60, -1)
                
                # Update Market Memory
                s['market_data_1h'] = df1.tail(100).to_dict('records')
                s['market_data_5m'] = df5.tail(100).to_dict('records')

                if ts_1h != s['last_ts_1h']:
                    if s['last_input_1h'] is not None:
                        manager.online_learn(coin, '1h', s['last_input_1h'], curr_p)
                        err = abs(s['prediction_history_1h'][-1]['price'] - curr_p) / curr_p; curr_mape = (err * 100 * 0.1) + (s['bot_status'].get('error_rate_1h', 0) * 0.9); s['bot_status']['error_rate_1h'] = curr_mape
                        if curr_mape < s['bot_status']['best_error_rate_1h']:
                            msg = f"✨ [{coin} 1H] New peak accuracy: {curr_mape:.2f}% MAPE. Brain archived."; global_event_log.append({"time": datetime.now().isoformat(), "message": msg, "type": "RECORD", "coin": coin}); manager.save_pair(coin); s['bot_status']['best_error_rate_1h'] = curr_mape
                    new_in = prep_seq(df1, '1h'); p_p, _ = manager.predict_tf(coin, '1h', new_in, curr_p); s['prediction_history_1h'].append({"timestamp": ts_1h + (3600 * 1000), "price": p_p}); s['last_ts_1h'] = ts_1h; s['last_input_1h'] = new_in
                    s['prediction_1h'] = {"price": p_p, "confidence": _}
                
                if ts_5m != s['last_ts_5m']:
                    if s['last_input_5m'] is not None:
                        manager.online_learn(coin, '5m', s['last_input_5m'], curr_p)
                        err = abs(s['prediction_history_5m'][-1]['price'] - curr_p) / curr_p; curr_mape_5m = (err * 100 * 0.1) + (s['bot_status'].get('error_rate_5m', 0) * 0.9); s['bot_status']['error_rate_5m'] = curr_mape_5m
                        if curr_mape_5m < s['bot_status']['best_error_rate_5m']:
                            msg = f"✨ [{coin} 5M] New peak accuracy: {curr_mape_5m:.2f}% MAPE. Brain archived."; global_event_log.append({"time": datetime.now().isoformat(), "message": msg, "type": "RECORD", "coin": coin}); manager.save_pair(coin); s['bot_status']['best_error_rate_5m'] = curr_mape_5m
                    new_in = prep_seq(df5, '5m'); p_p, _ = manager.predict_tf(coin, '5m', new_in, curr_p); s['prediction_history_5m'].append({"timestamp": ts_5m + (300 * 1000), "price": p_p}); s['last_ts_5m'] = ts_5m; s['last_input_5m'] = new_in
                    s['prediction_5m'] = {"price": p_p, "confidence": _}

                s['quant']['obi'] = calculate_obi(coin); s['quant']['atr'] = float(df5.iloc[-1]['atr'])
                res = manager.get_consensus_signal(coin, prep_seq(df1, '1h'), prep_seq(df5, '5m'), curr_p)
                s['consensus'] = {"signal": res['signal'], "macro": res['trend_macro'], "confidence": res['confidence']}
                
                sb = sandboxes[coin]
                if manual_signal == "SELL_ALL":
                    if sb.active_position == 'LONG': sb.close_long(coin, curr_p)
                    elif sb.active_position == 'SHORT': sb.close_short(coin, curr_p)
                    if coin == AVAILABLE_COINS[-1]: manual_signal = None
                elif not safety_settings['emergency_stop'] and res['confidence'] > 0.7:
                    if res['signal'] == 'BUY' and s['quant']['obi'] > 0.1:
                        if sb.active_position == 'SHORT': sb.close_short(coin, curr_p)
                        sb.open_long(coin, curr_p)
                    elif res['signal'] == 'SELL' and s['quant']['obi'] < -0.1:
                        if sb.active_position == 'LONG': sb.close_long(coin, curr_p)
                        sb.open_short(coin, curr_p)
                eq = sb.get_equity(curr_p); wr = (sb.wins / (sb.wins + sb.losses) * 100) if (sb.wins + sb.losses) > 0 else 0; s['bot_status'].update({"balance_idr": float(sb.balance_idr), "btc_holdings": float(sb.btc_holdings), "equity": float(eq), "profit_pct": float(((eq - sb.initial_equity) / sb.initial_equity) * 100), "winrate": float(wr)})
            print(f"✔️ Always Learning Active | {CURRENT_COIN} P: {curr_p:,.0f} | OBI: {asset_states[CURRENT_COIN]['quant']['obi']:+.2f}", end="\r")
            refresh_event.wait(10); refresh_event.clear()
        except Exception as e: print(f"\n❌ Error: {e}"); time.sleep(10)

def graceful_shutdown(signum, frame):
    print("\n🛑 [SHUTDOWN] Brain check..."); [manager.save_pair(c) for c in AVAILABLE_COINS]; sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, graceful_shutdown); signal.signal(signal.SIGTERM, graceful_shutdown)
    t = threading.Thread(target=bot_loop, daemon=True); t.start(); uvicorn.run(app, host="0.0.0.0", port=8000)
