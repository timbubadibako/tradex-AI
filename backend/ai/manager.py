import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple, Any, List
from supabase import create_client, Client
from backend.core.config import MODELS_DIR, SUPABASE_URL, SUPABASE_KEY

class BrainManager:
    def __init__(self, event_log: Optional[list] = None):
        self.models_dir = MODELS_DIR
        self.event_log = event_log
        self.loaded_models: Dict[str, Dict] = {}
        self.tf_map = {'1h': '1h', '5m': '5'}
        
        self.supabase: Optional[Client] = None
        if SUPABASE_URL and SUPABASE_KEY:
            try:
                self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
            except Exception: pass

    def _get_model_key(self, coin: str, tf_label: str) -> str:
        return f"{coin.upper()}_{self.tf_map.get(tf_label, tf_label)}"

    def _download_from_supabase(self, coin: str, tf_label: str, specific_name: Optional[str] = None) -> Optional[str]:
        if not self.supabase: return None
        try:
            coin = coin.upper()
            path_remote = f"{coin}/history/{specific_name}" if specific_name else f"{coin}/latest/model_{tf_label}.keras"
            local_fn = specific_name if specific_name else f"latest_{coin}_{tf_label}.keras"
            path_local = os.path.join(self.models_dir, local_fn)
            res = self.supabase.storage.from_('model-brains').download(path_remote)
            if res:
                with open(path_local, 'wb') as f: f.write(res)
                return path_local
            return None
        except: return None

    def load_pair(self, coin: str) -> Tuple[float, float]:
        coin = coin.upper()
        if coin in self.loaded_models: 
            return self.loaded_models[coin]['1h']['best_mape'], self.loaded_models[coin]['5m']['best_mape']

        best_files = {'1h': None, '5m': None}
        best_mape = {'1h': 100.0, '5m': 100.0}
        
        if self.supabase:
            try:
                files = self.supabase.storage.from_('model-brains').list(f"{coin}/history")
                for f in files:
                    fn = f['name']
                    if '_1H_mape_' in fn:
                        try:
                            m = float(fn.split('_mape_')[1].replace('.keras', ''))
                            if m < best_mape['1h']: best_mape['1h'] = m; best_files['1h'] = fn
                        except: pass
                    elif '_5M_mape_' in fn:
                        try:
                            m = float(fn.split('_mape_')[1].replace('.keras', ''))
                            if m < best_mape['5m']: best_mape['5m'] = m; best_files['5m'] = fn
                        except: pass
            except: pass

        path_1h = self._download_from_supabase(coin, '1h', best_files['1h'])
        path_5m = self._download_from_supabase(coin, '5m', best_files['5m'])
        
        # SAKTI FALLBACK: If Supabase fails, check for local standard filenames
        if not path_1h:
            path_1h = os.path.join(self.models_dir, f"latest_{coin}_1h.keras")
            if not os.path.exists(path_1h):
                path_1h = os.path.join(self.models_dir, f"{coin}_1h.keras")
        
        if not path_5m:
            path_5m = os.path.join(self.models_dir, f"latest_{coin}_5m.keras")
            if not os.path.exists(path_5m):
                path_5m = os.path.join(self.models_dir, f"{coin}_5.keras") # Match local '5' pattern

        if not os.path.exists(path_1h) or not os.path.exists(path_5m):
            raise FileNotFoundError(f"Brains (Weights) missing for {coin} at {path_1h} or {path_5m}")

        bias_1h, bias_5m = 0.0, 0.0
        if self.supabase:
            try:
                res = self.supabase.table("bot_neural_memory").select("*").eq("coin", coin).execute()
                for row in res.data:
                    if row['timeframe'] == '1h': bias_1h = row['rl_bias']
                    if row['timeframe'] == '5m': bias_5m = row['rl_bias']
            except: pass

        try:
            m_1h = tf.keras.models.load_model(path_1h)
            m_5m = tf.keras.models.load_model(path_5m)
            k1, k5 = self._get_model_key(coin, '1h'), self._get_model_key(coin, '5m')
            with open(os.path.join(self.models_dir, f"{k1}_scaler_x.pkl"), 'rb') as f: sx1 = joblib.load(f)
            with open(os.path.join(self.models_dir, f"{k1}_scaler_y.pkl"), 'rb') as f: sy1 = joblib.load(f)
            with open(os.path.join(self.models_dir, f"{k5}_scaler_x.pkl"), 'rb') as f: sx5 = joblib.load(f)
            with open(os.path.join(self.models_dir, f"{k5}_scaler_y.pkl"), 'rb') as f: sy5 = joblib.load(f)

            if best_mape['1h'] == 100.0: best_mape['1h'] = 1.5
            if best_mape['5m'] == 100.0: best_mape['5m'] = 2.5

            self.loaded_models[coin] = {
                '1h': {'model': m_1h, 'scaler_x': sx1, 'scaler_y': sy1, 'best_mape': best_mape['1h'], 'rl_bias': bias_1h},
                '5m': {'model': m_5m, 'scaler_x': sx5, 'scaler_y': sy5, 'best_mape': best_mape['5m'], 'rl_bias': bias_5m}
            }
            return best_mape['1h'], best_mape['5m']
        except Exception as e: raise e

    def predict_tf(self, coin: str, tf_label: str, x_input: np.ndarray, current_price: float) -> Tuple[float, float]:
        coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
        pred_scaled = assets['model'].predict(x_input, verbose=0)[0, 0]
        f_names = list(assets['scaler_y'].feature_names_in_)
        pred_price = float(assets['scaler_y'].inverse_transform(pd.DataFrame([[pred_scaled]], columns=f_names))[0, 0])
        change_pct = abs((pred_price - current_price) / current_price) * 100
        base_conf = min(0.95, 0.50 + (change_pct * 0.15))
        return pred_price, max(0.1, min(0.99, base_conf + assets['rl_bias']))

    def bridge_data_gap(self, coin: str, tf_label: str, df: pd.DataFrame, expected_len: int = 100) -> pd.DataFrame:
        """
        🧪 SAKTI FEATURE: Auto-Regressive Roll-Forward Inference.
        Bridges gaps in historical data by hallucinating missing candles using the AI's own logic.
        """
        coin = coin.upper()
        if len(df) >= expected_len: return df.tail(expected_len)
        
        assets = self.loaded_models[coin][tf_label]
        scaler_x = assets['scaler_x']
        req_features = list(scaler_x.feature_names_in_)
        
        # Calculate how many candles are missing
        num_missing = expected_len - len(df)
        print(f"[NEURAL HEALING] Bridging {num_missing} candle gap for {coin} {tf_label}...")
        
        synthesized_df = df.copy()
        
        for _ in range(num_missing):
            # 1. Prepare input window (last 60 candles)
            window = synthesized_df.tail(60).copy()
            # If window too small, we can't bridge effectively
            if len(window) < 60: break
            
            # 2. Extract features for scaling
            # Handle potential BB column name mismatches in scaler
            for f in req_features:
                if f == 'bb_high' and 'bb_high' not in window.columns: window['bb_high'] = window.get('bb_h', window['close'])
                if f == 'bb_low' and 'bb_low' not in window.columns: window['bb_low'] = window.get('bb_l', window['close'])
            
            x_scaled = scaler_x.transform(window[req_features]).reshape(1, 60, -1)
            
            # 3. Predict NEXT Close
            last_close = float(window.iloc[-1]['close'])
            pred_close, _ = self.predict_tf(coin, tf_label, x_scaled, last_close)
            
            # 4. Hallucinate full OHLCV and Indicators for the gap
            # We assume a slight spread and keep volume/indicators constant for the synthetic candle
            new_row = window.iloc[-1].copy()
            new_row['open'] = last_close
            new_row['close'] = pred_close
            new_row['high'] = max(last_close, pred_close) * 1.0005
            new_row['low'] = min(last_close, pred_close) * 0.9995
            
            # Increment timestamp (assuming hourly for 1h, 5min for 5m)
            delta_ms = 3600000 if tf_label == '1h' else 300000
            new_row['timestamp'] = int(new_row['timestamp'] + delta_ms)
            
            synthesized_df = pd.concat([synthesized_df, pd.DataFrame([new_row])], ignore_index=True)
            
        return synthesized_df.tail(expected_len)

    def heal_prediction_history(self, coin: str, tf_label: str, df: pd.DataFrame, db_preds: list) -> List[Dict]:
        """
        🧪 SAKTI FEATURE: Neural Rewind.
        Fills the gaps in the 100-candle prediction memory using auto-regressive inference.
        """
        coin = coin.upper()
        assets = self.loaded_models[coin][tf_label]
        scaler_x = assets['scaler_x']
        req_features = list(scaler_x.feature_names_in_)
        
        # Create lookup map: {timestamp_ms: price}
        db_map = {p['timestamp']: p['price'] for p in db_preds}
        
        healed_preds = []
        ohlcv_records = df.to_dict('records') # Expected length 100
        
        for i, row in enumerate(ohlcv_records):
            ts = row['timestamp']
            if ts in db_map:
                healed_preds.append({"timestamp": ts, "price": db_map[ts]})
            else:
                # LUBANG DETECTED! Perform Neural Rewind
                # We need the 60 candles leading up to this point
                # If we don't have 60 candles yet (start of window), we fallback to close price
                if i < 60:
                    healed_preds.append({"timestamp": ts, "price": row['close']})
                else:
                    # Prepare window from current df context
                    window_df = df.iloc[i-60:i].copy()
                    
                    # Mapping features for scaler
                    for f in req_features:
                        if f == 'bb_high' and 'bb_high' not in window_df.columns: window_df['bb_high'] = window_df.get('bb_h', window_df['close'])
                        if f == 'bb_low' and 'bb_low' not in window_df.columns: window_df['bb_low'] = window_df.get('bb_l', window_df['close'])
                    
                    x_scaled = scaler_x.transform(window_df[req_features]).reshape(1, 60, -1)
                    pred_p, _ = self.predict_tf(coin, tf_label, x_scaled, row['close'])
                    healed_preds.append({"timestamp": ts, "price": pred_p})
                    
                    # Optimization: Feed this back if needed, but here we just append to the memory line
        
        return healed_preds

    def update_rl_bias(self, coin: str, pnl: float, rl_config: Optional[Dict] = None):
        """
        🧠 RL FEEDBACK LOOP: 
        Adjusts the bot's 'Personality' based on real performance.
        Winning streaks boost confidence, losing streaks increase caution.
        """
        coin = coin.upper()
        cfg = rl_config or {"bias_cap_positive": 0.15, "bias_cap_negative": -0.20, "increment_win": 0.05, "increment_loss": 0.07}
        
        # Apply bias to both timeframes for this asset
        for tf in ['1h', '5m']:
            assets = self.loaded_models[coin][tf]
            if pnl > 0:
                assets['rl_bias'] = min(cfg["bias_cap_positive"], assets['rl_bias'] + cfg["increment_win"])
            else:
                assets['rl_bias'] = max(cfg["bias_cap_negative"], assets['rl_bias'] - cfg["increment_loss"])
            
            self.push_neural_memory(coin, tf)
            print(f"[RL BRAIN] {coin} {tf} Bias Updated: {assets['rl_bias']:.2f}")

    def online_learn(self, coin: str, tf_label: str, x_data: np.ndarray, actual_price: float):
        try:
            coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
            scaler_y = assets['scaler_y']; f_names = list(scaler_y.feature_names_in_)
            y_scaled = scaler_y.transform(pd.DataFrame([[actual_price]], columns=f_names))
            assets['model'].train_on_batch(x_data, y_scaled)
        except: pass

    def save_single_model(self, coin: str, tf_label: str, new_mape: float):
        try:
            coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
            assets['best_mape'] = new_mape
            local_path = os.path.join(self.models_dir, f"tmp_{coin}_{tf_label}.keras")
            assets['model'].save(local_path)
            
            if self.supabase:
                ts = datetime.now().strftime('%Y%m%d_%H%M')
                path_latest = f"{coin}/latest/model_{tf_label}.keras"
                path_history = f"{coin}/history/{ts}_{tf_label.upper()}_mape_{new_mape:.2f}.keras"
                with open(local_path, 'rb') as f: binary_data = f.read()
                try: self.supabase.storage.from_('model-brains').remove([path_latest])
                except: pass
                self.supabase.storage.from_('model-brains').upload(path=path_latest, file=binary_data, file_options={"content-type": "application/octet-stream"})
                self.supabase.storage.from_('model-brains').upload(path=path_history, file=binary_data, file_options={"content-type": "application/octet-stream"})
            
            if os.path.exists(local_path): os.remove(local_path)
        except: pass

    def get_consensus_signal(self, coin: str, data_1h: np.ndarray, data_5m: np.ndarray, current_price: float, config: Optional[Dict] = None) -> Dict:
        cfg = config or {"conf_threshold": 0.55, "signal_threshold": 0.3, "use_macro": True}
        p1h, c1h = self.predict_tf(coin, '1h', data_1h, current_price)
        p5m, c5m = self.predict_tf(coin, '5m', data_5m, current_price)
        tr = "BULLISH" if ((p1h - current_price) / current_price) * 100 > 0.3 else "BEARISH" if ((p1h - current_price) / current_price) * 100 < -0.3 else "NEUTRAL"
        ch5 = ((p5m - current_price) / current_price) * 100; sig_threshold = cfg.get("signal_threshold", 0.3)
        sig5 = "BUY" if ch5 > sig_threshold else "SELL" if ch5 < -sig_threshold else "WAIT"
        f_sig = "WAIT"
        if cfg.get("use_macro", True):
            if tr == "BULLISH" and sig5 == "BUY": f_sig = "BUY"
            elif tr == "BEARISH" and sig5 == "SELL": f_sig = "SELL"
        else: f_sig = sig5
        return {"signal": f_sig, "trend_macro": tr, "signal_micro": sig5, "confidence": (c1h + c5m) / 2}
