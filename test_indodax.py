import ccxt
import pandas as pd

try:
    exchange = ccxt.indodax()
    print("Testing Indodax API...")
    ohlcv = exchange.fetch_ohlcv('BTC/IDR', '1h', limit=10)
    print(f"Successfully fetched {len(ohlcv)} candles.")
    print(pd.DataFrame(ohlcv, columns=['t', 'o', 'h', 'l', 'c', 'v']).head())
except Exception as e:
    print(f"Error fetching Indodax: {e}")
