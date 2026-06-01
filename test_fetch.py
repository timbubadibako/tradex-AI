import ccxt
import pandas as pd
from datetime import datetime

exchange = ccxt.indodax()
symbol = 'BTC/IDR'
timeframe = '1h'
# 5 years ago
since = exchange.milliseconds() - (5 * 365 * 24 * 60 * 60 * 1000)

print(f"Testing fetch from: {datetime.fromtimestamp(since/1000)}")
ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=since, limit=10)
if ohlcv:
    print(f"First candle received: {datetime.fromtimestamp(ohlcv[0][0]/1000)}")
    print(f"Last candle received: {datetime.fromtimestamp(ohlcv[-1][0]/1000)}")
else:
    print("No data received.")
