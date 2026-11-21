import { useCallback, useEffect, useRef, useState } from 'react';
import { CartItem } from '../types/pos';
import { ApiError, NetworkError, apiRequest } from './api';
import { PosPaymentMethod, payOrder, submitCart } from './pos-data';
import { acquireRealtimeSocket, releaseRealtimeSocket } from './socket';

/**
 * POS oflayn navbati (outbox).
 *
 * Lokal server (LAN) vaqtincha mavjud bo'lmasa, buyurtma va to'lov shu qurilmada saqlanadi va server
 * qaytganda AVTOMATIK yuboriladi. Har bir yozuv barqaror `id` (= serverdagi buyurtma IDsi) ga ega —
 * qayta yuborish server tomonida idempotent: takroriy buyurtma yoki ikkinchi to'lov yaratilmaydi.
 *
 * Hech bir yozuv jimgina o'chirilmaydi: server rad etsa (masalan narx o'zgargan) — "xato" holatida qoladi
 * va kassir ko'rib chiqadi.
 */

export interface OutboxEntry {
  id: string; // clientOrderId
  createdAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableId?: string;
  tableName?: string;
  cart: CartItem[];
  discountPercent: number;
  payment?: { method: PosPaymentMethod; received: number; expectedTotal: number };
  status: 'pending' | 'failed';
  attempts: number;
  error?: string;
  orderNumber?: string;
}

const KEY = 'pos_outbox_v1';

function read(): OutboxEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function write(list: OutboxEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage to'la/bloklangan — xabar UI da ko'rsatiladi */
  }
  window.dispatchEvent(new Event('pos:outbox-changed'));
}

export function enqueueOffline(entry: Omit<OutboxEntry, 'status' | 'attempts' | 'createdAt'>) {
  const list = read().filter((e) => e.id !== entry.id);
  list.push({ ...entry, createdAt: new Date().toISOString(), status: 'pending', attempts: 0 });
  write(list);
}

export function discardOutboxEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}

let flushing = false;

/** @returns yuborilgan yozuvlar soni; server hali yo'q bo'lsa — to'xtaydi (keyin qayta urinadi) */
export async function flushOutbox(): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    for (const entry of read().filter((e) => e.status === 'pending')) {
      try {
        const order = await submitCart({
          clientOrderId: entry.id,
          cart: entry.cart,
          orderType: entry.orderType,
          tableId: entry.tableId,
          discountPercent: entry.discountPercent,
        });
        if (entry.payment && order.status !== 'PAID') {
          if (order.total !== entry.payment.expectedTotal) {
            throw new ApiError(
              `Server summasi (${order.total.toLocaleString('uz-UZ')}) kassadagi summadan (${entry.payment.expectedTotal.toLocaleString('uz-UZ')}) farq qiladi — buyurtma #${order.orderNumber} ochiq qoldi, to'lovni qayta qabul qiling`,
              409,
            );
          }
          await payOrder(order.id, entry.payment.method, order.total, entry.payment.received);
        }
        write(read().filter((e) => e.id !== entry.id));
        sent++;
      } catch (e) {
        if (e instanceof NetworkError) break; // server hali yo'q — keyinroq
        failed++;
        write(
          read().map((x) =>
            x.id === entry.id ? { ...x, status: 'failed', attempts: x.attempts + 1, error: (e as Error).message } : x,
          ),
        );
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, failed };
}

export interface ConnectivityState {
  serverReachable: boolean;
  outbox: OutboxEntry[];
  cloud?: { cloudConfigured?: boolean; state?: string; pendingCount?: number; lastSyncedAt?: string | null; lastError?: string | null };
  lastCheck?: string;
}

/**
 * Lokal server (LAN) ga ulanish holati + oflayn navbatni avtomatik yuborish.
 * @param onFlushed yuborilgan yozuvlar bo'lsa (stol/buyurtmalarni qayta yuklash uchun)
 */
export function useConnectivity(enabled: boolean, onFlushed?: (r: { sent: number; failed: number }) => void) {
  const [state, setState] = useState<ConnectivityState>({ serverReachable: true, outbox: read() });
  const cb = useRef(onFlushed);
  cb.current = onFlushed;

  const check = useCallback(async () => {
    let reachable = false;
    try {
      await apiRequest('/health', { auth: false, timeoutMs: 4000 });
      reachable = true;
    } catch {
      reachable = false;
    }
    let cloud: ConnectivityState['cloud'];
    if (reachable) {
      cloud = await apiRequest<ConnectivityState['cloud']>('/sync/status').catch(() => undefined);
      if (read().some((e) => e.status === 'pending')) {
        const r = await flushOutbox();
        if (r.sent || r.failed) cb.current?.(r);
      }
    }
    setState({ serverReachable: reachable, outbox: read(), cloud, lastCheck: new Date().toISOString() });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    check();
    const timer = setInterval(check, 10000);
    const socket = acquireRealtimeSocket();
    const onConnect = () => check();
    const onDisconnect = () => setState((s) => ({ ...s, serverReachable: false }));
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    const onOutbox = () => setState((s) => ({ ...s, outbox: read() }));
    window.addEventListener('pos:outbox-changed', onOutbox);
    return () => {
      clearInterval(timer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      releaseRealtimeSocket();
      window.removeEventListener('pos:outbox-changed', onOutbox);
    };
  }, [enabled, check]);

  return { ...state, check };
}
