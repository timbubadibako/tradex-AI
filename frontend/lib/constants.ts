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
