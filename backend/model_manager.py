import os
import joblib
import numpy as np
import tensorflow as tf
from datetime import datetime
from typing import Dict, Optional, Tuple

class ModelManager:
    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.loaded_models: Dict[str, Dict] = {}
        # Mapping timeframe agar sesuai dengan file di disk (BTC_1h, BTC_5, dll)
        self.tf_map = {'1h': '1h', '5m': '5'}

    def _get_model_key(self, coin: str, tf_label: str) -> str:
        return f"{coin.upper()}_{self.tf_map.get(tf_label, tf_label)}"

    def load_pair(self, coin: str):
        """Load model 1H and 5M for a specific coin if not already loaded"""
        coin = coin.upper()
        if coin in self.loaded_models:
            return

        print(f"🧠 [MODEL MANAGER] Loading knowledge for {coin}...")
        
        # Keys: BTC_1H, BTC_5, etc.
        key_1h = self._get_model_key(coin, '1h')
        key_5m = self._get_model_key(coin, '5m')

        try:
            # 1H Model Assets
            path_1h = os.path.join(self.models_dir, f"{key_1h}.keras")
            m_1h = tf.keras.models.load_model(path_1h)
            s_x_1h = joblib.load(os.path.join(self.models_dir, f"{key_1h}_scaler_x.pkl"))
            s_y_1h = joblib.load(os.path.join(self.models_dir, f"{key_1h}_scaler_y.pkl"))
            time_1h = datetime.fromtimestamp(os.path.getmtime(path_1h)).strftime('%Y-%m-%d %H:%M')

            # 5M Model Assets
            path_5m = os.path.join(self.models_dir, f"{key_5m}.keras")
            m_5m = tf.keras.models.load_model(path_5m)
            s_x_5m = joblib.load(os.path.join(self.models_dir, f"{key_5m}_scaler_x.pkl"))
            s_y_5m = joblib.load(os.path.join(self.models_dir, f"{key_5m}_scaler_y.pkl"))
            time_5m = datetime.fromtimestamp(os.path.getmtime(path_5m)).strftime('%Y-%m-%d %H:%M')

            self.loaded_models[coin] = {
                '1h': {'model': m_1h, 'scaler_x': s_x_1h, 'scaler_y': s_y_1h, 'last_save': time_1h},
                '5m': {'model': m_5m, 'scaler_x': s_x_5m, 'scaler_y': s_y_5m, 'last_save': time_5m}
            }
            print(f"✅ Models {coin} READY. [1H: {time_1h} | 5M: {time_5m}]")
        except Exception as e:
            print(f"❌ Failed to load models for {coin}: {e}")
            raise e

    def save_pair(self, coin: str):
        """Save the current weights in RAM back to disk"""
        coin = coin.upper()
        if coin not in self.loaded_models: return False
        
        try:
            for tf_label in ['1h', '5m']:
                key = self._get_model_key(coin, tf_label)
                path = os.path.join(self.models_dir, f"{key}.keras")
                self.loaded_models[coin][tf_label]['model'].save(path)
                # Update memory timestamp
                self.loaded_models[coin][tf_label]['last_save'] = datetime.now().strftime('%Y-%m-%d %H:%M')
            
            print(f"💾 [DISK] {coin} models updated on disk with new peak accuracy.")
            return True
        except Exception as e:
            print(f"⚠️ Failed to auto-save {coin}: {e}")
            return False

    def predict_tf(self, coin: str, tf_label: str, x_input: np.ndarray, current_price: float) -> Tuple[float, float]:
        """
        High-performance prediction using direct model call (no retracing).
        """
        coin = coin.upper()
        assets = self.loaded_models[coin][tf_label]
        
        # SAKTI: Convert to tensor and call model directly to prevent overhead
        input_tensor = tf.convert_to_tensor(x_input, dtype=tf.float32)
        pred_scaled = assets['model'](input_tensor, training=False).numpy()[0, 0]
        
        dummy = np.zeros((1, 1))
        dummy[0, 0] = pred_scaled
        pred_price = float(assets['scaler_y'].inverse_transform(dummy)[0, 0])
        
        # Dynamic Confidence Formula
        change_pct = abs((pred_price - current_price) / current_price) * 100
        confidence = min(0.95, 0.50 + (change_pct * 0.15))
        
        return pred_price, confidence

    def online_learn(self, coin: str, tf_label: str, x_train: np.ndarray, y_actual: float):
        """
        Lightweight incremental training (Online Learning)
        Updates the model weights based on a single new observation.
        """
        coin = coin.upper()
        assets = self.loaded_models[coin][tf_label]
        
        # Scale actual target price to model's expected range
        dummy = np.zeros((1, 1))
        dummy[0, 0] = y_actual
        y_scaled = assets['scaler_y'].transform(dummy)
        
        # Incremental update (1 epoch, minimal impact to prevent catastrophic forgetting)
        # Using train_on_batch for speed and simplicity in online learning
        loss = assets['model'].train_on_batch(x_train, y_scaled)
        
        # print(f"🧠 [ONLINE LEARNING] {coin} {tf_label} updated. Loss: {loss:.6f}")
        return loss

    def get_consensus_signal(self, coin: str, data_1h: np.ndarray, data_5m: np.ndarray, current_price: float) -> Dict:
        """
        Logic: 1H Trend + 5M Execution
        Returns: { 'signal': 'BUY'|'SELL'|'WAIT', 'confidence': float, 'target': float }
        """
        coin = coin.upper()
        self.load_pair(coin)

        # 1. Predict Macro (1H)
        price_1h, conf_1h = self.predict_tf(coin, '1h', data_1h, current_price)
        change_1h = ((price_1h - current_price) / current_price) * 100
        trend = "BULLISH" if change_1h > 0.3 else "BEARISH" if change_1h < -0.3 else "NEUTRAL"

        # 2. Predict Micro (5M)
        price_5m, conf_5m = self.predict_tf(coin, '5m', data_5m, current_price)
        change_5m = ((price_5m - current_price) / current_price) * 100
        signal_5m = "BUY" if change_5m > 0.5 else "SELL" if change_5m < -0.5 else "WAIT"

        # 3. Consensus Filter
        final_signal = "WAIT"
        combined_conf = (conf_1h + conf_5m) / 2

        if trend == "BULLISH" and signal_5m == "BUY":
            final_signal = "BUY"
        elif trend == "BEARISH" and signal_5m == "SELL":
            final_signal = "SELL"

        return {
            "signal": final_signal,
            "trend_macro": trend,
            "confidence": combined_conf,
            "predict_1h": price_1h,
            "predict_5m": price_5m,
            "change_5m_pct": change_5m
        }
