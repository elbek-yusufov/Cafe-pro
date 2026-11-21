import { useCallback, useEffect, useRef, useState } from 'react';
import { CartItem, DailyReport, Employee, InventoryItem, OrderRecord, RestaurantSettings, TableItem } from '../types/pos';
import { ApiError, apiRequest } from './api';
import { acquireRealtimeSocket, releaseRealtimeSocket } from './socket';

/**
 * POS ↔ lokal server: stollar, buyurtmalar, sozlamalar va to'lov (kassa) oqimi.
 * Barcha narx/summa hisoblari SERVERDA; bu yerda faqat ko'rsatish uchun.
 */

// ---------------------------------------------------------------- types (server)

export interface ServerOrderItem {
  id: string;
  name: string;
  quantity: string | number;
  unitPrice: number;
  totalPrice: number;
  notes?: string | null;
  status: 'PENDING' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
  menuItemId: string;
}

export interface ServerOrder {
  id: string;
  orderNumber: string;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  status: 'OPEN' | 'SENT' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  tableId?: string | null;
  table?: { id: string; name: string; hall?: { name: string } } | null;
  cashier?: { id: string; name: string } | null;
  waiter?: { id: string; name: string } | null;
  subtotal: number;
  serviceFee: number;
  discount: number;
  discountPercent?: number;
  total: number;
  createdAt: string;
  items: ServerOrderItem[];
  payments?: { id: string; method: string; amount: number; change: number }[];
  receipts?: { id: string; receiptNo: string }[];
}

interface ServerHall {
  id: string;
  name: string;
  tables: { id: string; name: string; capacity: number; status: string }[];
}

export interface PaymentResult {
  orderId: string;
  orderNumber: string;
  subtotal: number;
  serviceFee: number;
  discount: number;
  total: number;
  totalPaid: number;
  change: number;
  receiptId: string;
  receiptText: string;
  paperWidth: 58 | 80;
}

// ---------------------------------------------------------------- realtime helper

