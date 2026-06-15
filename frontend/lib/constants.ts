// export const getApiUrl = () => {
//   if (typeof window === 'undefined') return 'http://localhost:8000';

//   // if (process.env.NEXT_PUBLIC_API_URL) {
//   //   return process.env.NEXT_PUBLIC_API_URL;
//   // }

//   // 2. Fallback otomatis jika monolitik / satu server
//   return window.location.hostname === 'localhost'
//     ? 'http://localhost:8000/api'
//     : `${window.location.origin}/api`;
// };

// export const getWsUrl = () => {
//   if (typeof window === 'undefined') return 'ws://localhost:8000/ws';

//   if (process.env.NEXT_PUBLIC_WS_URL) {
//     return process.env.NEXT_PUBLIC_WS_URL;
//   }

//   // 2. Fallback otomatis secure websocket (wss) jika di luar localhost
//   const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//   const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
//   return `${protocol}//${host}/ws`;
// };

// KOMENTAR KODE SALAH SATUNYA

const HF_URL = 'https://chivasy1-tradex.hf.space';
const LOCAL_URL = 'http://localhost:8000';

export const getApiUrl = () => {
  if (typeof window === 'undefined') return process.env.NEXT_PUBLIC_API_URL || HF_URL;
  
  // 1. Check LocalStorage for manual toggle
  const savedNode = localStorage.getItem('TRADEX_API_NODE');
  if (savedNode === 'LOCAL') return LOCAL_URL;
  if (savedNode === 'CLOUD') return HF_URL;

  // 2. Fallback to HF if no preference set
  return HF_URL;
};

export const getWsUrl = () => {
  const api = getApiUrl();
  const protocol = api.startsWith('https') ? 'wss:' : 'ws:';
  const host = api.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `${protocol}//${host}/ws`;
};

export const toggleApiNode = (node: 'LOCAL' | 'CLOUD') => {
  localStorage.setItem('TRADEX_API_NODE', node);
  window.location.reload(); // Force refresh to re-init all hooks
};

export const getCurrentNode = () => {
  if (typeof window === 'undefined') return 'CLOUD';
  return localStorage.getItem('TRADEX_API_NODE') || 'CLOUD';
};
