import ccxt
import time
from datetime import datetime

exchange = ccxt.indodax()
symbol = 'BTC/IDR'
timeframe = '1h'
since = exchange.milliseconds() - (5 * 365 * 24 * 60 * 60 * 1000)

all_data = []
current_since = since

for i in range(2):
    print(f"Batch {i+1} from: {datetime.fromtimestamp(current_since/1000)}")
    ohlcv = exchange.fetch_ohlcv(symbol, timeframe, since=current_since, limit=1000)
    if not ohlcv:
        print("No more data.")
        break
    all_data.extend(ohlcv)
    print(f"Received {len(ohlcv)} points. Last: {datetime.fromtimestamp(ohlcv[-1][0]/1000)}")
    current_since = ohlcv[-1][0] + 1
    time.sleep(1)

print(f"Total: {len(all_data)}")