function useRealtimeReload(enabled: boolean, events: string[], reload: () => void) {
  const cb = useRef(reload);
  cb.current = reload;
  useEffect(() => {
    if (!enabled) return;
    const socket = acquireRealtimeSocket();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => cb.current(), 250);
    };
    events.forEach((e) => socket.on(e, schedule));
    socket.io.on('reconnect', schedule);
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((e) => socket.off(e, schedule));
      socket.io.off('reconnect', schedule);
      releaseRealtimeSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

// ---------------------------------------------------------------- mapping

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

export function toOrderRecord(o: ServerOrder): OrderRecord {
  const active = o.items.filter((i) => i.status !== 'CANCELLED');
  const kitchen = active.filter((i) => i.status !== 'PENDING');
  let status: OrderRecord['status'];
  if (o.status === 'PAID') status = 'PAID';
  else if (o.status === 'CANCELLED' || o.status === 'REFUNDED') status = 'CANCELLED';
  else if (kitchen.length && kitchen.every((i) => i.status === 'READY' || i.status === 'SERVED')) status = 'READY';
  else if (kitchen.length) status = 'PREPARING';
  else status = 'NEW';

  const methods = [...new Set((o.payments || []).map((p) => p.method))];
  const paymentMethod: OrderRecord['paymentMethod'] =
    methods.length > 1 ? 'MIXED' : methods[0] === 'CASH' ? 'CASH' : methods[0] === 'CARD' ? 'CARD' : methods.length ? 'QRIS' : undefined;

  return {
    id: o.id,
    orderNumber: o.orderNumber,
    table: o.table?.name || (o.type === 'DELIVERY' ? 'Yetkazib berish' : 'Olib ketish'),
    type: o.type === 'DINE_IN' ? 'DINE_IN' : 'TAKEAWAY',
    status,
    createdAt: fmtTime(o.createdAt),
    items: active.map((i) => ({
      dishId: i.menuItemId,
      name: i.name,
      price: i.unitPrice,
      quantity: Number(i.quantity),
      notes: i.notes || undefined,
    })),
    subtotal: o.subtotal,
    tax: o.serviceFee,
    discount: o.discount,
    total: o.total,
    paymentMethod,
    cashierName: o.cashier?.name,
  };
}

// ---------------------------------------------------------------- tables

export function useServerTables(enabled: boolean) {
  const [tables, setTables] = useState<TableItem[]>([]);
  const [halls, setHalls] = useState<{ id: string; name: string }[]>([]);
  const [activeOrders, setActiveOrders] = useState<ServerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [hallRows, open] = await Promise.all([
        apiRequest<ServerHall[]>('/tables/halls'),
        apiRequest<{ items: ServerOrder[] }>('/orders?isOpenOnly=true&take=200'),
      ]);
      setHalls(hallRows.map((h) => ({ id: h.id, name: h.name })));
      setActiveOrders(open.items);
      const byTable = new Map(open.items.filter((o) => o.tableId).map((o) => [o.tableId!, o]));
      setTables(
        hallRows.flatMap((h) =>
          h.tables.map((t): TableItem => {
            const o = byTable.get(t.id);
            return {
              id: t.id,
              name: t.name,
              capacity: t.capacity,
              hall: h.name,
              status: o ? 'OCCUPIED' : t.status === 'RESERVED' ? 'RESERVED' : t.status === 'AVAILABLE' ? 'AVAILABLE' : 'OCCUPIED',
              activeOrderId: o?.id,
              occupiedSince: o ? fmtTime(o.createdAt) : undefined,
              totalAmount: o?.total,
              waiterName: o?.waiter?.name || o?.cashier?.name,
              activeOrder: o
                ? {
                    orderNumber: o.orderNumber,
                    startedAt: fmtTime(o.createdAt),
                    waiter: o.waiter?.name || o.cashier?.name || '',
                    items: o.items
                      .filter((i) => i.status !== 'CANCELLED')
                      .map((i) => ({ name: i.name, quantity: Number(i.quantity), price: i.unitPrice })),
                    total: o.total,
                  }
                : undefined,
            };
          }),
        ),
      );
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  useRealtimeReload(enabled, ['table:status', 'order:created', 'order:updated'], reload);

  return { tables, halls, activeOrders, error, reload };
}

// ---------------------------------------------------------------- orders history

export function useServerOrders(enabled: boolean) {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [raw, setRaw] = useState<ServerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      since.setDate(since.getDate() - 1); // bugun va kecha
      const res = await apiRequest<{ items: ServerOrder[] }>(`/orders?take=200&from=${encodeURIComponent(since.toISOString())}`);
      setRaw(res.items);
      setOrders(res.items.map(toOrderRecord));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  useRealtimeReload(enabled, ['order:created', 'order:updated', 'kds:item-status', 'kitchen:new-ticket'], reload);

  return { orders, raw, error, reload };
}

// ---------------------------------------------------------------- settings

export function useServerSettings(enabled: boolean, defaults: RestaurantSettings) {
  const [settings, setSettings] = useState<RestaurantSettings>(defaults);
  const [raw, setRaw] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    try {
      const s = await apiRequest<Record<string, string>>('/settings');
      setRaw(s);
      setSettings((prev) => ({
        ...prev,
        name: s.RESTAURANT_NAME || prev.name,
        address: s.RESTAURANT_ADDRESS ?? prev.address,
        phone: s.RESTAURANT_PHONE ?? prev.phone,
        taxNumber: s.RESTAURANT_TIN ?? prev.taxNumber,
        receiptHeader: s.RECEIPT_HEADER_NOTE ?? prev.receiptHeader,
        receiptFooter: s.RECEIPT_FOOTER_NOTE ?? prev.receiptFooter,
        serviceFeePercent: Number(s.SERVICE_FEE_PERCENT ?? prev.serviceFeePercent) || 0,
        paperWidth: s.RECEIPT_PAPER_WIDTH === '58' ? '58mm' : '80mm',
      }));
    } catch {
      /* oldingi qiymatlar qoladi */
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  useRealtimeReload(enabled, ['settings:updated'], reload);

  return { settings, raw, reload };
}

// ---------------------------------------------------------------- checkout

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

export class ApprovalRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApprovalRequiredError';
  }
}

