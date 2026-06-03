import useSWR from 'swr';
import { getApiUrl } from '@/lib/constants';

// SAKTI NULL-SAFE FETCHER
const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`Fetch error for ${url}:`, e);
    return null;
  }
};

export function useBotStatus() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/status`, fetcher, { refreshInterval: 5000 });
  return { 
    status: data || { 
      coin: 'BTC', 
      tf: '1h', 
      balance_idr: 0, 
      btc_holdings: 0.5, 
      prediction: { price: 0, confidence: 0 },
      net_pnl: 0,
      winrate: 0,
      error_rate: 0
    }, 
    isError: error, 
    isLoading 
  };
}

export function useAllAssetsStatus() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/all_status`, fetcher, { refreshInterval: 5000 });
  
  const assets = data?.assets || {};
  const vault = data?.vault || 0;
  const totalNetPnl = data?.total_net_pnl || 0;
  const dailyTarget = data?.daily_target || 150000;
  const manualConfig = data?.manual_config || null;
  const cashBalance = data?.total_cash || Object.values(assets)[0]?.balance_idr || 0;

  return { 
    allStatus: assets, 
    vault, 
    totalNetPnl, 
    dailyTarget,
    manualConfig,
    cashBalance,
    isError: error, 
    isLoading
  };
}

export function useEventLog() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/events`, fetcher, { refreshInterval: 10000 });
  return { events: data || [], isError: error, isLoading };
}

// SAKTI HYBRID LEDGER: Merges RAM trades and Supabase trades
export function useUnifiedTrades() {
  const { data: ramTrades } = useSWR(`${getApiUrl()}/api/trades`, fetcher, { refreshInterval: 5000 });
  const { data: dbTrades } = useSWR(`${getApiUrl()}/api/persistent_trades`, fetcher, { refreshInterval: 15000 });

  const ram = Array.isArray(ramTrades) ? ramTrades : [];
  const db = Array.isArray(dbTrades) ? dbTrades : [];

  // Merge and De-duplicate (using time/timestamp as key)
  const combined = [...ram];
  db.forEach(dt => {
    const exists = combined.some(rt => rt.time === dt.time && rt.coin === dt.coin);
    if (!exists) combined.push(dt);
  });

  return { 
    trades: combined.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()),
    isLoading: !ramTrades && !dbTrades
  };
}

// SAKTI PERSISTENCE: Hook to fetch neural evolution milestones
export function useNeuralCheckpoints() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/checkpoints`, fetcher, { refreshInterval: 30000 });
  return { checkpoints: data || [], isError: error, isLoading };
}

export function useMarketData() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/chart`, fetcher, { refreshInterval: 10000 });
  return { 
    marketData: data?.ohlcv || [], 
    prediction: data?.prediction || null,
    predictionHistory: data?.prediction_history || [],
    isError: error, 
    isLoading 
  };
}
