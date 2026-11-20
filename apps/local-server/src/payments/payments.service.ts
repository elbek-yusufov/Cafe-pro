import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { StockService } from '../stock/stock.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import {
  OrderStatus,
  TableStatus,
  PaymentMethod,
  ReceiptType,
  Role,
} from '@oshxona/db';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { formatCustomerReceipt } from '@oshxona/printer';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly stockService: StockService,
  ) {}

  /**
   * To'lovni qabul qilish (Naqd, Karta, Click, Payme, Nasiya yoki Aralash)
   */
  async processPayment(orderId: string, dto: ProcessPaymentDto, cashierId: string, deviceId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: {
        table: true,
        items: { where: { deletedAt: null }, include: { menuItem: true } },
        cashier: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Bu buyurtma allaqachon to\'langan');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Bekor qilingan buyurtmaga to\'lov qabul qilib bo\'lmaydi');
    }

    // To'lovlar yig'indisini tekshirish
    const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < order.total) {
      throw new BadRequestException(
        `Yetarli mablag' kiritilmadi! Buyurtma summasi: ${order.total} so'm, kiritildi: ${totalPaid} so'm`,
      );
    }

    // Sozlamalarni olish (Chek uchun restoran nomi, xizmat haqi va h.k.)
    const settings = await this.getSettingsMap();

    const paymentResult = await this.prisma.$transaction(async (tx) => {
      let totalChange = 0;
      const createdPayments: any[] = [];

      // 1. Har bir to'lov usulini qayta ishlash
      for (const p of dto.payments) {
        let paymentCustomerId = p.customerId;

        // Agar Nasiya (Qarz) bo'lsa
        if (p.method === PaymentMethod.DEBT) {
          if (!p.customerId && !p.customerPhone) {
            throw new BadRequestException('Nasiya uchun mijoz telefoni yoki IDsi kiritilishi shart');
          }

          let customer = p.customerId
            ? await tx.customer.findUnique({ where: { id: p.customerId } })
            : await tx.customer.findUnique({ where: { phone: p.customerPhone! } });

          if (!customer) {
            customer = await tx.customer.create({
              data: {
                id: generateUUIDv7(),
                name: p.customerName || 'Noma\'lum mijoz',
                phone: p.customerPhone!,
                debtBalance: p.amount,
                deviceId,
              },
            });
          } else {
            customer = await tx.customer.update({
              where: { id: customer.id },
              data: {
                debtBalance: { increment: p.amount },
                version: { increment: 1 },
                deviceId,
              },
            });
          }

          paymentCustomerId = customer.id;

          // Qarz operatsiyasini yozish
          await tx.debtTransaction.create({
            data: {
              id: generateUUIDv7(),
              customerId: customer.id,
              amount: p.amount,
              note: `Buyurtma #${order.orderNumber} uchun nasiya`,
              deviceId,
            },
          });
        }

        // Qaytim hisoblash (faqat naqdda)
        let change = 0;
        if (p.method === PaymentMethod.CASH && p.received && p.received > p.amount) {
          change = p.received - p.amount;
          totalChange += change;
        }

        const payment = await tx.payment.create({
          data: {
            id: generateUUIDv7(),
            orderId,
            method: p.method,
            amount: p.amount,
            received: p.received || p.amount,
            change,
            transactionId: p.transactionId,
            customerId: paymentCustomerId,
            deviceId,
          },
        });

        createdPayments.push(payment);
      }

      // 2. Buyurtma holatini PAID ga o'tkazish
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 3. Stolni BO'SHATISH (AVAILABLE)
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE, deviceId },
        });
        this.eventsGateway.emitTableStatus({ id: order.tableId, status: TableStatus.AVAILABLE });
      }

      // 4. Chek matnini shakllantirish (ESC/POS 80mm format)
      const receiptContent = formatCustomerReceipt({
        restaurantName: settings.RESTAURANT_NAME || 'Rayhon Milliy Taomlar',
        address: settings.RESTAURANT_ADDRESS,
        phone: settings.RESTAURANT_PHONE,
        receiptNo: order.orderNumber,
        dateTime: new Date(),
        cashierName: order.cashier?.name || 'Kassir',
        tableName: order.table?.name,
        paperWidth: 80,
        isCopy: false,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity),
          unitPrice: i.unitPrice,
          totalPrice: i.totalPrice,
          modifiers: i.modifiers as any,
        })),
        subtotal: order.subtotal,
        serviceFee: order.serviceFee,
        serviceFeePercent: parseInt(settings.SERVICE_FEE_PERCENT || '10', 10),
        discount: order.discount,
        total: order.total,
        payments: dto.payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          received: p.received,
          change: p.received ? p.received - p.amount : 0,
        })),
        footerNote: settings.RECEIPT_FOOTER_NOTE || 'Xaridingiz uchun rahmat!',
      });

      // 5. Chekni Receipt jadvaliga saqlash
      const receipt = await tx.receipt.create({
        data: {
          id: generateUUIDv7(),
          orderId,
          receiptNo: order.orderNumber,
          type: ReceiptType.SALE,
          printCount: 1,
          content: receiptContent,
          deviceId,
        },
      });

      // 6. Outbox Sync Queue
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'payment',
          entityId: orderId,
          operation: SyncOperation.CREATE,
          payload: { orderId, payments: createdPayments, receiptId: receipt.id },
          deviceId,
        },
      });

      this.eventsGateway.emitOrderUpdated(updatedOrder);

      return {
        success: true,
        message: 'To\'lov muvaffaqiyatli qabul qilindi',
        orderNumber: order.orderNumber,
        total: order.total,
        totalPaid,
        change: totalChange,
        receiptId: receipt.id,
        receiptText: receiptContent,
      };
    });

    // 7. Retsept bo'yicha ombordan avtomatik chiqim qilish
    await this.stockService.deductStockForOrder(orderId, deviceId);

    return paymentResult;
  }

  /**
   * To'lovni qaytarish (Refund — Faqat Admin PIN tasdig'i bilan)
   */
  async refundPayment(orderId: string, dto: RefundPaymentDto, userId: string, deviceId?: string) {
    // 1. Admin PIN tekshirish
    const admin = await this.prisma.user.findFirst({
      where: { role: Role.ADMIN, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Tizimda faol admin topilmadi');
    }

    const isPinValid = await bcrypt.compare(dto.adminPin, admin.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('Admin PIN kodi noto\'g\'ri! Qaytarish rad etildi');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Faqat to\'langan buyurtmalarni qaytarish mumkin');
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Buyurtma holatini REFUNDED ga o'tkazish
      const refundedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REFUNDED,
          notes: `QAYTARILDI. Sababi: ${dto.reason}`,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 3. Agar Nasiya bo'lgan bo'lsa, mijoz qarzini kamaytirish
      for (const p of order.payments) {
        if (p.method === PaymentMethod.DEBT && p.customerId) {
          await tx.customer.update({
            where: { id: p.customerId },
            data: {
              debtBalance: { decrement: p.amount },
              version: { increment: 1 },
              deviceId,
            },
          });

          await tx.debtTransaction.create({
            data: {
              id: generateUUIDv7(),
              customerId: p.customerId,
              amount: -p.amount,
              note: `Buyurtma #${order.orderNumber} qaytarildi (Qarz yopildi)`,
              deviceId,
            },
          });
        }
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: 'PAYMENT_REFUND',
          details: {
            orderId,
            orderNumber: order.orderNumber,
            total: order.total,
            reason: dto.reason,
          },
          deviceId,
        },
      });

      // 5. Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'payment_refund',
          entityId: orderId,
          operation: SyncOperation.UPDATE,
          payload: { orderId, reason: dto.reason },
          deviceId,
        },
      });

      this.eventsGateway.emitOrderUpdated(refundedOrder);

      return {
        success: true,
        message: 'To\'lov muvaffaqiyatli qaytarildi',
        orderNumber: order.orderNumber,
      };
    });
  }

  private async getSettingsMap(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }
}
