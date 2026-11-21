'use client';

import { io, Socket } from 'socket.io-client';
import { getAccessToken, getApiBaseUrl } from './api';

/**
 * Lokal server Socket.IO ulanishi (KDS va real-time ekranlar uchun).
 * Server JWT access tokenni handshake `auth.token` orqali tekshiradi.
 */
export function createRealtimeSocket(): Socket {
  return io(getApiBaseUrl(), {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    // Har qayta ulanishda eng so'nggi tokenni yuborish
    auth: (cb) => cb({ token: getAccessToken() ?? '' }),
  });
}
