import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { SplitOrderDto } from './dto/split-order.dto';
import { MergeOrdersDto } from './dto/merge-orders.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import {
  OrderStatus,
  OrderItemStatus,
  TableStatus,
  OrderType,
  Role,
} from '@oshxona/db';
import { generateUUIDv7, SyncOperation, calculateOrderTotals } from '@oshxona/shared';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly telegramService: TelegramService,
  ) {}

  /**
   * Yangi buyurtma yaratish (Zal, Olib ketish yoki Yetkazib berish)
   */
  async createOrder(dto: CreateOrderDto, cashierId: string, deviceId?: string) {
    const orderId = generateUUIDv7();
    const orderNumber = await this.generateOrderNumber(deviceId);

    // Agar stol tanlangan bo'lsa, stol mavjudligini tekshirish
    if (dto.tableId) {
      const table = await this.prisma.table.findUnique({
        where: { id: dto.tableId },
      });
      if (!table) {
        throw new NotFoundException('Tanlangan stol topilmadi');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Buyurtma asosiy yozuvini yaratish
      const order = await tx.order.create({
        data: {
          id: orderId,
          orderNumber,
          type: dto.type,
          status: OrderStatus.OPEN,
          tableId: dto.tableId,
          cashierId,
          waiterId: dto.waiterId,
          guestCount: dto.guestCount || 1,
          notes: dto.notes,
          deviceId,
        },
      });

      // 2. Stol holatini BAND (OCCUPIED) ga o'tkazish
      if (dto.tableId) {
        await tx.table.update({
          where: { id: dto.tableId },
          data: { status: TableStatus.OCCUPIED, deviceId },
        });
      }

      // 3. Agar taomlar berilgan bo'lsa, qo'shish
      if (dto.items && dto.items.length > 0) {
        for (const itemDto of dto.items) {
          await this.insertOrderItem(tx, orderId, itemDto, deviceId);
        }
      }

      // 4. Jami summalarni hisoblash
      const updatedOrder = await this.recalculateOrderTotals(tx, orderId);

      // 5. Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'order',
          entityId: orderId,
          operation: SyncOperation.CREATE,
          payload: updatedOrder as any,
          deviceId,
        },
      });

      // 6. WebSocket xabarlari
      this.eventsGateway.emitOrderCreated(updatedOrder);
      if (dto.tableId) {
        this.eventsGateway.emitTableStatus({ id: dto.tableId, status: TableStatus.OCCUPIED });
      }

      return updatedOrder;
    });
  }

  /**
   * Barcha faol yoki arxiv buyurtmalar ro'yxati
   */
  async findAll(params: {
    status?: OrderStatus;
    type?: OrderType;
    tableId?: string;
    cashierId?: string;
    isOpenOnly?: boolean;
  }) {
    const { status, type, tableId, cashierId, isOpenOnly } = params;

    const where: any = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(tableId ? { tableId } : {}),
      ...(cashierId ? { cashierId } : {}),
      ...(isOpenOnly ? { status: { in: [OrderStatus.OPEN, OrderStatus.SENT] } } : {}),
    };

    return this.prisma.order.findMany({
      where,
      include: {
        table: { select: { id: true, name: true, hall: { select: { name: true } } } },
        cashier: { select: { id: true, name: true, username: true } },
        waiter: { select: { id: true, name: true } },
        items: {
          where: { deletedAt: null },
          include: {
            menuItem: { select: { id: true, name: true, kitchenStationId: true } },
          },
        },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Bitta buyurtma tafsilotlari
   */
  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        table: { include: { hall: true } },
        cashier: { select: { id: true, name: true, username: true } },
        waiter: { select: { id: true, name: true } },
        items: {
          where: { deletedAt: null },
          include: {
            menuItem: true,
            variant: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        payments: {
          where: { deletedAt: null },
          include: { customer: true },
        },
        receipts: {
          where: { deletedAt: null },
          orderBy: { printedAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`IDsi ${id} bo'lgan buyurtma topilmadi`);
    }

    return order;
  }

  /**
   * Buyurtmaga taom qo'shish (Sotuv paytidagi narx muzlatiladi!)
   */
  async addItem(orderId: string, dto: AddOrderItemDto, deviceId?: string) {
    const order = await this.findOne(orderId);
    if (order.status === OrderStatus.PAID || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Yopilgan yoki bekor qilingan buyurtmaga taom qo\'shib bo\'lmaydi');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.insertOrderItem(tx, orderId, dto, deviceId);
      const updatedOrder = await this.recalculateOrderTotals(tx, orderId);

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'order',
          entityId: orderId,
          operation: SyncOperation.UPDATE,
          payload: updatedOrder as any,
          deviceId,
        },
      });

      this.eventsGateway.emitOrderUpdated(updatedOrder);
      return updatedOrder;
    });
  }

  /**
   * Buyurtmadan taomni olib tashlash
   */
  async removeItem(orderId: string, itemId: string, deviceId?: string) {
    const item = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId, deletedAt: null },
    });

    if (!item) {
      throw new NotFoundException('Buyurtma ichida ushbu taom topilmadi');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: itemId },
        data: { deletedAt: new Date(), deviceId },
      });

      const updatedOrder = await this.recalculateOrderTotals(tx, orderId);

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'order_item',
          entityId: itemId,
          operation: SyncOperation.DELETE,
          payload: { id: itemId, orderId },
          deviceId,
        },
      });

      this.eventsGateway.emitOrderUpdated(updatedOrder);
      return updatedOrder;
    });
  }

  /**
   * "Oshxonaga yuborish" — KDS ekrani va oshxona printerlari uchun chipta yaratish
   */
  async sendToKitchen(orderId: string, deviceId?: string) {
    const order = await this.findOne(orderId);

    // Kutilayotgan (PENDING) taomlarni topish
    const pendingItems = order.items.filter((i) => i.status === OrderItemStatus.PENDING);
    if (pendingItems.length === 0) {
      throw new BadRequestException('Oshxonaga yuboriladigan yangi taomlar yo\'q');
    }

    return this.prisma.$transaction(async (tx) => {
      // Taomlarni COOKING (tayyorlanmoqda) ga o'tkazish
      await tx.orderItem.updateMany({
        where: {
          orderId,
          status: OrderItemStatus.PENDING,
          deletedAt: null,
        },
        data: {
          status: OrderItemStatus.COOKING,
          deviceId,
        },
      });

      // Buyurtma holatini SENT ga o'tkazish
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.SENT,
          version: { increment: 1 },
          deviceId,
        },
        include: {
          table: true,
          items: {
            where: { deletedAt: null },
            include: { menuItem: true },
          },
        },
      });

      // Oshxona KDS chiptasini tuzish (sexlar bo'yicha guruhlangan)
      const kitchenTicket = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        table: order.table?.name || 'Olib ketish',
        time: new Date().toISOString(),
        items: pendingItems.map((item) => ({
          id: item.id,
          name: item.name,
          quantity: Number(item.quantity),
          notes: item.notes,
          modifiers: item.modifiers,
          station: item.menuItem?.kitchenStationId || 'Asosiy oshxona',
        })),
      };

      // Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'kitchen_ticket',
          entityId: orderId,
          operation: SyncOperation.CREATE,
          payload: kitchenTicket as any,
          deviceId,
        },
      });

      // WebSocket orqali KDS va kassalarga yuborish
      this.eventsGateway.emitKitchenTicket(kitchenTicket);
      this.eventsGateway.emitOrderUpdated(updatedOrder);

      return {
        success: true,
        message: 'Buyurtma oshxonaga muvaffaqiyatli yuborildi',
        kitchenTicket,
      };
    });
  }

  /**
   * Oshxona KDS ekrani uchun taom holatini yangilash (COOKING -> READY -> SERVED)
   */
  async updateItemStatus(itemId: string, status: OrderItemStatus, deviceId?: string) {
    const item = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Taom topilmadi');
    }

    const updated = await this.prisma.orderItem.update({
      where: { id: itemId },
      data: { status, deviceId },
      include: { order: true },
    });

    this.eventsGateway.emitKdsItemStatus({
      itemId,
      orderId: updated.orderId,
      status,
    });

    return updated;
  }

  /**
   * KDS ekrani uchun barcha faol oshxona buyurtmalari
   */
  async getActiveKitchenTickets() {
    return this.prisma.order.findMany({
      where: {
        status: { in: [OrderStatus.OPEN, OrderStatus.SENT] },
        deletedAt: null,
        items: {
          some: {
            status: { in: [OrderItemStatus.COOKING, OrderItemStatus.READY, OrderItemStatus.PENDING] },
            deletedAt: null,
          },
        },
      },
      include: {
        table: true,
        items: {
          where: { deletedAt: null },
          include: { menuItem: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Stolni boshqa stolga ko'chirish
   */
  async moveTable(orderId: string, dto: MoveTableDto, deviceId?: string) {
    const order = await this.findOne(orderId);
    const oldTableId = order.tableId;

    const newTable = await this.prisma.table.findUnique({
      where: { id: dto.newTableId },
    });
    if (!newTable) {
      throw new NotFoundException('Yangi tanlangan stol topilmadi');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Buyurtmani yangi stolga biriktirish
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          tableId: dto.newTableId,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 2. Yangi stolni BAND qilish
      await tx.table.update({
        where: { id: dto.newTableId },
        data: { status: TableStatus.OCCUPIED, deviceId },
      });

      // 3. Agar eski stolda boshqa ochiq buyurtma qolmagan bo'lsa, BO'SH qilish
      if (oldTableId) {
        const remainingOrders = await tx.order.count({
          where: {
            tableId: oldTableId,
            id: { not: orderId },
            status: { in: [OrderStatus.OPEN, OrderStatus.SENT] },
            deletedAt: null,
          },
        });

        if (remainingOrders === 0) {
          await tx.table.update({
            where: { id: oldTableId },
            data: { status: TableStatus.AVAILABLE, deviceId },
          });
          this.eventsGateway.emitTableStatus({ id: oldTableId, status: TableStatus.AVAILABLE });
        }
      }

      this.eventsGateway.emitTableStatus({ id: dto.newTableId, status: TableStatus.OCCUPIED });
      this.eventsGateway.emitOrderUpdated(updatedOrder);

      return { success: true, message: `Buyurtma ${newTable.name}ga muvaffaqiyatli ko'chirildi` };
    });
  }

  /**
   * Buyurtmani bo'lish (Split bill) — alohida hisob yaratish
   */
  async splitOrder(orderId: string, dto: SplitOrderDto, cashierId: string, deviceId?: string) {
    const sourceOrder = await this.findOne(orderId);
    const newOrderId = generateUUIDv7();
    const newOrderNumber = await this.generateOrderNumber(deviceId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Yangi buyurtma yaratish
      const newOrder = await tx.order.create({
        data: {
          id: newOrderId,
          orderNumber: newOrderNumber,
          type: sourceOrder.type,
          status: OrderStatus.OPEN,
          tableId: sourceOrder.tableId,
          cashierId,
          waiterId: sourceOrder.waiterId,
          notes: `Ajratilgan hisob (#${sourceOrder.orderNumber} dan)`,
          deviceId,
        },
      });

      // 2. Tanlangan taomlarni yangi hisobga ko'chirish
      for (const splitItem of dto.items) {
        const currentItem = sourceOrder.items.find((i) => i.id === splitItem.orderItemId);
        if (!currentItem) continue;

        const currentQty = Number(currentItem.quantity);
        const splitQty = Math.min(currentQty, splitItem.quantity);

        if (splitQty >= currentQty) {
          // Butunlay ko'chirish
          await tx.orderItem.update({
            where: { id: currentItem.id },
            data: { orderId: newOrderId, deviceId },
          });
        } else {
          // Qisman bo'lish
          const remainingQty = currentQty - splitQty;

          // Asl taom miqdorini kamaytirish
          await tx.orderItem.update({
            where: { id: currentItem.id },
            data: {
              quantity: remainingQty,
              totalPrice: Math.round(currentItem.unitPrice * remainingQty),
              deviceId,
            },
          });

          // Yangi taom yaratish
          await tx.orderItem.create({
            data: {
              id: generateUUIDv7(),
              orderId: newOrderId,
              menuItemId: currentItem.menuItemId,
              variantId: currentItem.variantId,
              name: currentItem.name,
              unitPrice: currentItem.unitPrice,
              costPrice: currentItem.costPrice,
              quantity: splitQty,
              totalPrice: Math.round(currentItem.unitPrice * splitQty),
              notes: currentItem.notes,
              modifiers: currentItem.modifiers as any,
              status: currentItem.status,
              deviceId,
            },
          });
        }
      }

      // 3. Har ikkala buyurtma summasini qayta hisoblash
      const recalculatedSource = await this.recalculateOrderTotals(tx, orderId);
      const recalculatedNew = await this.recalculateOrderTotals(tx, newOrderId);

      this.eventsGateway.emitOrderUpdated(recalculatedSource);
      this.eventsGateway.emitOrderCreated(recalculatedNew);

      return {
        originalOrder: recalculatedSource,
        newOrder: recalculatedNew,
      };
    });
  }

  /**
   * Ikkita buyurtmani birlashtirish (Merge orders)
   */
  async mergeOrders(dto: MergeOrdersDto, deviceId?: string) {
    const targetOrder = await this.findOne(dto.targetOrderId);
    const sourceOrder = await this.findOne(dto.sourceOrderId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Manba buyurtmaning barcha taomlarini asosiyga ko'chirish
      await tx.orderItem.updateMany({
        where: { orderId: sourceOrder.id, deletedAt: null },
        data: { orderId: targetOrder.id, deviceId },
      });

      // 2. Manba buyurtmani yopish (CANCELLED/MERGED)
      await tx.order.update({
        where: { id: sourceOrder.id },
        data: {
          status: OrderStatus.CANCELLED,
          notes: `Birlashtirildi (#${targetOrder.orderNumber} ga)`,
          deletedAt: new Date(),
          deviceId,
        },
      });

      // 3. Agar manba buyurtmaning stoli bo'shasa, AVAILABLE qilish
      if (sourceOrder.tableId && sourceOrder.tableId !== targetOrder.tableId) {
        await tx.table.update({
          where: { id: sourceOrder.tableId },
          data: { status: TableStatus.AVAILABLE, deviceId },
        });
        this.eventsGateway.emitTableStatus({ id: sourceOrder.tableId, status: TableStatus.AVAILABLE });
      }

      // 4. Asosiy buyurtmani qayta hisoblash
      const updatedTarget = await this.recalculateOrderTotals(tx, targetOrder.id);

      this.eventsGateway.emitOrderUpdated(updatedTarget);
      return updatedTarget;
    });
  }

  /**
   * Buyurtmani bekor qilish (Faqat Admin PIN tasdig'i bilan)
   */
  async cancelOrder(orderId: string, dto: CancelOrderDto, userId: string, deviceId?: string) {
    // 1. Admin PIN tekshirish
    const admin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Tizimda faol admin topilmadi');
    }

    const isPinValid = await bcrypt.compare(dto.adminPin, admin.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Admin PIN kodi noto\'g\'ri! Buyurtmani bekor qilib bo\'lmaydi');
    }

    const order = await this.findOne(orderId);

    return this.prisma.$transaction(async (tx) => {
      // 2. Buyurtmani bekor qilish
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          notes: `BEKOR QILINDI. Sababi: ${dto.reason}`,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 3. Stolni bo'shatish
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE, deviceId },
        });
        this.eventsGateway.emitTableStatus({ id: order.tableId, status: TableStatus.AVAILABLE });
      }

      // 4. Audit log
      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: 'CANCEL_ORDER',
          details: {
            orderId,
            orderNumber: order.orderNumber,
            reason: dto.reason,
            total: order.total,
          },
          deviceId,
        },
      });

      // 5. Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'order',
          entityId: orderId,
          operation: SyncOperation.UPDATE,
          payload: { id: orderId, status: OrderStatus.CANCELLED, reason: dto.reason },
          deviceId,
        },
      });

      this.eventsGateway.emitOrderUpdated(cancelledOrder);

      // Telegram Botga bekor qilingan buyurtma haqida tezkor bildirishnoma yuborish
      this.telegramService.sendCancellationAlert({
        orderNumber: order.orderNumber,
        totalAmount: order.total,
        cashierName: order.cashier?.name || 'Kassir',
        reason: dto.reason,
      }).catch(() => {});

      return { success: true, message: 'Buyurtma bekor qilindi' };
    });
  }

  /**
   * Taom kiritish va narxlarni muzlatish yordamchisi
   */
  private async insertOrderItem(tx: any, orderId: string, itemDto: AddOrderItemDto, deviceId?: string) {
    // Faqat o'chirilmagan, sotuvda bor va faol kategoriyadagi taom buyurtma qilinadi
    const menuItem = await tx.menuItem.findFirst({
      where: { id: itemDto.menuItemId, deletedAt: null },
      include: { category: { select: { isActive: true, deletedAt: true } } },
    });

    if (!menuItem) {
      throw new NotFoundException('Tanlangan taom topilmadi yoki menyudan o\'chirilgan');
    }
    if (!menuItem.isAvailable) {
      throw new BadRequestException(`"${menuItem.name}" hozir sotuvda yo'q (Tugagan)`);
    }
    if (!menuItem.category || !menuItem.category.isActive || menuItem.category.deletedAt) {
      throw new BadRequestException(`"${menuItem.name}" kategoriyasi faol emas`);
    }

    let unitPrice = menuItem.price;
    let costPrice = menuItem.costPrice;
    let itemName = menuItem.name;

    // Variant tanlangan bo'lsa — aynan shu taomga tegishli va o'chirilmagan bo'lishi shart
    if (itemDto.variantId) {
      const variant = await tx.menuItemVariant.findFirst({
        where: { id: itemDto.variantId, menuItemId: menuItem.id, deletedAt: null },
      });
      if (!variant) {
        throw new BadRequestException('Tanlangan variant ushbu taomga tegishli emas yoki o\'chirilgan');
      }
      unitPrice = variant.price;
      costPrice = variant.costPrice;
      itemName = `${menuItem.name} (${variant.name})`;
    }

    // Modifierlar narxi BAZADAN olinadi (mijoz yuborgan narxga ishonilmaydi)
    let modifiersExtraPrice = 0;
    let storedModifiers: { modifierId: string; name: string; price: number }[] | undefined;
    if (itemDto.modifiers && itemDto.modifiers.length > 0) {
      const ids = [...new Set(itemDto.modifiers.map((m) => m.modifierId))];
      const rows = await tx.modifier.findMany({
        where: { id: { in: ids }, deletedAt: null, group: { menuItemId: menuItem.id, deletedAt: null } },
      });
      if (rows.length !== ids.length) {
        throw new BadRequestException('Tanlangan qo\'shimchalardan biri ushbu taomga tegishli emas');
      }
      const byId = new Map<string, any>(rows.map((r: any) => [r.id, r]));
      storedModifiers = itemDto.modifiers.map((m) => {
        const row = byId.get(m.modifierId);
        return { modifierId: row.id, name: row.name, price: row.price };
      });
      for (const mod of storedModifiers) {
        modifiersExtraPrice += mod.price;
        costPrice += byId.get(mod.modifierId).costPrice || 0;
      }
    }

    const finalUnitPrice = unitPrice + modifiersExtraPrice;
    const finalTotalPrice = Math.round(finalUnitPrice * itemDto.quantity);

    const orderItemId = generateUUIDv7();
    return tx.orderItem.create({
      data: {
        id: orderItemId,
        orderId,
        menuItemId: itemDto.menuItemId,
        variantId: itemDto.variantId,
        name: itemName,
        unitPrice: finalUnitPrice,
        costPrice,
        quantity: itemDto.quantity,
        totalPrice: finalTotalPrice,
        notes: itemDto.notes,
        modifiers: storedModifiers ? (storedModifiers as any) : undefined,
        status: OrderItemStatus.PENDING,
        deviceId,
      },
    });
  }

  /**
   * Jami buyurtma summasi, xizmat haqi va chegirmalarni qayta hisoblash
   */
  private async recalculateOrderTotals(tx: any, orderId: string) {
    const items = await tx.orderItem.findMany({
      where: { orderId, deletedAt: null },
    });

    const subtotal = items.reduce((acc: number, item: any) => acc + item.totalPrice, 0);

    // Xizmat haqi sozlamasini olish
    const order = await tx.order.findUnique({ where: { id: orderId } });
    let serviceFeePercent = 0;

    // Xizmat haqi faqat ZAL (DINE_IN) buyurtmalariga qo'llaniladi
    if (order.type === OrderType.DINE_IN) {
      const feeSetting = await tx.setting.findUnique({
        where: { key: 'SERVICE_FEE_PERCENT' },
      });
      serviceFeePercent = feeSetting ? parseInt(feeSetting.value, 10) || 10 : 10;
    }

    const { discount, serviceFee, total } = calculateOrderTotals({
      subtotal,
      serviceFeePercent,
      discountFixed: order.discount || 0,
    });

    return tx.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        serviceFee,
        total,
        version: { increment: 1 },
      },
      include: {
        table: true,
        items: { where: { deletedAt: null }, include: { menuItem: true } },
      },
    });
  }

  /**
   * Chek / buyurtma raqamini generatsiya qilish (masalan: K1-0425-0037)
   */
  private async generateOrderNumber(deviceId?: string): Promise<string> {
    const prefix = deviceId ? (deviceId.includes('02') ? 'K2' : 'K1') : 'K1';
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${month}${day}`;

    const todayCount = await this.prisma.order.count({
      where: {
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    });

    const sequence = String(todayCount + 1).padStart(4, '0');
    return `${prefix}-${datePrefix}-${sequence}`;
  }
}
