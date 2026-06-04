import os
import ccxt
import ccxt.async_support as ccxt_async
from dotenv import load_dotenv

load_dotenv()

# EXCHANGE SETUP
exchange = ccxt.indodax()
exchange.timeframes['5m'] = '5'

ex_async = ccxt_async.indodax()
ex_async.timeframes['5m'] = '5'

# DIRECTORIES
# Path relative to this file: config.py is in backend/core/
BASE_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_BACKEND_DIR, 'models')
os.makedirs(MODELS_DIR, exist_ok=True)

# SUPABASE KEYS
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
