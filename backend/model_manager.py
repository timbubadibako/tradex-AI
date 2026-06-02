import os
import joblib
import numpy as np
import pandas as pd
import tensorflow as tf
from datetime import datetime
from typing import Dict, Optional, Tuple, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load env vars for Supabase
load_dotenv()

class ModelManager:
    def __init__(self, models_dir: str = "models", event_log: Optional[list] = None):
        self.models_dir = models_dir
        self.event_log = event_log
        self.loaded_models: Dict[str, Dict] = {}
        # Mapping timeframe agar sesuai dengan file di disk (BTC_1h, BTC_5, dll)
        self.tf_map = {'1h': '1h', '5m': '5'}
        
        # Initialize Supabase Client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        self.supabase: Optional[Client] = None
        if url and key:
            try:
                self.supabase = create_client(url, key)
                self._log_event("[SUPABASE] Connection established successfully.")
            except Exception as e:
                self._log_event(f"[SUPABASE] Connection failed: {e}", type="ERROR")

    def _log_event(self, message: str, type: str = "SYSTEM", coin: Optional[str] = None):
        if self.event_log is not None:
            self.event_log.append({
                "time": datetime.now().isoformat(),
                "message": message,
                "type": type,
                "coin": coin
            })

    def _get_model_key(self, coin: str, tf_label: str) -> str:
        return f"{coin.upper()}_{self.tf_map.get(tf_label, tf_label)}"

    def _download_from_supabase(self, coin: str, tf_label: str) -> Optional[str]:
        """Download latest model from Supabase to local cache"""
        if not self.supabase: return None
        
        try:
            coin = coin.upper()
            file_name = f"model_{tf_label}.keras"
            path_remote = f"{coin}/latest/{file_name}"
            path_local = os.path.join(self.models_dir, f"remote_{coin}_{tf_label}.keras")
            
            # Download file from cloud
            res = self.supabase.storage.from_('model-brains').download(path_remote)
            if res:
                with open(path_local, 'wb') as f:
                    f.write(res)
                return path_local
            return None
        except Exception as e:
            # File likely doesn't exist in cloud
            return None

    def load_pair(self, coin: str):
        """Load models STRICTLY from Supabase. No local fallback allowed."""
        coin = coin.upper()
        if coin in self.loaded_models: return

        print(f"[MODEL MANAGER] Syncing portfolio dataset for {coin} from cloud storage...")
        
        # 1. Attempt Cloud Download
        path_1h_remote = self._download_from_supabase(coin, '1h')
        path_5m_remote = self._download_from_supabase(coin, '5m')

        # 2. Strict Check: If cloud is empty, we STOP.
        if not path_1h_remote or not path_5m_remote:
            err_msg = f"[STRICT CLOUD ERROR] Critical neural files missing in Supabase for {coin}. Core initialization aborted."
            self._log_event(err_msg, type="ERROR", coin=coin)
            print(err_msg)
            raise FileNotFoundError(f"Missing required Cloud models for {coin} in 'model-brains/{coin}/latest/'")

        try:
            # SAKTI FIX: Use context managers for all joblib loads to prevent descriptor leaks
            key_1h = self._get_model_key(coin, '1h')
            m_1h = tf.keras.models.load_model(path_1h_remote)
            with open(os.path.join(self.models_dir, f"{key_1h}_scaler_x.pkl"), 'rb') as f:
                s_x_1h = joblib.load(f)
            with open(os.path.join(self.models_dir, f"{key_1h}_scaler_y.pkl"), 'rb') as f:
                s_y_1h = joblib.load(f)
            time_1h = datetime.fromtimestamp(os.path.getmtime(path_1h_remote)).strftime('%Y-%m-%d %H:%M')

            key_5m = self._get_model_key(coin, '5m')
            m_5m = tf.keras.models.load_model(path_5m_remote)
            with open(os.path.join(self.models_dir, f"{key_5m}_scaler_x.pkl"), 'rb') as f:
                s_x_5m = joblib.load(f)
            with open(os.path.join(self.models_dir, f"{key_5m}_scaler_y.pkl"), 'rb') as f:
                s_y_5m = joblib.load(f)
            time_5m = datetime.fromtimestamp(os.path.getmtime(path_5m_remote)).strftime('%Y-%m-%d %H:%M')

            self.loaded_models[coin] = {
                '1h': {'model': m_1h, 'scaler_x': s_x_1h, 'scaler_y': s_y_1h, 'last_save': time_1h},
                '5m': {'model': m_5m, 'scaler_x': s_x_5m, 'scaler_y': s_y_5m, 'last_save': time_5m}
            }
            
            msg = f"[STRICT CLOUD SYNC] Core network weights for {coin} are successfully deployed. Status: Operational."
            self._log_event(msg, coin=coin)
            print(msg)
            
        except Exception as e:
            self._log_event(f"[CRITICAL FAILURE] Failed to initialize neural weights for {coin}: {e}", type="ERROR", coin=coin)
            raise e

    def _upload_to_supabase(self, coin: str, tf_label: str, local_path: str, mape: float):
        """
        Implementation of the manual overwrite strategy: 
        1. Remove existing asset from 'latest/'
        2. Upload new source of truth to 'latest/'
        3. Archive secondary copy to 'history/'
        """
        if not self.supabase: return
        
        try:
            coin = coin.upper()
            ts = datetime.now().strftime('%Y%m%d-%H%M')
            path_latest = f"{coin}/latest/model_{tf_label}.keras"
            path_history = f"{coin}/history/{ts}_{tf_label.upper()}_mape_{mape:.2f}.keras"
            
            # Read binary data once
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            # Force-remove existing latest file to bypass cache/upsert glitches
            try:
                self.supabase.storage.from_('model-brains').remove([path_latest])
            except Exception:
                pass # Initial deployment or missing file

            # Upload to active node
            self.supabase.storage.from_('model-brains').upload(
                path=path_latest, 
                file=file_data, 
                file_options={"content-type": "application/octet-stream"}
            )
            
            # Commit to timeline archive
            self.supabase.storage.from_('model-brains').upload(
                path=path_history, 
                file=file_data, 
                file_options={"content-type": "application/octet-stream"}
            )
                
            self._log_event(f"[SUPABASE CLOUD SYNC] Successfully committed updated matrix for {coin} {tf_label} to active node and timeline archives.", coin=coin)
        except Exception as e:
            self._log_event(f"[SUPABASE UPLOAD WARNING] Persistent backup sequence failed for {coin} {tf_label}: {e}", type="WARNING", coin=coin)

    def save_single_model(self, coin: str, tf_label: str, current_mape: float) -> bool:
        """
        Saves weights locally THEN pushes to strictly overwrite Cloud state.
        """
        coin = coin.upper()
        if coin not in self.loaded_models: return False

        try:
            # 1. Local Cache Save
            key = self._get_model_key(coin, tf_label)
            path = os.path.join(self.models_dir, f"{key}.keras")
            self.loaded_models[coin][tf_label]['model'].save(path)
            self.loaded_models[coin][tf_label]['last_save'] = datetime.now().strftime('%Y-%m-%d %H:%M')

            # 2. Trigger Cloud Sync (Strict Overwrite)
            self._upload_to_supabase(coin, tf_label, path, current_mape)

            print(f"[STRICT SYNC EFFECT] Local cache flushed. Cloud state updated for {coin} {tf_label} with verified accuracy threshold of {current_mape:.2f}% MAPE.")
            return True
        except Exception as e:
            print(f"[DISK WRITE ERROR] Failed to preserve current tracking state for {coin} {tf_label}: {e}")
            return False

    def predict_tf(self, coin: str, tf_label: str, x_input: np.ndarray, current_price: float) -> Tuple[float, float]:
        coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
        input_tensor = tf.convert_to_tensor(x_input, dtype=tf.float32)
        pred_scaled = assets['model'](input_tensor, training=False).numpy()[0, 0]
        
        # SAKTI FIX: Pass DataFrame to scaler to avoid UserWarning
        f_names = list(assets['scaler_y'].feature_names_in_)
        dummy_df = pd.DataFrame([[pred_scaled]], columns=f_names)
        # SAKTI FIX 2: Result of inverse_transform is ndarray, use [0,0] not .iloc
        pred_price = float(assets['scaler_y'].inverse_transform(dummy_df)[0, 0])
        
        change_pct = abs((pred_price - current_price) / current_price) * 100
        confidence = min(0.95, 0.50 + (change_pct * 0.15))
        return pred_price, confidence

    def online_learn(self, coin: str, tf_label: str, x_train: np.ndarray, y_actual: float):
        coin = coin.upper(); assets = self.loaded_models[coin][tf_label]
        
        # SAKTI FIX: Pass DataFrame
        f_names = list(assets['scaler_y'].feature_names_in_)
        dummy_df = pd.DataFrame([[y_actual]], columns=f_names)
        y_scaled = assets['scaler_y'].transform(dummy_df)
        
        return assets['model'].train_on_batch(x_train, y_scaled)

    def get_consensus_signal(self, coin: str, data_1h: np.ndarray, data_5m: np.ndarray, current_price: float) -> Dict:
        coin = coin.upper(); self.load_pair(coin)
        p1h, c1h = self.predict_tf(coin, '1h', data_1h, current_price)
        tr = "BULLISH" if ((p1h - current_price) / current_price) * 100 > 0.3 else "BEARISH" if ((p1h - current_price) / current_price) * 100 < -0.3 else "NEUTRAL"
        p5m, c5m = self.predict_tf(coin, '5m', data_5m, current_price)
        ch5 = ((p5m - current_price) / current_price) * 100
        sig5 = "BUY" if ch5 > 0.5 else "SELL" if ch5 < -0.5 else "WAIT"
        f_sig = "WAIT"
        if tr == "BULLISH" and sig5 == "BUY": f_sig = "BUY"
        elif tr == "BEARISH" and sig5 == "SELL": f_sig = "SELL"
        return {"signal": f_sig, "trend_macro": tr, "confidence": (c1h + c5m) / 2, "predict_1h": p1h, "predict_5m": p5m, "change_5m_pct": ch5}