/**
 * Savatni serverga yuborish: yangi buyurtma yoki stolning ochiq buyurtmasiga qo'shish,
 * chegirmani qo'llash va oshxonaga yuborish. Natija — SERVER hisoblagan buyurtma.
 *
 * @param clientOrderId — savat uchun barqaror UUID (qayta urinishda takroriy buyurtma yaratilmaydi)
 */
export async function submitCart(params: {
  clientOrderId: string;
  cart: CartItem[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableId?: string;
  existingOrderId?: string;
  discountPercent: number;
  approverPin?: string;
}): Promise<ServerOrder> {
  const items = params.cart.map((c) => ({ menuItemId: c.dishId, quantity: c.quantity, ...(c.notes ? { notes: c.notes } : {}) }));
  let order: ServerOrder;

  if (params.existingOrderId) {
    order = await apiRequest<ServerOrder>(`/orders/${params.existingOrderId}`);
    for (const it of items) {
      order = await apiRequest<ServerOrder>(`/orders/${params.existingOrderId}/items`, { method: 'POST', body: it });
    }
  } else {
    order = await apiRequest<ServerOrder>('/orders', {
      method: 'POST',
      body: {
        id: params.clientOrderId,
        type: params.orderType,
        ...(params.orderType === 'DINE_IN' ? { tableId: params.tableId } : {}),
        items,
      },
    });
  }

  if ((order.discountPercent ?? 0) !== params.discountPercent) {
    try {
      order = await apiRequest<ServerOrder>(`/orders/${order.id}/discount`, {
        method: 'PATCH',
        body: { percent: params.discountPercent, ...(params.approverPin ? { approverPin: params.approverPin } : {}) },
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) throw new ApprovalRequiredError(e.message);
      throw e;
    }
  }

  if (order.items.some((i) => i.status === 'PENDING')) {
    await apiRequest(`/orders/${order.id}/send-kitchen`, { method: 'POST' });
    order = await apiRequest<ServerOrder>(`/orders/${order.id}`);
  }
  return order;
}

export type PosPaymentMethod = 'CASH' | 'CARD' | 'QRIS' | 'MIXED';

/** POS to'lov turini server to'lov(lar)iga aylantirish. Summa — server jamisi. */
export function buildPayments(method: PosPaymentMethod, total: number, received: number) {
  switch (method) {
    case 'CASH':
      return [{ method: 'CASH', amount: total, received: Math.max(received, total) }];
    case 'CARD':
      return [{ method: 'CARD', amount: total }];
    case 'QRIS':
      return [{ method: 'CLICK', amount: total }];
    case 'MIXED': {
      const cash = Math.min(Math.max(received, 0), total);
      const rest = total - cash;
      return [
        ...(cash > 0 ? [{ method: 'CASH', amount: cash, received: cash }] : []),
        ...(rest > 0 ? [{ method: 'CARD', amount: rest }] : []),
      ];
    }
  }
}

export function payOrder(orderId: string, method: PosPaymentMethod, total: number, received: number) {
  return apiRequest<PaymentResult>(`/orders/${orderId}/pay`, {
    method: 'POST',
    body: { payments: buildPayments(method, total, received) },
  });
}

export const newClientOrderId = uuid;

// ---------------------------------------------------------------- printing

/**
 * Server yaratgan chek matnini (58/80 mm) chop etish. Brauzer/Electron chop etish oynasi orqali —
 * ESC/POS printer to'g'ridan-to'g'ri ulanishi Electron printer drayveri bosqichida (hardware tekshiruvi kutilmoqda).
 */
export function printReceiptText(text: string, paperWidth: 58 | 80 = 80): Promise<{ success: boolean; error?: string }> | void {
  // Windows ilovasi: printer drayveri orqali jim chop etish (oyna chiqmaydi)
  if (typeof window !== 'undefined' && window.posApi) {
    return window.posApi.printReceipt(text, paperWidth);
  }
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  const pre = doc.createElement('pre');
  pre.textContent = text; // matn sifatida — HTML sifatida emas (XSS yo'q)
  doc.head.innerHTML = `<style>@page{size:${paperWidth}mm auto;margin:2mm}body{margin:0}pre{font:${paperWidth === 58 ? 10 : 12}px/1.25 'Courier New',monospace;white-space:pre-wrap;margin:0}</style>`;
  doc.body.appendChild(pre);
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  }, 50);
}

