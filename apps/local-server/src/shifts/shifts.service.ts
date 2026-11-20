import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { PaymentMethod, CashMovementType, ReceiptType } from '@oshxona/db';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { formatShiftReport } from '@oshxona/printer';
import { TelegramService } from '../telegram/telegram.service';
import { BackupService } from '../backup/backup.service';

@Injectable()
export class ShiftsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly telegramService: TelegramService,
    private readonly backupService: BackupService,
  ) {}

  /**
   * Smena ochish (Kassir uchun)
   */
  async openShift(userId: string, dto: OpenShiftDto, deviceId?: string) {
    const existingOpenShift = await this.prisma.shift.findFirst({
      where: {
        userId,
        closedAt: null,
        deletedAt: null,
      },
    });

    if (existingOpenShift) {
      throw new BadRequestException('Sizda allaqachon ochiq smena mavjud!');
    }

    const shiftId = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const shift = await tx.shift.create({
        data: {
          id: shiftId,
          userId,
          startingCash: dto.startingCash || 0,
          expectedCash: dto.startingCash || 0,
          deviceId: dto.deviceId || deviceId,
        },
        include: {
          user: { select: { id: true, name: true, username: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: 'SHIFT_OPEN',
          details: { shiftId, startingCash: dto.startingCash },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'shift',
          entityId: shiftId,
          operation: SyncOperation.CREATE,
          payload: shift as any,
          deviceId,
        },
      });

      return shift;
    });
  }

  /**
   * Joriy faol (ochiq) smenani olish
   */
  async getCurrentShift(userId: string) {
    const shift = await this.prisma.shift.findFirst({
      where: {
        userId,
        closedAt: null,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, name: true, username: true } },
        cashMovements: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!shift) {
      return null;
    }

    const summary = await this.calculateShiftSummary(shift.id);
    return {
      ...shift,
      summary,
    };
  }

  /**
   * Smena davomida kassadan pul olish, kiritish yoki xarajat qilish
   */
  async addCashMovement(
    shiftId: string,
    dto: CreateCashMovementDto,
    userId: string,
    deviceId?: string,
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId, closedAt: null },
    });

    if (!shift) {
      throw new NotFoundException('Ochiq smena topilmadi');
    }

    if (shift.userId !== userId) {
      // Kassir faqat o'z smenasiga pul harakati qila oladi
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user?.role !== 'ADMIN') {
        throw new ForbiddenException('Boshqa kassirning smenasiga pul harakati kiritib bo\'lmaydi');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.cashMovement.create({
        data: {
          id: generateUUIDv7(),
          shiftId,
          type: dto.type,
          amount: dto.amount,
          reason: dto.reason,
          deviceId,
        },
      });

      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: `CASH_MOVEMENT_${dto.type}`,
          details: { shiftId, type: dto.type, amount: dto.amount, reason: dto.reason },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'cash_movement',
          entityId: movement.id,
          operation: SyncOperation.CREATE,
          payload: movement as any,
          deviceId,
        },
      });

      return movement;
    });
  }

  /**
   * X-Hisobot (Oraliq ko'zdan kechirish — smena yopilmaydi)
   */
  async getXReport(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: { user: true },
    });

    if (!shift) {
      throw new NotFoundException('Smena topilmadi');
    }

    const summary = await this.calculateShiftSummary(shiftId);
    const settings = await this.getSettingsMap();

    const receiptText = formatShiftReport({
      type: 'X_REPORT',
      restaurantName: settings.RESTAURANT_NAME || 'Rayhon Milliy Taomlar',
      shiftId: shift.id,
      cashierName: shift.user.name,
      openedAt: shift.openedAt,
      closedAt: null,
      paperWidth: 80,
      startingCash: shift.startingCash,
      totalSales: summary.totalSales,
      ordersCount: summary.ordersCount,
      averageCheck: summary.averageCheck,
      payments: summary.payments,
      cashMovements: summary.cashMovements,
      expectedCash: summary.expectedCash,
      actualCash: summary.expectedCash,
      cashDifference: 0,
    });

    return {
      type: 'X_REPORT',
      shiftId: shift.id,
      cashier: shift.user.name,
      openedAt: shift.openedAt,
      summary,
      receiptText,
    };
  }

  /**
   * Smena yopish va Z-Hisobot chiqarish (Yakuniy)
   */
  async closeShift(shiftId: string, dto: CloseShiftDto, userId: string, deviceId?: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId, closedAt: null },
      include: { user: true },
    });

    if (!shift) {
      throw new BadRequestException('Ushbu smena allaqachon yopilgan yoki topilmadi');
    }

    const summary = await this.calculateShiftSummary(shiftId);
    const expectedCash = summary.expectedCash;
    const actualCash = dto.actualCash;
    const cashDifference = actualCash - expectedCash; // musbat = ortiqcha, manfiy = kamomad

    const settings = await this.getSettingsMap();
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Smenani yopish
      const closedShift = await tx.shift.update({
        where: { id: shiftId },
        data: {
          closedAt: now,
          actualCash,
          expectedCash,
          cashDifference,
          totalSales: summary.totalSales,
          totalCash: summary.payments.cash,
          totalCard: summary.payments.card,
          totalClick: summary.payments.click,
          totalPayme: summary.payments.payme,
          totalDebt: summary.payments.debt,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 2. Z-Hisobot chek matnini shakllantirish
      const zReportReceiptText = formatShiftReport({
        type: 'Z_REPORT',
        restaurantName: settings.RESTAURANT_NAME || 'Rayhon Milliy Taomlar',
        shiftId: shift.id,
        cashierName: shift.user.name,
        openedAt: shift.openedAt,
        closedAt: now,
        paperWidth: 80,
        startingCash: shift.startingCash,
        totalSales: summary.totalSales,
        ordersCount: summary.ordersCount,
        averageCheck: summary.averageCheck,
        payments: summary.payments,
        cashMovements: summary.cashMovements,
        expectedCash,
        actualCash,
        cashDifference,
      });

      // 3. Receipt jadvaliga Z_REPORT sifatida yozish
      const receipt = await tx.receipt.create({
        data: {
          id: generateUUIDv7(),
          orderId: shift.id, // smena bilan bog'lash
          receiptNo: `Z-${shift.id.slice(0, 8).toUpperCase()}`,
          type: ReceiptType.Z_REPORT,
          printCount: 1,
          content: zReportReceiptText,
          deviceId,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: 'SHIFT_CLOSE_Z_REPORT',
          details: {
            shiftId,
            totalSales: summary.totalSales,
            expectedCash,
            actualCash,
            cashDifference,
          },
          deviceId,
        },
      });

      // 5. Outbox Sync (Bulutga Z-hisobot yuborish)
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'shift_z_report',
          entityId: shiftId,
          operation: SyncOperation.UPDATE,
          payload: { shift: closedShift, summary, receiptId: receipt.id },
          deviceId,
        },
      });

      return {
        success: true,
        message: 'Smena muvaffaqiyatli yopildi. Z-Hisobot shakllantirildi.',
        shift: closedShift,
        summary,
        receiptText: zReportReceiptText,
      };
    });

    // Telegram Botga Z-hisobot xabarnomasini yuborish (Asinxron)
    this.telegramService.sendZReportSummary({
      shiftId: result.shift.id,
      branchName: settings.RESTAURANT_NAME || 'Oshxona',
      cashierName: shift.user.name,
      openedAt: shift.openedAt,
      closedAt: now,
      totalSales: summary.totalSales,
      cashAmount: summary.payments.cash,
      cardAmount: summary.payments.card,
      clickAmount: summary.payments.click,
      paymeAmount: summary.payments.payme,
      debtAmount: summary.payments.debt,
      receiptCount: summary.ordersCount,
      expectedCash,
      actualCash,
      difference: cashDifference,
    }).catch(() => {});

    // Kunlik smena yopilganda avtomatik ma'lumotlar bazasi nusxasini (Backup) olish
    this.backupService.createBackup().catch(() => {});

    return result;
  }

  /**
   * Smena davomidagi barcha moliyaviy hisob-kitoblar
   */
  private async calculateShiftSummary(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Smena topilmadi');
    }

    const openTime = shift.openedAt;
    const closeTime = shift.closedAt || new Date();

    // Ushbu smenada qabul qilingan barcha to'lovlar
    const payments = await this.prisma.payment.findMany({
      where: {
        order: {
          cashierId: shift.userId,
          createdAt: { gte: openTime, lte: closeTime },
          status: 'PAID',
        },
        deletedAt: null,
      },
    });

    let cashSales = 0;
    let cardSales = 0;
    let clickSales = 0;
    let paymeSales = 0;
    let debtSales = 0;

    for (const p of payments) {
      if (p.method === PaymentMethod.CASH) cashSales += p.amount;
      else if (p.method === PaymentMethod.CARD) cardSales += p.amount;
      else if (p.method === PaymentMethod.CLICK) clickSales += p.amount;
      else if (p.method === PaymentMethod.PAYME) paymeSales += p.amount;
      else if (p.method === PaymentMethod.DEBT) debtSales += p.amount;
    }

    const totalSales = cashSales + cardSales + clickSales + paymeSales + debtSales;

    // Smena buyurtmalari soni
    const ordersCount = await this.prisma.order.count({
      where: {
        cashierId: shift.userId,
        createdAt: { gte: openTime, lte: closeTime },
        status: 'PAID',
        deletedAt: null,
      },
    });

    const averageCheck = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0;

    // Kassa harakatlari (Kirim, Inkassatsiya, Xarajat)
    const movements = await this.prisma.cashMovement.findMany({
      where: { shiftId, deletedAt: null },
    });

    let deposits = 0;
    let withdrawals = 0;
    let expenses = 0;

    for (const m of movements) {
      if (m.type === CashMovementType.DEPOSIT) deposits += m.amount;
      else if (m.type === CashMovementType.WITHDRAWAL) withdrawals += m.amount;
      else if (m.type === CashMovementType.EXPENSE) expenses += m.amount;
    }

    // Kutilgan naqd pul = Boshlang'ich naqd + Naqd sotuv + Kiritilgan pul - Olingan pul - Xarajatlar
    const expectedCash = shift.startingCash + cashSales + deposits - withdrawals - expenses;

    return {
      startingCash: shift.startingCash,
      totalSales,
      ordersCount,
      averageCheck,
      payments: {
        cash: cashSales,
        card: cardSales,
        click: clickSales,
        payme: paymeSales,
        debt: debtSales,
      },
      cashMovements: {
        deposits,
        withdrawals,
        expenses,
      },
      expectedCash: Math.max(0, expectedCash),
    };
  }

  private async getSettingsMap(): Promise<Record<string, string>> {
    const settings = await this.prisma.setting.findMany();
    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);
  }
}
