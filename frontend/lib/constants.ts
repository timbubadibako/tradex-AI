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

export const getApiUrl = () => {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  // If running on localhost (dev), use 8000. If on HF or elsewhere, use current origin
  return window.location.hostname === 'localhost' ? 'http://localhost:8000' : window.location.origin;
};

export const getWsUrl = () => {
  if (typeof window === 'undefined') return 'ws://localhost:8000/ws';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
  return `${protocol}//${host}/ws`;
};