// ---------------------------------------------------------------- reports / inventory / staff (rolga bog'liq)


/** 403 bo'lsa — rol ruxsati yo'q (soxta ma'lumot ko'rsatilmaydi) */
export interface Restricted<T> {
  data: T | null;
  forbidden: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

function useRestricted<T>(enabled: boolean, path: string, map: (raw: any) => T, events: string[] = []): Restricted<T> {
  const [data, setData] = useState<T | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef(map);
  mapRef.current = map;
  const reload = useCallback(async () => {
    try {
      setData(mapRef.current(await apiRequest<any>(path)));
      setForbidden(false);
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) setForbidden(true);
      else setError((e as Error).message);
    }
  }, [path]);
  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);
  useRealtimeReload(enabled && events.length > 0, events, reload);
  return { data, forbidden, error, reload };
}

export function useServerReport(enabled: boolean): Restricted<DailyReport> {
  const f = new Date();
  f.setHours(0, 0, 0, 0);
  const t = new Date(f);
  t.setDate(t.getDate() + 1);
  const path = `/reports/summary?from=${encodeURIComponent(f.toISOString())}&to=${encodeURIComponent(t.toISOString())}`;
  return useRestricted(
    enabled,
    path,
    (s) => {
      const by = (m: string) => s.payments.filter((p: any) => p.method === m).reduce((a: number, p: any) => a + p.amount, 0);
      return {
        todaySales: s.revenue,
        orderCount: s.ordersCount,
        cashPayments: by('CASH'),
        cardPayments: by('CARD'),
        qrPayments: by('CLICK') + by('PAYME'),
        averageCheck: s.averageCheck,
        hourlySales: s.hourly.filter((h: any) => h.hour >= 8 && h.hour <= 23).map((h: any) => ({ hour: `${String(h.hour).padStart(2, '0')}:00`, amount: h.revenue })),
      } as DailyReport;
    },
    ['order:updated'],
  );
}

const UNIT_LABEL: Record<string, string> = { KG: 'kg', GRAM: 'g', LITRE: 'l', ML: 'ml', PIECE: 'dona', PORTION: 'porsiya' };

export function useServerInventory(enabled: boolean): Restricted<InventoryItem[]> {
  return useRestricted(
    enabled,
    '/ingredients',
    (rows: any[]) =>
      rows.map((i) => ({
        id: i.id,
        name: i.name,
        currentStock: Number(i.currentQty),
        minStock: Number(i.minQty),
        unit: UNIT_LABEL[i.unit] || i.unit,
        costPerUnit: typeof i.avgCost === 'number' ? i.avgCost : 0, // kassirga server tannarxni yubormaydi
        category: 'Xomashyo',
        lastUpdated: new Date(i.updatedAt).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' }),
      })),
    ['stock:low'],
  );
}

const POS_ROLE: Record<string, Employee['role']> = { OWNER: 'ADMIN', ADMIN: 'ADMIN', MANAGER: 'MANAGER', CASHIER: 'CASHIER', WAITER: 'WAITER', KITCHEN: 'CHEF' };

export function useServerEmployees(enabled: boolean): Restricted<Employee[]> {
  return useRestricted(enabled, '/users', (rows: any[]) =>
    rows.map((u) => ({
      id: u.id,
      name: u.name,
      role: POS_ROLE[u.role] || 'CASHIER',
      phone: u.username, // telefon maydoni yo'q — login ko'rsatiladi
      pin: '••••', // PIN hech qachon serverdan kelmaydi
      isActive: u.isActive,
      branch: '',
    })),
  );
}
