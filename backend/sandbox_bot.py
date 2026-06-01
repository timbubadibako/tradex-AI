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
from ta.momentum import RSIIndicator, StochasticOscillator
from ta.trend import MACD
from ta.volatility import BollingerBands, AverageTrueRange
from ta.volume import OnBalanceVolumeIndicator

# FASTAPI & Server dependencies
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# ==========================================
# 1. KONFIGURASI SISTEM
# ==========================================
MODEL_FILE = 'btc_idr_hybrid_v2.keras'
SCALER_FEAT_FILE = 'scaler_features_v2.pkl'
SCALER_TARGET_FILE = 'scaler_target_v2.pkl'

exchange = ccxt.indodax()

INITIAL_BALANCE_IDR = 10000000  
INITIAL_BALANCE_BTC = 1.0       
TRADING_FEE = 0.001             
LOT_SIZE = 0.005                

# Global data storage untuk API
global_market_data = [] 
global_trade_history = []
global_prediction_history = [] 
global_bot_status = {}
global_prediction = {"price": 0, "change_pct": 0}
global_error_rate = 0.0 

# ==========================================
# 2. CLASS SANDBOX ENGINE (POSITION BASED)
# ==========================================
class TradingSandbox:
    def __init__(self, idr, btc):
        self.balance_idr = idr
        self.btc_holdings = btc
        self.initial_equity = idr + (btc * 1300000000) 
        self.wins = 0
        self.losses = 0
        self.history = []
        self.active_position = None # 'LONG', 'SHORT', or None
        self.entry_price = 0

    def get_equity(self, current_price):
        return self.balance_idr + (self.btc_holdings * current_price)

    def open_long(self, price):
        if self.active_position is None:
            cost = LOT_SIZE * price
            if self.balance_idr >= cost:
                self.balance_idr -= cost * (1 + TRADING_FEE)
                self.btc_holdings += LOT_SIZE
                self.active_position = 'LONG'
                self.entry_price = price
                trade = {'type': 'OPEN_LONG', 'price': price, 'amount': LOT_SIZE, 'time': datetime.now().isoformat(), 'pnl': 0}
                self.history.insert(0, trade)
                global_trade_history.insert(0, trade)
                print(f"📈 [LONG] Open position at Rp {price:,.0f}")

    def close_long(self, price):
        if self.active_position == 'LONG':
            revenue = LOT_SIZE * price
            self.balance_idr += revenue * (1 - TRADING_FEE)
            self.btc_holdings -= LOT_SIZE
            pnl = (price - self.entry_price) * LOT_SIZE
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'type': 'CLOSE_LONG', 'price': price, 'amount': LOT_SIZE, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade)
            global_trade_history.insert(0, trade)
            print(f"💰 [LONG] Closed at Rp {price:,.0f} | PnL: Rp {pnl:,.0f}")

    def open_short(self, price):
        if self.active_position is None:
            if self.btc_holdings >= LOT_SIZE:
                # Simulasi short: jual dulu barang yang dipinjem/dimiliki
                self.balance_idr += (LOT_SIZE * price) * (1 - TRADING_FEE)
                self.btc_holdings -= LOT_SIZE
                self.active_position = 'SHORT'
                self.entry_price = price
                trade = {'type': 'OPEN_SHORT', 'price': price, 'amount': LOT_SIZE, 'time': datetime.now().isoformat(), 'pnl': 0}
                self.history.insert(0, trade)
                global_trade_history.insert(0, trade)
                print(f"📉 [SHORT] Open position at Rp {price:,.0f}")

    def close_short(self, price):
        if self.active_position == 'SHORT':
            cost = LOT_SIZE * price
            self.balance_idr -= cost * (1 + TRADING_FEE)
            self.btc_holdings += LOT_SIZE
            pnl = (self.entry_price - price) * LOT_SIZE # Short profit if price drops
            if pnl > 0: self.wins += 1
            else: self.losses += 1
            self.active_position = None
            trade = {'type': 'CLOSE_SHORT', 'price': price, 'amount': LOT_SIZE, 'time': datetime.now().isoformat(), 'pnl': pnl}
            self.history.insert(0, trade)
            global_trade_history.insert(0, trade)
            print(f"💰 [SHORT] Closed at Rp {price:,.0f} | PnL: Rp {pnl:,.0f}")

