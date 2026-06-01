import os
import time
import json
import joblib
import threading
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime
import ccxt
from ta.momentum import RSIIndicator
from ta.trend import MACD, SMAIndicator
from ta.volatility import BollingerBands, AverageTrueRange
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

# State Global untuk API
CURRENT_COIN = 'BTC' 
CURRENT_TF = '1h' 

global_market_data = [] 
global_trade_history = []
global_prediction_history_1h = [] 
global_prediction_history_5m = [] 
global_bot_status = {}
global_prediction = {"price": 0, "change_pct": 0, "confidence": 0, "signal": "WAIT"}
global_quant_metrics = {"obi": 0.0, "atr": 0.0}
global_error_rate = 0.0 
global_smoothed_obi = 0.0 

INITIAL_BALANCE_IDR = 10000000  
INITIAL_BALANCE_BTC = 1.0       
TRADING_FEE = 0.001             
LOT_SIZE_BTC = 0.005 

# ==========================================
# 2. CLASS SANDBOX ENGINE
# ==========================================
class TradingSandbox:
    def __init__(self, idr, btc):
        self.balance_idr = idr
        self.btc_holdings = btc
        self.initial_equity = idr + (btc * 1300000000) 
        self.wins = 0
        self.losses = 0
        self.history = []
        self.active_position = None 
        self.entry_price = 0

    def get_equity(self, current_price):
        return self.balance_idr + (self.btc_holdings * current_price)

    def open_long(self, price):
        if self.active_position is None:
            cost = LOT_SIZE_BTC * price
            if self.balance_idr >= cost:
                self.balance_idr -= cost * (1 + TRADING_FEE)
                self.btc_holdings += LOT_SIZE_BTC
                self.active_position = 'LONG'
                self.entry_price = price
                trade = {'type': 'OPEN_LONG', 'price': price, 'amount': LOT_SIZE_BTC, 'time': datetime.now().isoformat(), 'pnl': 0}
                self.history.insert(0, trade); global_trade_history.insert(0, trade)
                return True
        return False

    def close_long(self, price):
        if self.active_position == 'LONG':
            rev = LOT_SIZE_BTC * price
            self.balance_idr += rev * (1 - TRADING_FEE)
            self.btc_holdings -= LOT_SIZE_BTC
            pnl = (price - self.entry_price) * LOT_SIZE_BTC
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'type': 'CLOSE_LONG', 'price': price, 'amount': LOT_SIZE_BTC, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade); global_trade_history.insert(0, trade)
            return True
        return False

    def open_short(self, price):
        if self.active_position is None and self.btc_holdings >= LOT_SIZE_BTC:
            self.balance_idr += (LOT_SIZE_BTC * price) * (1 - TRADING_FEE)
            self.btc_holdings -= LOT_SIZE_BTC
            self.active_position = 'SHORT'
            self.entry_price = price
            trade = {'type': 'OPEN_SHORT', 'price': price, 'amount': LOT_SIZE_BTC, 'time': datetime.now().isoformat(), 'pnl': 0}
            self.history.insert(0, trade); global_trade_history.insert(0, trade)
            return True
        return False

    def close_short(self, price):
        if self.active_position == 'SHORT':
            cost = LOT_SIZE_BTC * price
            self.balance_idr -= cost * (1 + TRADING_FEE)
            self.btc_holdings += LOT_SIZE_BTC
            pnl = (self.entry_price - price) * LOT_SIZE_BTC
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'type': 'CLOSE_SHORT', 'price': price, 'amount': LOT_SIZE_BTC, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade); global_trade_history.insert(0, trade)
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
    bb = BollingerBands(close=df['close'])
    df['bb_h'] = bb.bollinger_hband(); df['bb_l'] = bb.bollinger_lband()
    df['obv'] = OnBalanceVolumeIndicator(close=df['close'], volume=df['volume']).on_balance_volume()
    if btc_data is not None:
        df = df.join(btc_data[['close', 'volume']], rsuffix='_BTC')
        df.rename(columns={'close_BTC': 'btc_close', 'volume_BTC': 'btc_volume'}, inplace=True)
    return df.dropna()

