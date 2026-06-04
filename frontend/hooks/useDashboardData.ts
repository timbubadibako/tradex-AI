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

// SAKTI OPTIMIZATION: Global config for SWR hooks
const swrOptions = {
  revalidateOnFocus: false, // Prevent redundant fetches when switching tabs
  shouldRetryOnError: false
};

export function useBotStatus() {
  // 🚀 LIVE METRICS: 2s for current active node details
  const { data, error, isLoading } = useSWR(
    `${getApiUrl()}/api/status`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 2000 }
  );
  
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
  // 🚀 MAIN ECOSYSTEM SYNC: 5s for global balance and asset nodes
  const { data, error, isLoading } = useSWR(
    `${getApiUrl()}/api/all_status`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 5000 }
  );
  
  const assets = data?.assets;
  const vault = data?.vault;
  const totalNetPnl = data?.total_net_pnl;
  const totalAllocated = data?.total_allocated;
  const dailyTarget = data?.daily_target;
  const manualConfig = data?.manual_config;
  const cashBalance = data?.total_cash;

  return { 
    allStatus: assets || {}, 
    vault, 
    totalNetPnl, 
    totalAllocated,
    dailyTarget,
    manualConfig,
    cashBalance,
    isError: !!error || data === null, 
    isLoading
  };
}

export function useEventLog() {
  // 🚀 TELEMETRY: 10s is sufficient for system logs
  const { data, error, isLoading } = useSWR(
    `${getApiUrl()}/api/events`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 10000 }
  );
  return { events: data || [], isError: error, isLoading };
}

export function useUnifiedTrades() {
  // 🚀 LEDGER SYNC: RAM is 10s, DB (history) is 60s
  const { data: ramTrades } = useSWR(
    `${getApiUrl()}/api/trades`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 10000 }
  );
  const { data: dbTrades } = useSWR(
    `${getApiUrl()}/api/persistent_trades`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 60000 } // Rare refresh for long history
  );

  const ram = Array.isArray(ramTrades) ? ramTrades : [];
  const db = Array.isArray(dbTrades) ? dbTrades : [];

  // Merge and De-duplicate
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

export function useNeuralCheckpoints() {
  // 🚀 EVOLUTION RECORDS: 60s as models don't evolve every second
  const { data, error, isLoading } = useSWR(
    `${getApiUrl()}/api/checkpoints`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 60000 }
  );
  return { checkpoints: data || [], isError: error, isLoading };
}

export function useMarketData() {
  // 🚀 VISUAL CHART: 10s to match candle close cycle focus
  const { data, error, isLoading } = useSWR(
    `${getApiUrl()}/api/chart`, 
    fetcher, 
    { ...swrOptions, refreshInterval: 10000 }
  );
  return { 
    marketData: data?.ohlcv || [], 
    prediction: data?.prediction || null,
    predictionHistory: data?.prediction_history || [],
    isError: error, 
    isLoading 
  };
}