# ==========================================
# 3. CLASS AI LEARNER
# ==========================================
class OnlineLearner:
    def __init__(self, model_path):
        self.model_path = model_path
        self.model = tf.keras.models.load_model(model_path)
        self.buffer_x = []
        self.buffer_y = []

    def add_experience(self, x_sequence, actual_y):
        self.buffer_x.append(x_sequence)
        self.buffer_y.append(actual_y)
        if len(self.buffer_x) >= 5:
            self.train_on_batch()

    def train_on_batch(self):
        print("🧠 [ONLINE LEARNING] Menyesuaikan bobot AI...")
        X = np.array(self.buffer_x).reshape(-1, 60, 14)
        Y = np.array(self.buffer_y).reshape(-1, 1)
        self.model.fit(X, Y, epochs=2, verbose=0)
        self.model.save(self.model_path)
        self.buffer_x = []
        self.buffer_y = []
        print("✅ Bobot AI diperbarui.")

# ==========================================
# 4. FASTAPI SETUP
# ==========================================
app = FastAPI(title="BTC AI Broker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
def get_status():
    status = global_bot_status.copy()
    status["error_rate"] = global_error_rate
    return status

@app.get("/api/chart")
def get_chart():
    return {
        "ohlcv": global_market_data,
        "prediction": global_prediction,
        "prediction_history": global_prediction_history
    }

@app.get("/api/trades")
def get_trades():
    return global_trade_history

# ==========================================
# 5. BOT CORE ENGINE
# ==========================================
def bot_loop():
    global global_market_data, global_bot_status, global_prediction, global_prediction_history, global_error_rate
    
    print("🚀 Broker AI Engine Berjalan...")
    
    if not os.path.exists(MODEL_FILE):
        print("❌ Model tidak ditemukan!")
        return

    learner = OnlineLearner(MODEL_FILE)
    scaler_feat = joblib.load(SCALER_FEAT_FILE)
    scaler_target = joblib.load(SCALER_TARGET_FILE)
    sandbox = TradingSandbox(INITIAL_BALANCE_IDR, INITIAL_BALANCE_BTC)
    
    # --- PRE-FILL PREDICTION HISTORY ---
    print("⏳ Pre-filling AI Trace history...")
    initial_ohlcv = exchange.fetch_ohlcv('BTC/IDR', timeframe='1h', limit=150)
    df_init = pd.DataFrame(initial_ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    # Indicators for history
    df_init['rsi'] = RSIIndicator(close=df_init['close']).rsi()
    stoch = StochasticOscillator(high=df_init['high'], low=df_init['low'], close=df_init['close'])
    df_init['stoch_k'] = stoch.stoch(); df_init['stoch_d'] = stoch.stoch_signal()
    macd = MACD(close=df_init['close'])
    df_init['macd'] = macd.macd(); df_init['macd_signal'] = macd.macd_signal()
    bb = BollingerBands(close=df_init['close'])
    df_init['bb_high'] = bb.bollinger_hband(); df_init['bb_low'] = bb.bollinger_lband()
    df_init['atr'] = AverageTrueRange(high=df_init['high'], low=df_init['low'], close=df_init['close']).average_true_range()
    df_init['obv'] = OnBalanceVolumeIndicator(close=df_init['close'], volume=df_init['volume']).on_balance_volume()
    df_init.dropna(inplace=True)
    
    features = ['open', 'high', 'low', 'close', 'volume', 'rsi', 'stoch_k', 'stoch_d', 'macd', 'macd_signal', 'bb_high', 'bb_low', 'atr', 'obv']
    
    total_error = 0
    count = 0
    for i in range(len(df_init) - 60):
        seq = df_init.iloc[i : i + 60][features].values
        scaled_seq = scaler_feat.transform(seq).reshape(1, 60, 14)
        pred = learner.model.predict(scaled_seq, verbose=0)
        dummy = np.zeros((1, 14)); dummy[0, 3] = pred[0, 0]
        p_price = float(scaler_target.inverse_transform(dummy)[0, 3])
        # Tebakan untuk 1 jam ke depan
        target_hour_ts = int(df_init.iloc[i + 59]['timestamp']) + (3600 * 1000)
        global_prediction_history.append({"timestamp": target_hour_ts, "price": p_price})
        
        # Hitung error jika actual-nya sudah ada di df_init
        actual_match = df_init[df_init['timestamp'] == target_hour_ts]
        if not actual_match.empty:
            actual_price = actual_match.iloc[0]['close']
            total_error += abs(p_price - actual_price) / actual_price
            count += 1
            
    if count > 0:
        global_error_rate = (total_error / count) * 100
        
    print(f"✅ Prediction history pre-filled. Initial MAPE: {global_error_rate:.2f}%")

    last_processed_hour = None
    
    while True:
        try:
            # 1. Fetch Data
            ohlcv = exchange.fetch_ohlcv('BTC/IDR', timeframe='1h', limit=100)
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            current_price = float(df.iloc[-1]['close'])
            current_ts = int(df.iloc[-1]['timestamp'])
            current_hour = datetime.fromtimestamp(current_ts/1000).hour
            
            global_market_data = df.to_dict('records')

            # 2. Indicators
            df['rsi'] = RSIIndicator(close=df['close']).rsi()
            stoch = StochasticOscillator(high=df['high'], low=df['low'], close=df['close'])
            df['stoch_k'] = stoch.stoch(); df['stoch_d'] = stoch.stoch_signal()
            macd = MACD(close=df['close'])
            df['macd'] = macd.macd(); df['macd_signal'] = macd.macd_signal()
            bb = BollingerBands(close=df['close'])
            df['bb_high'] = bb.bollinger_hband(); df['bb_low'] = bb.bollinger_lband()
            df['atr'] = AverageTrueRange(high=df['high'], low=df['low'], close=df['close']).average_true_range()
            df['obv'] = OnBalanceVolumeIndicator(close=df['close'], volume=df['volume']).on_balance_volume()
            df.dropna(inplace=True)

            # 3. Predict
            last_sequence = df.tail(60)[features].values
            scaled_input = scaler_feat.transform(last_sequence).reshape(1, 60, 14)
            pred_scaled = learner.model.predict(scaled_input, verbose=0)
            
            dummy = np.zeros((1, 14)); dummy[0, 3] = pred_scaled[0, 0]
            predicted_price = float(scaler_target.inverse_transform(dummy)[0, 3])
            change_pct = ((predicted_price - current_price) / current_price) * 100
            
            global_prediction = {"price": predicted_price, "change_pct": change_pct}

            # 4. Trading Logic (Position Based)
            if change_pct > 0.5:
                if sandbox.active_position == 'SHORT': sandbox.close_short(current_price)
                if sandbox.active_position is None: sandbox.open_long(current_price)
            elif change_pct < -0.5:
                if sandbox.active_position == 'LONG': sandbox.close_long(current_price)
                if sandbox.active_position is None: sandbox.open_short(current_price)

            # 5. Update Status
            equity = sandbox.get_equity(current_price)
            winrate = (sandbox.wins / (sandbox.wins + sandbox.losses) * 100) if (sandbox.wins + sandbox.losses) > 0 else 0
            global_bot_status = {
                "balance_idr": float(sandbox.balance_idr),
                "btc_holdings": float(sandbox.btc_holdings),
                "equity": float(equity),
                "profit_pct": float(((equity - sandbox.initial_equity) / sandbox.initial_equity) * 100),
                "total_trades": len(sandbox.history),
                "winrate": float(winrate),
                "active_pos": sandbox.active_position,
                "entry_price": float(sandbox.entry_price),
                "market_price": float(current_price),
                "last_update": datetime.now().isoformat()
            }

            # 6. History & Learning
            if last_processed_hour != current_hour:
                target_ts = current_ts + (3600 * 1000)
                global_prediction_history.append({"timestamp": target_ts, "price": predicted_price})
                
                if last_processed_hour is not None:
                    actual_close = df.iloc[-2]['close']
                    actual_y_scaled = scaler_target.transform([[actual_close]])[0, 0]
                    prev_sequence_scaled = scaler_feat.transform(df.iloc[-62:-2][features].values)
                    learner.add_experience(prev_sequence_scaled, actual_y_scaled)
                    
                    past_preds = [p for p in global_prediction_history if p['timestamp'] == current_ts]
                    if past_preds:
                        error = abs(past_preds[0]['price'] - current_price) / current_price
                        global_error_rate = (global_error_rate * 0.9) + (error * 100 * 0.1)

                last_processed_hour = current_hour

            print(f"✔️ Broker Live: {current_price:,.0f} IDR | Equity: {equity:,.0f} | Pos: {sandbox.active_position}", end="\r")
            time.sleep(10)

        except Exception as e:
            print(f"\n❌ Error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    t = threading.Thread(target=bot_loop, daemon=True)
    t.start()
    uvicorn.run(app, host="0.0.0.0", port=8000)
