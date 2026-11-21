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

type StaffRole = 'ADMIN' | 'CASHIER' | 'WAITER';
const KNOWN_ROLES: StaffRole[] = ['ADMIN', 'CASHIER', 'WAITER'];
const ALL_STAFF: StaffRole[] = KNOWN_ROLES;

const roomFor = (role: StaffRole) => `role:${role}`;

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
    this.emitToRoles(ALL_STAFF, 'order:created', order);
  }

  emitOrderUpdated(order: any) {
    this.emitToRoles(ALL_STAFF, 'order:updated', order);
  }

  emitTableStatus(table: any) {
    this.emitToRoles(ALL_STAFF, 'table:status', table);
  }

  emitKitchenTicket(ticket: any) {
    this.emitToRoles(ALL_STAFF, 'kitchen:new-ticket', ticket);
  }

  emitKdsItemStatus(payload: unknown) {
    this.emitToRoles(ALL_STAFF, 'kds:item-status', payload);
  }

  /** Ombor qoldig'i kam — faqat admin va kassirlar */
  emitStockLow(stock: any) {
    this.emitToRoles(['ADMIN', 'CASHIER'], 'stock:low', stock);
  }

  /** Menyu (taom/kategoriya) o'zgardi — POS, ofitsiantlar va Admin ro'yxatni yangilaydi */
  emitMenuChanged(change: MenuChangeEvent) {
    this.emitToRoles(ALL_STAFF, 'menu:updated', change);
  }

  /** QR menyudan ofitsiant/hisob chaqiruvi */
  emitGuestCall(payload: unknown) {
    this.emitToRoles(ALL_STAFF, 'guest:call-service', payload);
  }

  /** Sinxronizatsiya holati — faqat admin */
  emitSyncStatus(status: unknown) {
    this.emitToRoles(['ADMIN'], 'sync:status', status);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
