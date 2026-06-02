import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
const API_BASE = 'http://localhost:8000/api';

export function useBotStatus() {
  const { data, error, isLoading } = useSWR(`${API_BASE}/status`, fetcher, {
    refreshInterval: 5000,
  });

  return {
    status: data,
    isLoading,
    isError: error
  };
}

export function useAllAssetsStatus() {
    const { data, error, isLoading } = useSWR(`${API_BASE}/all_status`, fetcher, {
      refreshInterval: 5000,
    });
  
    return {
      allStatus: data || {},
      isLoading,
      isError: error
    };
  }

export function useEventLog() {
    const { data, error, isLoading } = useSWR(`${API_BASE}/events`, fetcher, {
      refreshInterval: 5000,
    });
  
    return {
      events: data || [],
      isLoading,
      isError: error
    };
  }

export function useMarketData() {
  const { data, error, isLoading } = useSWR(`${API_BASE}/chart`, fetcher, {
    refreshInterval: 10000,
  });

  return {
    marketData: data?.ohlcv || [],
    prediction: data?.prediction,
    predictionHistory: data?.prediction_history || [],
    isLoading,
    isError: error
  };
}

export function useTradeHistory() {
  const { data, error, isLoading } = useSWR(`${API_BASE}/trades`, fetcher, {
    refreshInterval: 10000,
  });

  return {
    trades: data || [],
    isLoading,
    isError: error
  };
}
