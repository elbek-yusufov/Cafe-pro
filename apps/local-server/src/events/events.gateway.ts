import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { corsOriginCallback, getJwtAccessSecret } from '../config/security.config';

type StaffRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN';
const KNOWN_ROLES: StaffRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN'];
/** Zal/kassa xodimlari (oshxonasiz) */
const FRONT: StaffRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'WAITER'];
/** Oshxona hodisalari: zal + oshxona */
const KITCHEN_FLOW: StaffRole[] = [...FRONT, 'KITCHEN'];

const roomFor = (role: StaffRole) => `role:${role}`;

/**
 * Buyurtma hodisalari faqat qisqa xulosa bilan yuboriladi (mijozlar ro'yxatni REST orqali qayta yuklaydi).
 * To'liq obyekt yuborilmaydi — unda menuItem.costPrice kabi maxfiy maydonlar bo'lishi mumkin.
 */
function orderSummary(order: any, withTotals: boolean) {
  if (!order || typeof order !== 'object') return order;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    type: order.type,
    tableId: order.tableId ?? null,
    updatedAt: order.updatedAt,
    ...(withTotals ? { subtotal: order.subtotal, total: order.total } : {}),
  };
}

/** Menyu o'zgarish turi (POS va Admin ro'yxatni qayta yuklaydi). */
export interface MenuChangeEvent {
  entity: 'menu_item' | 'category';
  action: 'created' | 'updated' | 'price_changed' | 'availability_changed' | 'deleted';
  id: string;
  price?: number;
  isAvailable?: boolean;
}

/**
 * Real-time hodisalar (Kassa, KDS, ofitsiant planshetlari, Admin).
 *
 * Ulanish uchun JWT access token majburiy:  io(API_URL, { auth: { token } })
 * Har bir mijoz o'z roli xonasiga (`role:ADMIN`, ...) qo'shiladi va hodisalar faqat
 * ruxsat etilgan rollarga yuboriladi. Token muddati tugaganda ulanish uziladi.
 */
@WebSocketGateway({
  cors: {
    origin: corsOriginCallback,
    credentials: false,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private readonly expiryTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = this.extractToken(client);
    if (!token) {
      this.reject(client, 'Token talab qilinadi');
      return;
    }

    let payload: { sub: string; role: string; deviceId?: string; exp?: number };
    try {
      payload = this.jwtService.verify(token, { secret: getJwtAccessSecret() });
    } catch {
      this.reject(client, 'Token yaroqsiz yoki muddati tugagan');
      return;
    }

    if (!KNOWN_ROLES.includes(payload.role as StaffRole)) {
      this.reject(client, 'Noma\'lum rol');
      return;
    }

    client.data.user = { id: payload.sub, role: payload.role, deviceId: payload.deviceId };
    client.join(roomFor(payload.role as StaffRole));

    // Token muddati tugaganda uzish — mijoz yangi token bilan qayta ulanadi
    if (payload.exp) {
      const ms = payload.exp * 1000 - Date.now();
      const timer = setTimeout(() => {
        client.emit('auth:error', { message: 'Token muddati tugadi' });
        client.disconnect(true);
      }, Math.max(0, ms));
      this.expiryTimers.set(client.id, timer);
    }

    this.logger.log(`🟢 Qurilma ulandi: ${client.id} (rol: ${payload.role})`);
  }

  handleDisconnect(client: Socket) {
    const timer = this.expiryTimers.get(client.id);
    if (timer) clearTimeout(timer);
    this.expiryTimers.delete(client.id);
    this.logger.log(`🔴 Qurilma uzildi: ${client.id}`);
  }

  private reject(client: Socket, message: string) {
    this.logger.warn(`⛔ Ulanish rad etildi: ${client.id} — ${message}`);
    client.emit('auth:error', { message });
    client.disconnect(true);
  }

  private extractToken(client: Socket): string | null {
    const fromAuth = client.handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) return fromAuth;
    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) return header.slice(7);
    return null;
  }

  /** Hodisani faqat ko'rsatilgan rollarga yuborish. */
  emitToRoles(roles: StaffRole[], event: string, payload: unknown) {
    if (!this.server) return;
    this.server.to(roles.map(roomFor)).emit(event, payload);
  }

  emitOrderCreated(order: any) {
    this.emitToRoles(FRONT, 'order:created', orderSummary(order, true));
  }

  emitOrderUpdated(order: any) {
    this.emitToRoles(FRONT, 'order:updated', orderSummary(order, true));
    this.emitToRoles(['KITCHEN'], 'order:updated', orderSummary(order, false));
  }

  emitTableStatus(table: any) {
    this.emitToRoles(FRONT, 'table:status', table);
  }

  emitKitchenTicket(ticket: any) {
    this.emitToRoles(KITCHEN_FLOW, 'kitchen:new-ticket', ticket);
  }

  emitKdsItemStatus(payload: unknown) {
    this.emitToRoles(KITCHEN_FLOW, 'kds:item-status', payload);
  }

  /** Ombor qoldig'i kam — faqat admin va kassirlar */
  emitStockLow(stock: any) {
    this.emitToRoles(['OWNER', 'ADMIN', 'MANAGER', 'CASHIER'], 'stock:low', stock);
  }

  /** Menyu (taom/kategoriya) o'zgardi — POS, ofitsiantlar va Admin ro'yxatni yangilaydi */
  emitMenuChanged(change: MenuChangeEvent) {
    this.emitToRoles(KITCHEN_FLOW, 'menu:updated', change);
  }

  /** QR menyudan ofitsiant/hisob chaqiruvi */
  emitGuestCall(payload: unknown) {
    this.emitToRoles(FRONT, 'guest:call-service', payload);
  }

  /** Sinxronizatsiya holati — faqat admin */
  emitSyncStatus(status: unknown) {
    this.emitToRoles(['OWNER', 'ADMIN'], 'sync:status', status);
  }

  /**
   * Menyu yangilanganda (taom qo'shildi, narxi o'zgardi, o'chirildi)
   * POS terminali va KDS ekranini real-vaqtda yangilash uchun
   */
  emitMenuUpdated(payload: { action: 'CREATE' | 'UPDATE' | 'DELETE' | 'PRICE_CHANGE' | 'AVAILABILITY'; item: any }) {
    this.server?.emit('menu:updated', payload);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
