import asyncio
import pandas as pd
import numpy as np
from datetime import datetime
from backend.core.state import *
from backend.core.config import ex_async
from backend.services.database import log_trade_db, push_bot_state, fetch_predictions_from_db

async def financial_heartbeat(manager, sandboxes):
    """Daily profit harvesting logic at midnight."""
    last_day = datetime.now().day
    while not stop_event.is_set():
        now = datetime.now()
        if now.day != last_day:
            print("[FINANCE] Midnight detected. Executing profit harvest...")
            for coin, sb in sandboxes.items():
                s = asset_states[coin]
                curr_p = s['quant'].get('current_price', 0)
                if curr_p == 0: continue
                
                # Calculate Net Growth
                current_net_pnl = sb.get_net_pnl_idr(curr_p)
                daily_profit = current_net_pnl - sb.daily_pnl_start
                
                if daily_profit > 100000:
                    harvest = daily_profit - 100000
                    global_state["vault_balance_idr"] += harvest
                    sb.realized_pnl -= harvest
                    print(f"[HARVEST] {coin}: Rp {harvest:,} moved to Vault.")
                
                sb.daily_pnl_start = sb.get_net_pnl_idr(curr_p)
            
            push_bot_state(sandboxes)
            last_day = now.day
            
        await asyncio.sleep(60)

async def ticker_loop(manager, sandboxes):
    """Real-time market monitoring and trade execution."""
    while not stop_event.is_set():
        try:
            for c in AVAILABLE_ASSETS:
                ticker = await ex_async.fetch_ticker(f"{c}/IDR")
                curr_p = float(ticker['last'])
                
                # Order Book Analysis
                ob = await ex_async.fetch_order_book(f"{c}/IDR", limit=20)
                mid = (ob['bids'][0][0] + ob['asks'][0][0]) / 2
                w_b = sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in ob['bids']])
                w_a = sum([v * np.exp(-50 * abs(p - mid) / mid) for p, v in ob['asks']])
                obi_val = (w_b - w_a) / (w_b + w_a)
                
                asset_states[c]['quant']['current_price'] = curr_p
                asset_states[c]['quant']['obi'] = (obi_val * 0.2) + (asset_states[c]['quant']['obi'] * 0.8)
                
                # Decision Logic
                res = asset_states[c]['consensus']
                sb = sandboxes[c]
                if not global_state["safety_settings"]['emergency_stop']:
                    conf = float(res.get('confidence', 0))
                    thr = global_state["manual_override_config"]['conf_threshold']
                    obi_thr = global_state["safety_settings"].get("obi_threshold", 0.03)
                    base_lot = global_state["trading_params"].get("base_lot_size", 0.0005)
                    
                    if conf > thr:
                        if res.get('signal') == 'BUY' and asset_states[c]['quant']['obi'] > obi_thr:
                            if sb.active_position == 'SHORT': 
                                trade = sb.close_short(c, curr_p)
                                if trade: manager.update_rl_bias(c, trade['pnl'], global_state["rl_config"])
                            
                            trade = sb.open_long(c, curr_p, base_lot)
                            if trade: 
                                log_trade_db(trade)
                                push_bot_state(sandboxes)
                        elif res.get('signal') == 'SELL' and asset_states[c]['quant']['obi'] < -obi_thr:
                            if sb.active_position == 'LONG': 
                                trade = sb.close_long(c, curr_p)
                                if trade: manager.update_rl_bias(c, trade['pnl'], global_state["rl_config"])
                                
                            trade = sb.open_short(c, curr_p, base_lot)
                            if trade: 
                                log_trade_db(trade)
                                push_bot_state(sandboxes)
                
                await asyncio.sleep(1) 
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[TICKER ERROR] {e}")
            await asyncio.sleep(5)

