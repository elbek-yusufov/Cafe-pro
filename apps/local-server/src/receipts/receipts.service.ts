import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { formatCustomerReceipt } from '@oshxona/printer';

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Chekni qayta chiqarish (NUSXA / DUBLIKAT belgisi bilan)
   * Har bir qayta chiqarish audit logga yoziladi
   */
  async reprintReceipt(receiptId: string, userId: string, deviceId?: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        order: {
          include: {
            table: true,
            cashier: true,
            items: { where: { deletedAt: null }, include: { menuItem: true } },
            payments: { where: { deletedAt: null } },
          },
        },
      },
    });

    if (!receipt) {
      throw new NotFoundException('Chek topilmadi');
    }

    const order = receipt.order;
    const settings = await this.getSettingsMap();

    // NUSXA belgisi bilan qayta formatlash
    const duplicateContent = formatCustomerReceipt({
      restaurantName: settings.RESTAURANT_NAME || 'Rayhon Milliy Taomlar',
      address: settings.RESTAURANT_ADDRESS,
      phone: settings.RESTAURANT_PHONE,
      receiptNo: receipt.receiptNo,
      dateTime: receipt.printedAt,
      cashierName: order.cashier?.name || 'Kassir',
      tableName: order.table?.name,
      paperWidth: 80,
      isCopy: true,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: Number(i.quantity),
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        modifiers: i.modifiers as any,
      })),
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      discount: order.discount,
      total: order.total,
      payments: order.payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        received: p.received,
        change: p.change,
      })),
      footerNote: settings.RECEIPT_FOOTER_NOTE || 'Xaridingiz uchun rahmat!',
    });

    // Chop etish sonini oshirish
    const updated = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        printCount: { increment: 1 },
        version: { increment: 1 },
        deviceId,
      },
    });

    // Audit logga yozish
    await this.prisma.auditLog.create({
      data: {
        id: generateUUIDv7(),
        userId,
        action: 'REPRINT_RECEIPT',
        details: {
          receiptId,
          receiptNo: receipt.receiptNo,
          orderId: order.id,
          printCount: updated.printCount,
        },
        deviceId,
      },
    });

    // Sync queue
    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'receipt',
        entityId: receiptId,
        operation: SyncOperation.UPDATE,
        payload: { receiptId, printCount: updated.printCount },
        deviceId,
      },
    });

    return {
      success: true,
      message: 'Chek nusxasi chop etish uchun tayyorlandi',
      receiptNo: receipt.receiptNo,
      printCount: updated.printCount,
      receiptText: duplicateContent,
    };
  }

  async getReceiptById(id: string) {
    const receipt = await this.prisma.receipt.findUnique({
      where: { id },
      include: { order: true },
    });

    if (!receipt) {
      throw new NotFoundException('Chek topilmadi');
    }

    return receipt;
  }

  private async getSettingsMap(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }
}
