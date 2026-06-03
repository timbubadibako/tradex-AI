import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime
from typing import Dict, Optional, Tuple, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# FORCE CPU ONLY for Hugging Face
os.environ['CUDA_VISIBLE_DEVICES'] = '-1'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

load_dotenv()

class ModelManager:
    def __init__(self, models_dir: str = "models", event_log: Optional[list] = None):
        self.models_dir = models_dir
        self.event_log = event_log
        self.loaded_models: Dict[str, Dict] = {}
        self.tf_map = {'1h': '1h', '5m': '5'}
        
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        self.supabase: Optional[Client] = None
        if url and key:
            try:
                self.supabase = create_client(url, key)
            except Exception: pass

    def _get_model_key(self, coin: str, tf_label: str) -> str:
        return f"{coin.upper()}_{self.tf_map.get(tf_label, tf_label)}"

    def _download_from_supabase(self, coin: str, tf_label: str, specific_name: Optional[str] = None) -> Optional[str]:
        if not self.supabase: return None
        try:
            coin = coin.upper()
            # Path logic based on request: use history folder if specific name provided
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

        # 1. SCAN CLOUD HISTORY FOR ABSOLUTE BEST RECORD
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
                            if m < best_mape['1h']:
                                best_mape['1h'] = m; best_files['1h'] = fn
                        except: pass
                    elif '_5M_mape_' in fn:
                        try:
                            m = float(fn.split('_mape_')[1].replace('.keras', ''))
                            if m < best_mape['5m']:
                                best_mape['5m'] = m; best_files['5m'] = fn
                        except: pass
            except: pass

        # 2. DOWNLOAD (Priority: Best from History -> Latest Slot)
        path_1h = self._download_from_supabase(coin, '1h', best_files['1h'])
        path_5m = self._download_from_supabase(coin, '5m', best_files['5m'])
        
        if not path_1h: path_1h = self._download_from_supabase(coin, '1h')
        if not path_5m: path_5m = self._download_from_supabase(coin, '5m')
        
        if not path_1h or not path_5m: raise FileNotFoundError(f"Model brains missing for {coin}")

        # 3. RESTORE RL BIAS
        bias_1h, bias_5m = 0.0, 0.0
        if self.supabase:
            try:
                res = self.supabase.table("bot_neural_memory").select("*").eq("coin", coin).execute()
                for row in res.data:
                    if row['timeframe'] == '1h': bias_1h = row['rl_bias']
                    if row['timeframe'] == '5m': bias_5m = row['rl_bias']
            except: pass

        # 4. LOAD INTO TENSORFLOW
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
            print(f"[RESTORATION] {coin} synced via best history brain.")
            return best_mape['1h'], best_mape['5m']
        except Exception as e: raise e

    def push_neural_memory(self, coin: str, tf_label: str):
        if not self.supabase: return
        try:
            coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
            payload = {"coin": coin, "timeframe": tf_label, "rl_bias": float(assets['rl_bias']), "updated_at": datetime.now().isoformat()}
            self.supabase.table("bot_neural_memory").upsert(payload, on_conflict="coin,timeframe").execute()
            print(f"[DB SUCCESS] RL Bias saved for {coin} {tf_label}")
        except Exception as e:
            print(f"[DB ERROR] bot_neural_memory upsert failed: {e}")

    def log_trade(self, trade_data: dict):
        if not self.supabase: return
        try:
            self.supabase.table("trade_ledger").insert(trade_data).execute()
            print(f"[DB SUCCESS] Trade recorded: {trade_data['type']} {trade_data['coin']}")
        except Exception as e:
            print(f"[DB ERROR] trade_ledger insert failed: {e}")

    def log_checkpoint(self, coin: str, tf_label: str, old_m: float, new_m: float):
        if not self.supabase: return
        try:
            payload = {"coin": coin.upper(), "timeframe": tf_label, "old_mape": old_m, "new_mape": new_m, "event_type": "RECORD_BREAK"}
            self.supabase.table("neural_checkpoints").insert(payload).execute()
        except: pass

    def predict_tf(self, coin: str, tf_label: str, x_input: np.ndarray, current_price: float) -> Tuple[float, float]:
        coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
        pred_scaled = assets['model'](tf.convert_to_tensor(x_input, dtype=tf.float32), training=False).numpy()[0, 0]
        f_names = list(assets['scaler_y'].feature_names_in_)
        pred_price = float(assets['scaler_y'].inverse_transform(pd.DataFrame([[pred_scaled]], columns=f_names))[0, 0])
        change_pct = abs((pred_price - current_price) / current_price) * 100
        base_conf = min(0.95, 0.50 + (change_pct * 0.15))
        return pred_price, max(0.1, min(0.99, base_conf + assets['rl_bias']))

    def online_learn(self, coin: str, tf_label: str, x_data: np.ndarray, actual_price: float):
        try:
            coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
            scaler_y = assets['scaler_y']; f_names = list(scaler_y.feature_names_in_)
            y_scaled = scaler_y.transform(pd.DataFrame([[actual_price]], columns=f_names))[0, 0]
            assets['model'].fit(x_data, np.array([[y_scaled]]), epochs=1, verbose=0)
        except: pass

    def _upload_to_supabase(self, coin: str, tf_label: str, local_path: str, mape: float):
        """Standardized remove-then-upload hierarchy."""
        if not self.supabase: return
        try:
            coin = coin.upper()
            ts = datetime.now().strftime('%Y%m%d_%H%M')
            path_latest = f"{coin}/latest/model_{tf_label}.keras"
            path_history = f"{coin}/history/{ts}_{tf_label.upper()}_mape_{mape:.2f}.keras"
            
            with open(local_path, 'rb') as f: binary_data = f.read()
            
            # 1. Force remove old latest
            try: self.supabase.storage.from_('model-brains').remove([path_latest])
            except: pass

            # 2. Upload to latest
            self.supabase.storage.from_('model-brains').upload(
                path=path_latest, file=binary_data, 
                file_options={"content-type": "application/octet-stream"}
            )
            
            # 3. Archive to history
            self.supabase.storage.from_('model-brains').upload(
                path=path_history, file=binary_data, 
                file_options={"content-type": "application/octet-stream"}
            )
            
            # 4. Neural Garbage Collector (Keep 5)
            files = self.supabase.storage.from_('model-brains').list(f"{coin}/history")
            targets = sorted([f for f in files if f"_{tf_label.upper()}_mape_" in f['name']], key=lambda x: x['created_at'], reverse=True)
            if len(targets) > 5:
                self.supabase.storage.from_('model-brains').remove([f"{coin}/history/{f['name']}" for f in targets[5:]])
                
            print(f"[SUPABASE] Successfully committed {coin} {tf_label} brain evolution.")
        except Exception as e:
            print(f"[SUPABASE ERROR] Persistence cycle failed: {e}")

    def save_single_model(self, coin: str, tf_label: str, current_mape: float) -> bool:
        coin = coin.upper()
        if coin not in self.loaded_models: return False
        try:
            # 1. Local Temp Save
            assets = self.loaded_models[coin][tf_label]
            old_m = assets['best_mape']; assets['best_mape'] = current_mape
            local_path = os.path.join(self.models_dir, f"tmp_{coin}_{tf_label}.keras")
            assets['model'].save(local_path)
            
            # 2. Trigger Robust Cloud Sync
            self._upload_to_supabase(coin, tf_label, local_path, current_mape)
            self.log_checkpoint(coin, tf_label, old_m, current_mape)
            
            if os.path.exists(local_path): os.remove(local_path)
            return True
        except Exception as e:
            print(f"[DISK ERROR] {e}"); return False

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
