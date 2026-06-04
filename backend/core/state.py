import asyncio
from datetime import datetime

# DEFAULT ASSET LIST (Can be expanded by Supabase)
AVAILABLE_ASSETS = ['BTC', 'ETH', 'SOL'] 
CURRENT_COIN = 'BTC'
CURRENT_TF = '1h'

# GLOBAL EVENT LOG (For Evolution Feed)
global_event_log = []

def create_initial_asset_state():
    return {
        "market_data_1h": [], "market_data_5m": [], "trade_history": [],
        "prediction_history_1h": [], "prediction_history_5m": [],
        "bot_status": {
            "winrate": 0, "profit_pct": 0, 
            "error_rate_1h": 0.0, "error_rate_5m": 0.0, 
            "best_error_rate_1h": 100.0, "best_error_rate_5m": 100.0
        },
        "prediction_1h": {"price": 0, "confidence": 0}, 
        "prediction_5m": {"price": 0, "confidence": 0},
        "consensus": {"signal": "WAIT", "trend_macro": "NEUTRAL", "signal_micro": "WAIT", "confidence": 0},
        "quant": {"obi": 0.0, "atr": 0.0, "current_price": 0.0},
        "active_pulse": "Standby", "last_training": "Never",
        "last_ts_1h": 0, "last_ts_5m": 0,
        "last_input_1h": None, "last_input_5m": None,
        "rl_reward": 0.0
    }

# RAM STORAGE FOR ALL ASSETS
asset_states = {coin: create_initial_asset_state() for coin in AVAILABLE_ASSETS}

# SHARED GLOBAL STATE (Total Cloud Control)
global_state = {
    "vault_balance_idr": 0.0,
    "daily_target_idr": 150000.0,
    "manual_override_config": {
        "active": False, "conf_threshold": 0.55, "signal_threshold": 0.3, "use_macro": True
    },
    "safety_settings": {
        "sl_atr_mult": 1.5, "tp_atr_mult": 2.5, "emergency_stop": False,
        "obi_threshold": 0.03 # Dynamic OBI sensitivity
    },
    "trading_params": {
        "trading_fee": 0.001,
        "base_lot_size": 0.0005,
        "baseline_holdings": 0.5
    },
    "rl_config": {
        "bias_cap_positive": 0.15,
        "bias_cap_negative": -0.20,
        "increment_win": 0.05,
        "increment_loss": 0.07
    }
}

# APP SETTINGS
stop_event = asyncio.Event()

# FALLBACK CONFIG (Reset to 0, actual truth pulled from Supabase)
INITIAL_BALANCE_IDR = 0; INITIAL_BALANCE_BTC = 0.5
