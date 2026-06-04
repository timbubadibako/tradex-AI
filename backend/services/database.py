from datetime import datetime
from backend.core.config import SUPABASE_URL, SUPABASE_KEY
from backend.core.state import global_state, global_event_log
from supabase import create_client, Client

# Initialize Supabase
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except: pass

def fetch_trades_from_db():
    """Fetch global trade history."""
    if not supabase: return []
    try:
        res = supabase.table("trade_ledger").select("*").order("time", desc=True).limit(50).execute()
        return res.data
    except: return []

def fetch_checkpoints_from_db():
    """Fetch model evolution records."""
    if not supabase: return []
    try:
        res = supabase.table("neural_checkpoints").select("*").order("created_at", desc=True).limit(20).execute()
        return res.data
    except: return []

def push_bot_state(sandboxes):
    """Persist RAM state back to Supabase."""
    if not supabase: return
    try:
        # 1. Update Global Config (Vault, Target, Overrides, Safety, Tuning)
        global_payload = {
            "key": "global_config",
            "data": {
                "vault": global_state["vault_balance_idr"],
                "daily_target": global_state["daily_target_idr"],
                "manual_config": global_state["manual_override_config"],
                "safety_settings": global_state["safety_settings"],
                "trading_params": global_state["trading_params"],
                "rl_config": global_state["rl_config"]
            }
        }
        supabase.table("bot_state").upsert(global_payload, on_conflict="key").execute()

        # 2. Update Asset Specific Sandboxes
        for coin, sb in sandboxes.items():
            asset_payload = {
                "key": f"{coin}_sandbox",
                "data": {
                    "balance_idr": sb.balance_idr,
                    "holdings": sb.btc_holdings
                }
            }
            supabase.table("bot_state").upsert(asset_payload, on_conflict="key").execute()
    except Exception as e:
        print(f"[DB ERROR] State push failed: {e}")

def pull_bot_state(sandboxes):
    """Sync balance and config from Supabase."""
    from backend.core.state import AVAILABLE_ASSETS, asset_states, create_initial_asset_state
    from backend.services.trading import TradingSandbox
    if not supabase: return
    try:
        res = supabase.table("bot_state").select("*").execute()
        for row in res.data:
            key, data = row['key'], row['data']
            if key == 'global_config':
                global_state["vault_balance_idr"] = data.get('vault', global_state["vault_balance_idr"])
                global_state["daily_target_idr"] = data.get('daily_target', global_state["daily_target_idr"])
                
                # SAKTI SYNC: Update all configurations dynamically from the Cloud
                if "manual_config" in data:
                    global_state["manual_override_config"].update(data["manual_config"])
                if "safety_settings" in data:
                    global_state["safety_settings"].update(data["safety_settings"])
                if "trading_params" in data:
                    global_state["trading_params"].update(data["trading_params"])
                if "rl_config" in data:
                    global_state["rl_config"].update(data["rl_config"])
                    
            elif key.endswith('_sandbox'):
                coin = key.split('_')[0]
                # DYNAMIC ASSET DETECTION
                if coin not in AVAILABLE_ASSETS:
                    print(f"[CLOUD] Auto-Detecting new asset colony: {coin}")
                    AVAILABLE_ASSETS.append(coin)
                    asset_states[coin] = create_initial_asset_state()
                    sandboxes[coin] = TradingSandbox(0, global_state['trading_params']['baseline_holdings'])

                sandboxes[coin].balance_idr = data.get('balance_idr', sandboxes[coin].balance_idr)
                sandboxes[coin].btc_holdings = data.get('holdings', sandboxes[coin].btc_holdings)
        print("[CLOUD] Ecosystem state synchronized (Rules & Balances).")
    except: pass

def fetch_predictions_from_db(coin: str, tf_label: str):
    """Restore historical AI lines for charts."""
    if not supabase: return []
    try:
        res = supabase.table("predictions").select("created_at, predicted_price").eq("coin", coin.upper()).eq("timeframe", tf_label).order("created_at", desc=True).limit(100).execute()
        history = []
        for row in reversed(res.data):
            dt = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
            history.append({"timestamp": int(dt.timestamp() * 1000), "price": float(row['predicted_price'])})
        return history
    except: return []

def log_trade_db(trade_data: dict):
    """Permanent sync to trade_ledger."""
    if not supabase: return
    try:
        supabase.table("trade_ledger").insert(trade_data).execute()
    except Exception as e:
        print(f"[DB ERROR] Trade logging failed: {e}")

def log_checkpoint_db(payload: dict):
    """Permanent sync to neural_checkpoints."""
    if not supabase: return
    try:
        supabase.table("neural_checkpoints").insert(payload).execute()
    except: pass
