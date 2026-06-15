import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getApiUrl, getWsUrl } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Global State
let globalState = {
  status: null,
  allStatus: {},
  events: [],
  trades: [],
};

// WebSocket DISABLED for HF compatibility
function initWs() { return; }

export function useBotStatus() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/status`, fetcher, { refreshInterval: 5000 });
  return { status: data, isError: error, isLoading };
}

export function useAllAssetsStatus() {
  const { data, error, isLoading } = useSWR(`${getApiUrl()}/api/all_status`, fetcher, { refreshInterval: 5000 });
  
  const assets = (data?.assets || {}) as Record<string, any>;
  const vault = data?.vault || 0;
  const totalNetPnl = data?.total_net_pnl || 0;
  const dailyTarget = data?.daily_target || 150000;
  const manualConfig = data?.manual_config || null;
  const assetValues = Object.values(assets);
  const cashBalance = assetValues.length > 0 ? (assetValues[0] as any)?.balance_idr || 500000 : 500000;

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
  // Chart is still polled slowly because it's heavy and doesn't need millisecond ticks
  const { data, error, isLoading, mutate } = useSWR(`${getApiUrl()}/api/chart`, fetcher, { refreshInterval: 10000 });
  return { 
    marketData: data?.ohlcv || [], 
    prediction: data?.prediction || null,
    predictionHistory: data?.prediction_history || [],
    isError: error, 
    isLoading 
  };
}