def calculate_obi(symbol):
    global global_smoothed_obi
    try:
        ob = exchange.fetch_order_book(symbol, limit=100)
        mid = (ob['bids'][0][0] + ob['asks'][0][0]) / 2
        def w_vol(orders):
            return sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in orders])
        w_bids = w_vol(ob['bids']); w_asks = w_vol(ob['asks'])
        curr = (w_bids - w_asks) / (w_bids + w_asks)
        global_smoothed_obi = (curr * 0.2) + (global_smoothed_obi * 0.8)
        return global_smoothed_obi
    except: return global_smoothed_obi

# ==========================================
# 4. FASTAPI
# ==========================================
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/api/status")
def get_status():
    status = global_bot_status.copy()
    status.update(global_quant_metrics)
    status.update({"coin": CURRENT_COIN, "tf": CURRENT_TF, "error_rate": global_error_rate})
    return status

@app.get("/api/chart")
def get_chart():
    hist = global_prediction_history_1h if CURRENT_TF == '1h' else global_prediction_history_5m
    return {"ohlcv": global_market_data, "prediction": global_prediction, "prediction_history": hist}

@app.post("/api/set_timeframe")
def set_timeframe(tf: str):
    global CURRENT_TF, refresh_event
    if tf in ['1h', '5m']: 
        CURRENT_TF = tf
        refresh_event.set() # Turbo Refresh!
        return {"status": "success"}
    return {"status": "error"}

@app.get("/api/trades")
def get_trades(): return global_trade_history

@app.post("/api/manual_buy")
def manual_buy():
    global manual_signal, refresh_event
    manual_signal = "BUY"
    refresh_event.set()
    return {"status": "success"}

@app.post("/api/manual_sell")
def manual_sell():
    global manual_signal, refresh_event
    manual_signal = "SELL"
    refresh_event.set()
    return {"status": "success"}

manual_signal = None
refresh_event = threading.Event()

