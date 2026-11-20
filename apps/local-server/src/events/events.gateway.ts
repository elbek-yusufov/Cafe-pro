import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🟢 Kassa/KDS qurilmasi ulandi: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔴 Kassa/KDS qurilmasi uzildi: ${client.id}`);
  }

  /**
   * Yangi buyurtma yaratilganda
   */
  emitOrderCreated(order: any) {
    this.server?.emit('order:created', order);
  }

  /**
   * Buyurtma yangilanganda (taom qo'shildi, o'chirildi, o'zgartirildi)
   */
  emitOrderUpdated(order: any) {
    this.server?.emit('order:updated', order);
  }

  /**
   * Stol holati o'zgarganda (bo'sh, band, to'lov kutilmoqda)
   */
  emitTableStatus(table: any) {
    this.server?.emit('table:status', table);
  }

  /**
   * Oshxonaga yangi chek / buyurtma yuborilganda (KDS va oshxona printerlari uchun)
   */
  emitKitchenTicket(ticket: any) {
    this.server?.emit('kitchen:new-ticket', ticket);
  }

  /**
   * Ombor qoldig'i kam qolganda ogohlantirish
   */
  emitStockLow(stock: any) {
    this.server?.emit('stock:low', stock);
  }

  @SubscribeMessage('ping')
  handlePing(client: Socket) {
    client.emit('pong', { timestamp: new Date().toISOString() });
  }
}
