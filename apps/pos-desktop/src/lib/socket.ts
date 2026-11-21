import { io, Socket } from 'socket.io-client';
import { getAccessToken, getApiBaseUrl } from './api';

/**
 * Lokal server Socket.IO ulanishi. Server JWT ni handshake `auth.token` orqali tekshiradi
 * va hodisalarni faqat foydalanuvchi roliga ruxsat etilgan xonaga yuboradi.
 */
export function createRealtimeSocket(): Socket {
  return io(getApiBaseUrl(), {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 10000,
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
  });
}
