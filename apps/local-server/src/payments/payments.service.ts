import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AuditService, Actor } from '../audit/audit.service';
import { SupervisorApprovalService } from '../auth/supervisor-approval.service';
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
    private readonly audit: AuditService,
    private readonly approval: SupervisorApprovalService,
  ) {}

  /**
   * To'lovni qabul qilish (Naqd, Karta, Click, Payme, Nasiya yoki Aralash)
   */
  async processPayment(orderId: string, dto: ProcessPaymentDto, actor: Actor) {
    const deviceId = actor.deviceId;
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, deletedAt: null },
      include: {
        table: true,
        items: { where: { deletedAt: null, status: { not: 'CANCELLED' } }, include: { menuItem: true } },
        cashier: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }
    if (order.status === OrderStatus.PAID) {
      throw new ConflictException('Bu buyurtma allaqachon to\'langan');
    }
    if (order.status !== OrderStatus.OPEN && order.status !== OrderStatus.SENT) {
      throw new BadRequestException('Bekor qilingan yoki qaytarilgan buyurtmaga to\'lov qabul qilib bo\'lmaydi');
    }
    if (order.items.length === 0 || order.total <= 0) {
      throw new BadRequestException('Bo\'sh buyurtmani to\'lab bo\'lmaydi');
    }
    if (!dto.payments?.length) {
      throw new BadRequestException('Kamida bitta to\'lov kiritilishi shart');
    }

    // Summalar SERVER hisoblagan jamiga aniq teng bo'lishi shart (ortiqcha "to'lov" tushum sifatida yozilmaydi).
    // Naqdda mijoz ko'proq bersa — bu `received`, farqi qaytim.
    const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid !== order.total) {
      throw new BadRequestException(
        `To'lov summasi buyurtma summasiga teng emas: kerak ${order.total} so'm, kiritildi ${totalPaid} so'm`,
      );
    }
    for (const p of dto.payments) {
      if (p.method === PaymentMethod.CASH && p.received !== undefined && p.received < p.amount) {
        throw new BadRequestException('Naqd: mijozdan olingan summa to\'lov summasidan kam');
      }
      if (p.method !== PaymentMethod.CASH && p.received !== undefined && p.received !== p.amount) {
        throw new BadRequestException('Qaytim faqat naqd to\'lovda bo\'ladi');
      }
    }

    const settings = await this.getSettingsMap();
    const paperWidth = settings.RECEIPT_PAPER_WIDTH === '58' ? 58 : 80;

    const { result, lowStock } = await this.prisma.$transaction(async (tx) => {
      // 1. Atomik holat o'tishi — ikki marta bosish / parallel kassa / qayta yuborish ikkinchi to'lovni yaratmaydi
      const moved = await tx.order.updateMany({
        where: { id: orderId, status: { in: [OrderStatus.OPEN, OrderStatus.SENT] }, total: order.total },
        data: { status: OrderStatus.PAID },
      });
      if (moved.count === 0) {
        throw new ConflictException('Buyurtma allaqachon to\'langan yoki o\'zgargan — qayta yuklang');
      }

      let totalChange = 0;
      const createdPayments: any[] = [];

      for (const p of dto.payments) {
        let paymentCustomerId = p.customerId;

        if (p.method === PaymentMethod.DEBT) {
          if (!p.customerId && !p.customerPhone) {
            throw new BadRequestException('Nasiya uchun mijoz telefoni yoki IDsi kiritilishi shart');
          }

          let customer = p.customerId
            ? await tx.customer.findFirst({ where: { id: p.customerId, deletedAt: null } })
            : await tx.customer.findUnique({ where: { phone: p.customerPhone! } });

          if (!customer && p.customerId) {
            throw new NotFoundException('Mijoz topilmadi');
          }
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
              data: { debtBalance: { increment: p.amount }, version: { increment: 1 }, deviceId },
            });
          }
          paymentCustomerId = customer.id;

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

        const received = p.method === PaymentMethod.CASH ? p.received ?? p.amount : p.amount;
        const change = p.method === PaymentMethod.CASH ? received - p.amount : 0;
        totalChange += change;

        createdPayments.push(
          await tx.payment.create({
            data: {
              id: generateUUIDv7(),
              orderId,
              method: p.method,
              amount: p.amount,
              received,
              change,
              transactionId: p.transactionId,
              customerId: paymentCustomerId,
              deviceId,
            },
          }),
        );
      }

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { version: { increment: 1 }, deviceId },
      });

      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: TableStatus.AVAILABLE, deviceId },
        });
      }

      const receiptContent = formatCustomerReceipt({
        restaurantName: settings.RESTAURANT_NAME || 'Restoran',
        address: settings.RESTAURANT_ADDRESS,
        phone: settings.RESTAURANT_PHONE,
        receiptNo: order.orderNumber,
        dateTime: new Date(),
        cashierName: order.cashier?.name || 'Kassir',
        tableName: order.table?.name,
        paperWidth,
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
        serviceFeePercent: Number(settings.SERVICE_FEE_PERCENT ?? 0) || 0,
        discount: order.discount,
        total: order.total,
        payments: createdPayments.map((p) => ({
          method: p.method,
          amount: p.amount,
          received: p.received,
          change: p.change,
        })),
        footerNote: settings.RECEIPT_FOOTER_NOTE || 'Xaridingiz uchun rahmat!',
      });

      const receipt = await tx.receipt.create({
        data: {
          id: generateUUIDv7(),
          orderId,
          receiptNo: order.orderNumber,
          type: ReceiptType.SALE,
          printCount: 0,
          content: receiptContent,
          deviceId,
        },
      });

      // Retsept bo'yicha ombordan chiqim — shu tranzaksiyada
      const low = await this.stockService.deductStockForOrder(orderId, deviceId, tx);

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

      await this.audit.log(
        actor,
        'PAYMENT_CREATE',
        {
          orderId,
          orderNumber: order.orderNumber,
          total: order.total,
          methods: createdPayments.map((p) => ({ method: p.method, amount: p.amount })),
          change: totalChange,
        },
        tx,
      );

      return {
        lowStock: low,
        result: {
          success: true,
          message: 'To\'lov muvaffaqiyatli qabul qilindi',
          orderId,
          orderNumber: order.orderNumber,
          subtotal: order.subtotal,
          serviceFee: order.serviceFee,
          discount: order.discount,
          total: order.total,
          totalPaid,
          change: totalChange,
          payments: createdPayments.map((p) => ({ id: p.id, method: p.method, amount: p.amount, received: p.received, change: p.change })),
          receiptId: receipt.id,
          receiptText: receiptContent,
          paperWidth,
          updatedOrder,
        },
      };
    });

    // Real-vaqt hodisalari faqat commit'dan keyin
    this.eventsGateway.emitOrderUpdated({ ...result.updatedOrder, status: OrderStatus.PAID });
    if (order.tableId) this.eventsGateway.emitTableStatus({ id: order.tableId, status: TableStatus.AVAILABLE });
    this.stockService.notifyLowStock(lowStock);

    const { updatedOrder: _omit, ...response } = result;
    return response;
  }

  /**
   * To'lovni qaytarish (Refund — Faqat Admin PIN tasdig'i bilan)
   */
  async refundPayment(orderId: string, dto: RefundPaymentDto, actor: Actor) {
    const userId = actor.id;
    const deviceId = actor.deviceId;
    const approvedBy = await this.approval.approve(actor, dto.adminPin, 'To\'lovni qaytarish');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId, deletedAt: null },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Buyurtma topilmadi');
    }

    if (order.status === OrderStatus.REFUNDED) {
      throw new ConflictException('Buyurtma allaqachon qaytarilgan');
    }
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Faqat to\'langan buyurtmalarni qaytarish mumkin');
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Atomik o'tish PAID → REFUNDED (ikki marta qaytarib bo'lmaydi)
      const moved = await tx.order.updateMany({
        where: { id: orderId, status: OrderStatus.PAID },
        data: { status: OrderStatus.REFUNDED },
      });
      if (moved.count === 0) throw new ConflictException('Buyurtma allaqachon qaytarilgan');
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
            approvedBy,
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
