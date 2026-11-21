import { io, Socket } from 'socket.io-client';
import { getAccessToken, getApiBaseUrl, refreshSession } from './api';

/**
 * Lokal server bilan YAGONA Socket.IO ulanishi (menyu, stollar, buyurtmalar bitta ulanishdan foydalanadi).
 * Server JWT ni handshake `auth.token` orqali tekshiradi va hodisalarni faqat rolga ruxsat etilgan xonaga yuboradi.
 * Token muddati tugasa — yangilanib qayta ulanadi.
 */
let socket: Socket | null = null;
let refs = 0;

export function acquireRealtimeSocket(): Socket {
  if (!socket) {
    socket = io(getApiBaseUrl(), {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 10000,
      auth: (cb) => cb({ token: getAccessToken() ?? '' }),
    });
    const s = socket;
    s.on('auth:error', async () => {
      if (await refreshSession()) s.connect();
    });
  }
  refs++;
  return socket;
}

export function releaseRealtimeSocket(): void {
  refs = Math.max(0, refs - 1);
  if (refs === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

/** @deprecated acquireRealtimeSocket/releaseRealtimeSocket dan foydalaning */
export function createRealtimeSocket(): Socket {
  return acquireRealtimeSocket();
}
