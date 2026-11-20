import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
} from '@oshxona/sync';

@Injectable()
export class CloudSyncService {
  private readonly logger = new Logger(CloudSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lokal serverlardan yuborilgan ma'lumotlarni idempotent qabul qilish (UPSERT)
   */
  async processPush(request: SyncPushRequest): Promise<SyncPushResponse> {
    const acknowledgedIds: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const item of request.items) {
      try {
        await this.applySyncItem(request.branchId, item);
        acknowledgedIds.push(item.id);
      } catch (err: any) {
        this.logger.error(`Sinxronlash xatosi [${item.entity}:${item.entityId}]: ${err.message}`);
        errors.push({ id: item.id, error: err.message });
      }
    }

    return {
      success: errors.length === 0,
      processedCount: acknowledgedIds.length,
      acknowledgedIds,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Bulutdagi so'nggi ma'lumotlarni lokal serverga taqdim etish (PULL)
   */
  async processPull(branchId: string, sinceDate: Date): Promise<SyncPullResponse> {
    const [categories, menuItems, menuItemVariants, modifierGroups, modifiers, discounts, settings, users] =
      await Promise.all([
        this.prisma.category.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.menuItem.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.menuItemVariant.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.modifierGroup.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.modifier.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.discount.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.setting.findMany({ where: { updatedAt: { gte: sinceDate } } }),
        this.prisma.user.findMany({
          where: { updatedAt: { gte: sinceDate } },
          select: { id: true, name: true, username: true, role: true, discountLimit: true, isActive: true },
        }),
      ]);

    return {
      success: true,
      categories,
      menuItems,
      menuItemVariants,
      modifierGroups,
      modifiers,
      discounts,
      settings,
      users,
      latestSyncedAt: new Date().toISOString(),
    };
  }

  /**
   * Har bir ob'ektni xavfsiz va idempotent saqlash (Upsert)
   */
  private async applySyncItem(branchId: string, item: any) {
    const payload = item.payload;
    if (!payload) return;

    const entity = item.entity;

    if (entity === 'order') {
      await this.prisma.order.upsert({
        where: { id: payload.id },
        update: {
          status: payload.status,
          subtotal: payload.subtotal,
          serviceFee: payload.serviceFee,
          discount: payload.discount,
          total: payload.total,
          notes: payload.notes,
          version: payload.version || 1,
          syncedAt: new Date(),
        },
        create: {
          id: payload.id,
          orderNumber: payload.orderNumber,
          type: payload.type,
          status: payload.status,
          branchId,
          tableId: payload.tableId,
          cashierId: payload.cashierId,
          waiterId: payload.waiterId,
          subtotal: payload.subtotal || 0,
          serviceFee: payload.serviceFee || 0,
          discount: payload.discount || 0,
          total: payload.total || 0,
          notes: payload.notes,
          syncedAt: new Date(),
        },
      });
    } else if (entity === 'order_item') {
      await this.prisma.orderItem.upsert({
        where: { id: payload.id },
        update: {
          quantity: payload.quantity,
          totalPrice: payload.totalPrice,
          status: payload.status,
          syncedAt: new Date(),
        },
        create: {
          id: payload.id,
          orderId: payload.orderId,
          menuItemId: payload.menuItemId,
          variantId: payload.variantId,
          name: payload.name,
          unitPrice: payload.unitPrice,
          costPrice: payload.costPrice || 0,
          quantity: payload.quantity,
          totalPrice: payload.totalPrice,
          notes: payload.notes,
          modifiers: payload.modifiers,
          status: payload.status,
          syncedAt: new Date(),
        },
      });
    } else if (entity === 'payment') {
      if (Array.isArray(payload.payments)) {
        for (const p of payload.payments) {
          await this.prisma.payment.upsert({
            where: { id: p.id },
            update: { syncedAt: new Date() },
            create: {
              id: p.id,
              orderId: p.orderId,
              method: p.method,
              amount: p.amount,
              received: p.received || p.amount,
              change: p.change || 0,
              transactionId: p.transactionId,
              customerId: p.customerId,
              syncedAt: new Date(),
            },
          });
        }
      }
    } else if (entity === 'receipt') {
      await this.prisma.receipt.upsert({
        where: { id: payload.id },
        update: {
          printCount: payload.printCount,
          syncedAt: new Date(),
        },
        create: {
          id: payload.id,
          orderId: payload.orderId,
          receiptNo: payload.receiptNo,
          type: payload.type,
          printCount: payload.printCount || 1,
          content: payload.content,
          syncedAt: new Date(),
        },
      });
    }
  }
}
