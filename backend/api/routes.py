from fastapi import APIRouter, Query
from backend.core.state import *
from backend.services.database import fetch_predictions_from_db, fetch_trades_from_db, fetch_checkpoints_from_db

router = APIRouter()

# Global context references
_manager = None
_sandboxes = {}

def init_api(manager, sandboxes):
    global _manager, _sandboxes
    _manager = manager
    _sandboxes = sandboxes

@router.get("/api/all_status")
async def get_all():
    """Unified High-Performance Endpoint for all assets and global stats."""
    data = {}; total_rel = 0; total_allocated = 0
    for c in AVAILABLE_ASSETS:
        sb = _sandboxes.get(c)
        s = asset_states[c]
        if not sb: continue
        
        curr_p = s['quant'].get('current_price', 0)
        rel = sb.get_net_pnl_idr(curr_p) - sb.daily_pnl_start
        total_rel += rel
        
        alloc = (sb.active_lot * sb.entry_price) if sb.active_position else 0
        total_allocated += alloc
        
        p1 = s['prediction_1h'].get('price', 0)
        p5 = s['prediction_5m'].get('price', 0)
        
        # UNIFIED ASSET PAYLOAD: Sesuai rekomendasi optimasi lo!
        data[c] = {
            "mape_1h": s['bot_status']['error_rate_1h'], 
            "mape_5m": s['bot_status']['error_rate_5m'], 
            "net_pnl": sb.get_net_pnl_idr(curr_p), 
            "btc_holdings": sb.btc_holdings, 
            "balance_idr": sb.balance_idr, 
            "allocated_idr": alloc,
            "obi": s['quant']['obi'], 
            "active_pulse": s['active_pulse'], 
            "rl_score": s['rl_reward'],
            "last_training": s['last_training'],
            "current_price": curr_p, 
            "pred_price_1h": p1, 
            "pred_price_5m": p5,
            # Suntikan Data Prediction (Biar ga usah manggil /api/status lagi)
            "prediction": {
                "price": p1 if CURRENT_TF == '1h' else p5,
                "confidence": s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m'].get('confidence', 0),
                "macro": s['consensus']['trend_macro'],
                "micro": s['consensus']['signal_micro'],
                "signal": s['consensus']['signal']
            }
        }
        
    return {
        "assets": data, 
        "vault": global_state["vault_balance_idr"], 
        "daily_target": global_state["daily_target_idr"], 
        "total_net_pnl": total_rel, 
        "total_cash": sum([sb.balance_idr for sb in _sandboxes.values()]),
        "total_allocated": total_allocated,
        "manual_config": global_state["manual_override_config"]
    }

@router.get("/api/status")
async def get_st():
    """Legacy/Detail endpoint for backward compatibility or deep asset view."""
    s = asset_states[CURRENT_COIN]
    sb = _sandboxes.get(CURRENT_COIN)
    p_obj = s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']
    return {
        "coin": CURRENT_COIN, "tf": CURRENT_TF, 
        "balance_idr": sb.balance_idr if sb else 0, 
        "btc_holdings": sb.btc_holdings if sb else 0.5, 
        "error_rate": s['bot_status'].get('error_rate_1h' if CURRENT_TF == '1h' else 'error_rate_5m', 0), 
        "obi": s['quant']['obi'], 
        "prediction": {**p_obj, "macro": s['consensus']['trend_macro'], "micro": s['consensus']['signal_micro'], "signal": s['consensus']['signal']},
        "net_pnl": sb.realized_pnl if sb else 0,
        "winrate": s['bot_status']['winrate']
    }

@router.get("/api/chart")
async def get_ch():
    s = asset_states[CURRENT_COIN]
    ohlcv = s['market_data_1h'] if CURRENT_TF == '1h' else s['market_data_5m']
    p_obj = s['prediction_1h' if CURRENT_TF == '1h' else 'prediction_5m']
    h = s['prediction_history_1h' if CURRENT_TF == '1h' else 'prediction_history_5m']
    return {"ohlcv": ohlcv, "prediction": p_obj, "prediction_history": h}

@router.get("/api/events")
async def get_ev(): 
    # Read from RAM global_event_log (Highly Optimized) - LIMIT 5
    return global_event_log[-5:]

@router.get("/api/trades")
async def get_trades():
    return asset_states[CURRENT_COIN]['trade_history']

@router.get("/api/persistent_trades")
async def get_p_trades():
    return fetch_trades_from_db()

@router.get("/api/checkpoints")
async def get_cp():
    # LIMIT 5 for UI Evolution Feed
    return fetch_checkpoints_from_db()[:5]

@router.get("/api/safety")
async def get_safety():
    return global_state["safety_settings"]

# --- COMMANDS (POST) ---

@router.post("/api/set_coin")
async def set_c(coin: str): 
    global CURRENT_COIN
    CURRENT_COIN = coin.upper()
    return {"status": "success"}

@router.post("/api/set_timeframe")
async def set_t(tf: str): 
    global CURRENT_TF
    CURRENT_TF = tf
    return {"status": "success"}

@router.post("/api/update_manual_config")
async def update_cfg(active: bool, conf: float, sig: float, macro: bool):
    global_state["manual_override_config"].update({"active": active, "conf_threshold": conf, "signal_threshold": sig, "use_macro": macro})
    return {"status": "success"}

@router.post("/api/update_daily_target")
async def update_target(target: float):
    global_state["daily_target_idr"] = target
    return {"status": "success"}

@router.post("/api/update_safety")
async def update_safe(sl: float, tp: float):
    global_state["safety_settings"].update({"sl_atr_mult": sl, "tp_atr_mult": tp})
    return {"status": "success"}

@router.post("/api/panic_sell")
async def panic():
    global_state["safety_settings"]["emergency_stop"] = True
    return {"status": "success"}

@router.post("/api/manual_buy")
async def m_buy():
    return {"status": "success"}

@router.post("/api/manual_sell")
async def m_sell():
    return {"status": "success"}
