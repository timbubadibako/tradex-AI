import os
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv

# Memuat environment variables dari file .env
load_dotenv()

def fetch_btc_5m_predictions(limit: int = 100):
    # Inisialisasi kredensial Supabase
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("Error: Kredensial SUPABASE_URL atau SUPABASE_KEY tidak ditemukan di .env")
        return []

    try:
        # Membuat client Supabase
        supabase: Client = create_client(url, key)
        print("Connected to Supabase Database.")
        print("Fetching BTC 5m prediction ledger data...")

        # Eksekusi query ke tabel predictions
        res = supabase.table("predictions") \
            .select("created_at, current_price, predicted_price, confidence, signal, macro_trend") \
            .eq("coin", "BTC") \
            .eq("timeframe", "5m") \
            .order("created_at", desc=True) \
            .limit(limit) \
            .execute()

        if not res.data:
            print("No prediction records found for BTC 5m.")
            return []

        history = []
        print(f"\n--- SUCCESS: Restored {len(res.data)} Records (Latest First) ---\n")
        
        for row in res.data:
            # Parsing string ISO format timestamp dari database
            dt = datetime.fromisoformat(row['created_at'].replace('Z', '+00:00'))
            ts_ms = int(dt.timestamp() * 1000)

            # SAKTI FIX: Pembulatan ke interval 5 menit (300.000 ms) agar bersih dari noise detik NOW()
            interval = 300000
            rounded_ts = round(ts_ms / interval) * interval
            readable_time = datetime.fromtimestamp(rounded_ts / 1000).strftime('%Y-%m-%d %H:%M:%S')

            record = {
                "raw_timestamp": ts_ms,
                "rounded_timestamp": rounded_ts,
                "readable_time": readable_time,
                "current_price": float(row['current_price']),
                "predicted_price": float(row['predicted_price']),
                "confidence": float(row['confidence']),
                "signal": row['signal'],
                "macro_trend": row['macro_trend']
            }
            history.append(record)

            # Print output log langsung ke konsol biar gampang dipantau
            print(f"[{readable_time}] Price: {record['current_price']:,.0f} -> Pred: {record['predicted_price']:,.0f} | Signal: {record['signal']} ({record['confidence']*100:.1f}%)")

        return history

    except Exception as e:
        print(f"Critical Error: Gagal menarik data dari database: {e}")
        return []

if __name__ == "__main__":
    # Menarik 100 data prediksi terakhir koin BTC 5m
    predictions = fetch_btc_5m_predictions(limit=100)