async def bot_thinker(manager, sandboxes):
    """Deep learning with Neural Healing."""
    from ta.momentum import RSIIndicator
    from ta.trend import MACD
    from ta.volatility import AverageTrueRange, BollingerBands
    from ta.volume import OnBalanceVolumeIndicator

    while not stop_event.is_set():
        try:
            btc_1h_raw = await ex_async.fetch_ohlcv('BTC/IDR', '1h', limit=100)
            btc_5m_raw = await ex_async.fetch_ohlcv('BTC/IDR', '5m', limit=100)
            
            def process_df(ohlcv, btc_df=None):
                df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
                df['rsi'] = RSIIndicator(close=df['close']).rsi()
                df['atr'] = AverageTrueRange(high=df['high'], low=df['low'], close=df['close']).average_true_range()
                df['vol_sma9'] = df['volume'].rolling(window=9).mean()
                macd_ind = MACD(close=df['close']); df['macd'] = macd_ind.macd()
                bb_ind = BollingerBands(close=df['close']); df['bb_h'] = bb_ind.bollinger_hband(); df['bb_l'] = bb_ind.bollinger_lband()
                df['obv'] = OnBalanceVolumeIndicator(close=df['close'], volume=df['volume']).on_balance_volume()
                if btc_df is not None:
                    temp_btc = btc_df.set_index('timestamp')
                    df = df.set_index('timestamp').join(temp_btc[['close', 'volume']], rsuffix='_BTC').reset_index()
                    df.rename(columns={'close_BTC': 'btc_close', 'volume_BTC': 'btc_volume'}, inplace=True)
                return df.bfill().ffill().fillna(0)

            btc_1h = process_df(btc_1h_raw)
            btc_5m = process_df(btc_5m_raw)

            for coin in AVAILABLE_ASSETS:
                asset_states[coin]['active_pulse'] = "Neural Sync..."
                o1_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '1h', limit=100)
                o5_raw = await ex_async.fetch_ohlcv(f"{coin}/IDR", '5m', limit=100)
                
                raw_df1 = process_df(o1_raw, btc_1h if coin != 'BTC' else None)
                raw_df5 = process_df(o5_raw, btc_5m if coin != 'BTC' else None)

                # --- NEURAL HEALING ---
                df1 = manager.bridge_data_gap(coin, '1h', raw_df1, expected_len=100)
                df5 = manager.bridge_data_gap(coin, '5m', raw_df5, expected_len=100)

                asset_states[coin]['market_data_1h'] = df1.to_dict('records')
                asset_states[coin]['market_data_5m'] = df5.to_dict('records')

                # --- PREDICTION HEALING ---
                db_p1h = fetch_predictions_from_db(coin, '1h')
                db_p5m = fetch_predictions_from_db(coin, '5m')
                
                healed_p1h = manager.heal_prediction_history(coin, '1h', df1, db_p1h)
                healed_p5m = manager.heal_prediction_history(coin, '5m', df5, db_p5m)
                
                asset_states[coin]['prediction_history_1h'] = healed_p1h
                asset_states[coin]['prediction_history_5m'] = healed_p5m

                mm = manager.loaded_models[coin]
                
                def calc_mape(ohlcv, healed):
                    act = ohlcv['close'].values
                    pre = np.array([p['price'] for p in healed])
                    if len(act) == len(pre) and len(act) > 0:
                        return np.mean(np.abs((act - pre) / act)) * 100
                    return 1.5

                asset_states[coin]['bot_status']['error_rate_1h'] = calc_mape(df1, healed_p1h)
                asset_states[coin]['bot_status']['error_rate_5m'] = calc_mape(df5, healed_p5m)

                def get_inp(df, k):
                    req = list(mm[k]['scaler_x'].feature_names_in_)
                    c = df.tail(60).copy()
                    for f in req:
                        if f == 'bb_high' and 'bb_high' not in c.columns: c['bb_high'] = c.get('bb_h', c['close'])
                        if f == 'bb_low' and 'bb_low' not in c.columns: c['bb_low'] = c.get('bb_l', c['close'])
                    return mm[k]['scaler_x'].transform(c[req]).reshape(1, 60, -1)

                curr_p = float(df5.iloc[-1]['close'])
                s = asset_states[coin]
                
                in1 = get_inp(df1, '1h'); in5 = get_inp(df5, '5m')
                s['consensus'] = manager.get_consensus_signal(coin, in1, in5, curr_p, global_state["manual_override_config"])
                
                p1, c1 = manager.predict_tf(coin, '1h', in1, curr_p)
                p5, c5 = manager.predict_tf(coin, '5m', in5, curr_p)
                s['prediction_1h'] = {"price": p1, "confidence": c1}
                s['prediction_5m'] = {"price": p5, "confidence": c5}

                asset_states[coin]['active_pulse'] = "Operational"
            
            await asyncio.sleep(15)
        except Exception as e:
            print(f"[THINKER ERROR] {e}")
            await asyncio.sleep(10)
