import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DebtPaymentDto } from './dto/debt-payment.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Barcha mijozlar (Qarzdorlar ro'yxati va qarz balansi bilan)
   */
  async findAll(onlyWithDebt = false, search?: string) {
    const where: any = {
      deletedAt: null,
      ...(onlyWithDebt ? { debtBalance: { gt: 0 } } : {}),
    };

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { phone: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    return this.prisma.customer.findMany({
      where,
      orderBy: { debtBalance: 'desc' },
      include: {
        _count: { select: { debts: true, payments: true } },
      },
    });
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: {
        debts: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException(`IDsi ${id} bo'lgan mijoz topilmadi`);
    }

    return customer;
  }

  /**
   * Nasiyani (Qarzni) to'lash — qisman yoki to'liq
   */
  async payDebt(customerId: string, dto: DebtPaymentDto, userId: string, deviceId?: string) {
    const customer = await this.findOne(customerId);

    if (customer.debtBalance <= 0) {
      throw new BadRequestException('Ushbu mijozning qarzdorligi yo\'q');
    }

    const payAmount = Math.min(dto.amount, customer.debtBalance);

    return this.prisma.$transaction(async (tx) => {
      // 1. Mijoz qarz balansini kamaytirish
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: {
          debtBalance: { decrement: payAmount },
          version: { increment: 1 },
          deviceId,
        },
      });

      // 2. Qarz operatsiyasiga manfiy yozuv kiritish (qarz to'landi)
      const debtTx = await tx.debtTransaction.create({
        data: {
          id: generateUUIDv7(),
          customerId,
          amount: -payAmount,
          note: dto.note || `Qarz to'landi (${dto.method})`,
          deviceId,
        },
      });

      // 3. Audit log
      await tx.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action: 'DEBT_PAYMENT',
          details: {
            customerId,
            customerName: customer.name,
            paidAmount: payAmount,
            remainingDebt: updatedCustomer.debtBalance,
            method: dto.method,
          },
          deviceId,
        },
      });

      // 4. Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'debt_payment',
          entityId: debtTx.id,
          operation: SyncOperation.CREATE,
          payload: { customerId, paidAmount: payAmount, remainingDebt: updatedCustomer.debtBalance },
          deviceId,
        },
      });

      return {
        success: true,
        message: 'Qarz to\'lovi muvaffaqiyatli qabul qilindi',
        paidAmount: payAmount,
        remainingDebt: updatedCustomer.debtBalance,
      };
    });
  }
}
