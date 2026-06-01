import os
import joblib
import numpy as np
import tensorflow as tf
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

        print(f"🧠 [MODEL MANAGER] Loading models for {coin}...")
        
        # Keys: BTC_1H, BTC_5, etc.
        key_1h = self._get_model_key(coin, '1h')
        key_5m = self._get_model_key(coin, '5m')

        try:
            # 1H Model Assets
            m_1h = tf.keras.models.load_model(os.path.join(self.models_dir, f"{key_1h}.keras"))
            s_x_1h = joblib.load(os.path.join(self.models_dir, f"{key_1h}_scaler_x.pkl"))
            s_y_1h = joblib.load(os.path.join(self.models_dir, f"{key_1h}_scaler_y.pkl"))

            # 5M Model Assets
            m_5m = tf.keras.models.load_model(os.path.join(self.models_dir, f"{key_5m}.keras"))
            s_x_5m = joblib.load(os.path.join(self.models_dir, f"{key_5m}_scaler_x.pkl"))
            s_y_5m = joblib.load(os.path.join(self.models_dir, f"{key_5m}_scaler_y.pkl"))

            self.loaded_models[coin] = {
                '1h': {'model': m_1h, 'scaler_x': s_x_1h, 'scaler_y': s_y_1h},
                '5m': {'model': m_5m, 'scaler_x': s_x_5m, 'scaler_y': s_y_5m}
            }
            print(f"✅ Models for {coin} (1H & 5M) loaded successfully.")
        except Exception as e:
            print(f"❌ Failed to load models for {coin}: {e}")
            raise e

    def predict_tf(self, coin: str, tf_label: str, x_input: np.ndarray, current_price: float) -> Tuple[float, float]:
        """
        Returns: (predicted_price, confidence_score)
        """
        coin = coin.upper()
        assets = self.loaded_models[coin][tf_label]
        
        pred_scaled = assets['model'].predict(x_input, verbose=0)[0, 0]
        
        dummy = np.zeros((1, 1))
        dummy[0, 0] = pred_scaled
        pred_price = float(assets['scaler_y'].inverse_transform(dummy)[0, 0])
        
        # Dynamic Confidence (Simplified for Regression):
        # We assume higher percentage change predictions imply stronger conviction.
        # Max confidence capped at 95% to remain realistic. Base confidence is 50%.
        change_pct = abs((pred_price - current_price) / current_price) * 100
        # Formula: Base 50% + (ChangePct * 15), capped at 95%
        confidence = min(0.95, 0.50 + (change_pct * 0.15))
        
        return pred_price, confidence

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