# ==========================================
# 5. BOT LOOP
# ==========================================
def bot_loop():
    global global_market_data, global_bot_status, global_prediction, global_prediction_history_1h, global_prediction_history_5m, global_quant_metrics, global_error_rate, refresh_event
    print("🚀 Super-Brain Broker Engine Starting...")
    manager = ModelManager(MODELS_DIR)
    sandbox = TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC)
    
    # Pre-fill history
    try:
        manager.load_pair(CURRENT_COIN)
        mm = manager.loaded_models[CURRENT_COIN]
        df_init = get_processed_df(f"{CURRENT_COIN}/IDR", '1h', limit=150)
        f_names = list(mm['1h']['scaler_x'].feature_names_in_)
        for i in range(len(df_init) - 60):
            c = df_init.iloc[i:i+60].copy()
            if 'bb_high' in f_names and 'bb_high' not in c.columns: c['bb_high']=c['bb_h']; c['bb_low']=c['bb_l']
            elif 'bb_h' in f_names and 'bb_h' not in c.columns: c['bb_h']=c['bb_high']; c['bb_l']=c['bb_low']
            
            # Wrap in DataFrame to keep sklearn happy
            c_df = pd.DataFrame(c[f_names].values, columns=f_names)
            x_in = mm['1h']['scaler_x'].transform(c_df).reshape(1, 60, -1)
            p_p, _ = manager.predict_tf(CURRENT_COIN, '1h', x_in, float(c.iloc[-1]['close']))
            global_prediction_history_1h.append({"timestamp": int(c.iloc[-1]['timestamp']) + (3600 * 1000), "price": p_p})
    except: pass

    last_hour = None
    while True:
        try:
            symbol = f"{CURRENT_COIN}/IDR"
            btc_1h = None; btc_5m = None
            if CURRENT_COIN != 'BTC':
                b1 = exchange.fetch_ohlcv('BTC/IDR', '1h', limit=100)
                btc_1h = pd.DataFrame(b1, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                b5 = exchange.fetch_ohlcv('BTC/IDR', '5m', limit=100)
                btc_5m = pd.DataFrame(b5, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            
            df1 = get_processed_df(symbol, '1h', limit=100, btc_data=btc_1h)
            df5 = get_processed_df(symbol, '5m', limit=100, btc_data=btc_5m)
            active = df1 if CURRENT_TF == '1h' else df5
            curr_p = float(active.iloc[-1]['close']); curr_ts = int(active.iloc[-1]['timestamp'])
            curr_h = datetime.fromtimestamp(curr_ts/1000).hour
            
            global_market_data = active.tail(100).to_dict('records')
            obi = calculate_obi(symbol); atr = float(df5.iloc[-1]['atr'])
            global_quant_metrics = {"obi": obi, "atr": atr}

            mm = manager.loaded_models[CURRENT_COIN]
            def prep(df, req, m_key):
                c = df.tail(60).copy()
                if 'bb_high' in req and 'bb_high' not in c.columns: c['bb_high']=c['bb_h']; c['bb_low']=c['bb_l']
                elif 'bb_h' in req and 'bb_h' not in c.columns: c['bb_h']=c['bb_high']; c['bb_l']=c['bb_low']
                # Wrap in DataFrame
                c_df = pd.DataFrame(c[req].values, columns=req)
                return mm[m_key]['scaler_x'].transform(c_df).reshape(1, 60, -1)

            res = manager.get_consensus_signal(CURRENT_COIN, prep(df1, list(mm['1h']['scaler_x'].feature_names_in_), '1h'), prep(df5, list(mm['5m']['scaler_x'].feature_names_in_), '5m'), curr_p)
            global_prediction = {"price": res['predict_5m' if CURRENT_TF == '5m' else 'predict_1h'], "change_pct": res['change_5m_pct'], "confidence": res['confidence'], "signal": res['signal'], "macro": res['trend_macro']}

            global manual_signal
            if manual_signal:
                if manual_signal == 'BUY':
                    if sandbox.active_position == 'SHORT': sandbox.close_short(curr_p)
                    sandbox.open_long(curr_p)
                else:
                    if sandbox.active_position == 'LONG': sandbox.close_long(curr_p)
                    sandbox.open_short(curr_p)
                manual_signal = None
            elif res['confidence'] > 0.7:
                if res['signal'] == 'BUY' and obi > 0.1:
                    if sandbox.active_position == 'SHORT': sandbox.close_short(curr_p)
                    sandbox.open_long(curr_p)
                elif res['signal'] == 'SELL' and obi < -0.1:
                    if sandbox.active_position == 'LONG': sandbox.close_long(curr_p)
                    sandbox.open_short(curr_p)

            eq = sandbox.get_equity(curr_p); wr = (sandbox.wins / (sandbox.wins + sandbox.losses) * 100) if (sandbox.wins + sandbox.losses) > 0 else 0
            global_bot_status = {"balance_idr": float(sandbox.balance_idr), "btc_holdings": float(sandbox.btc_holdings), "equity": float(eq), "profit_pct": float(((eq - sandbox.initial_equity) / sandbox.initial_equity) * 100), "total_trades": len(sandbox.history), "winrate": float(wr), "active_pos": sandbox.active_position, "entry_price": float(sandbox.entry_price), "market_price": float(curr_p), "last_update": datetime.now().isoformat()}

            if last_hour != curr_h:
                global_prediction_history_1h.append({"timestamp": curr_ts, "price": res['predict_1h']})
                global_prediction_history_5m.append({"timestamp": curr_ts, "price": res['predict_5m']})
                last_hour = curr_h
            
            refresh_event.wait(10)
            refresh_event.clear()
        except Exception as e: print(f"\n❌ Error: {e}"); time.sleep(10)

if __name__ == "__main__":
    t = threading.Thread(target=bot_loop, daemon=True)
    t.start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
