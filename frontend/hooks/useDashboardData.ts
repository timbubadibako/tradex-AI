import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { getApiUrl, getWsUrl } from '@/lib/constants';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Global WS State Manager
let ws: WebSocket | null = null;
const listeners = new Set<Function>();
let globalState = {
  status: null,
  allStatus: {},
  events: [],
  trades: [],
};

function initWs() {
  if (typeof window === 'undefined') return;
  if (ws && ws.readyState !== WebSocket.CLOSED) return;
  
  ws = new WebSocket(getWsUrl());
  ws.onmessage = (msg) => {
    try {
      const data = JSON.parse(msg.data);
      if (data.type === 'TICK') {
        globalState = {
          status: data.status,
          allStatus: data.all_status,
          events: data.events,
          trades: data.trades,
        };
        listeners.forEach(cb => cb(globalState));
      }
    } catch (e) {
      console.error("WS Parse Error", e);
    }
  };
  ws.onclose = () => {
    setTimeout(initWs, 3000); // Reconnect attempt
  };
  ws.onerror = () => {
     ws?.close();
  };
}

export function useBotStatus() {
  const [data, setData] = useState(globalState.status);
  
  useEffect(() => {
    initWs();
    const cb = (s: any) => setData(s.status);
    listeners.add(cb);
    fetch(`${getApiUrl()}/api/status`).then(r=>r.json()).then(setData).catch(()=>{});
    return () => { listeners.delete(cb); };
  }, []);
  
  return { status: data, isError: false, isLoading: !data };
}

export function useAllAssetsStatus() {
  const [data, setData] = useState(globalState.allStatus);
  
  useEffect(() => {
    initWs();
    const cb = (s: any) => setData(s.allStatus);
    listeners.add(cb);
    fetch(`${getApiUrl()}/api/all_status`).then(r=>r.json()).then(setData).catch(()=>{});
    return () => { listeners.delete(cb); };
  }, []);
  
  return { allStatus: data || {}, isError: false, isLoading: !data || Object.keys(data).length === 0 };
}

export function useEventLog() {
  const [data, setData] = useState(globalState.events);
  
  useEffect(() => {
    initWs();
    const cb = (s: any) => setData(s.events);
    listeners.add(cb);
    fetch(`${getApiUrl()}/api/events`).then(r=>r.json()).then(setData).catch(()=>{});
    return () => { listeners.delete(cb); };
  }, []);
  
  return { events: data || [], isError: false, isLoading: !data };
}

export function useTradeHistory() {
  const [data, setData] = useState(globalState.trades);
  
  useEffect(() => {
    initWs();
    const cb = (s: any) => setData(s.trades);
    listeners.add(cb);
    fetch(`${getApiUrl()}/api/trades`).then(r=>r.json()).then(setData).catch(()=>{});
    return () => { listeners.delete(cb); };
  }, []);
  
  return { trades: data || [], isError: false, isLoading: !data };
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