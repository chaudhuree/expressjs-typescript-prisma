import { io } from 'socket.io-client';
import { getToken } from '../api/client';

let socket = null;

export function getSocket() {
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io('/', {
      withCredentials: true,
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socket.on('connect_error', (err) => {
      // Try to refresh token and reconnect on auth failures
      try {
        socket.auth = { token: getToken() };
        if (!socket.connected) socket.connect();
      } catch {}
      // console.warn('socket connect_error', err?.message || err);
    });
  } else if (!socket.connected) {
    socket.auth = { token: getToken() };
    socket.connect();
  }
  return socket;
}

export function reconnectSocket() {
  const s = getSocket();
  s.auth = { token: getToken() };
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
  }
}

export function onConnect(cb){ const s = getSocket(); s.on('connect', cb); return () => s.off('connect', cb); }
export function onDisconnect(cb){ const s = getSocket(); s.on('disconnect', cb); return () => s.off('disconnect', cb); }

export function onMessageNew(cb){ const s = getSocket(); s.on('message:new', cb); return () => s.off('message:new', cb); }
export function onUserOnline(cb){ const s = getSocket(); s.on('user:online', cb); return () => s.off('user:online', cb); }
export function onUserOffline(cb){ const s = getSocket(); s.on('user:offline', cb); return () => s.off('user:offline', cb); }
