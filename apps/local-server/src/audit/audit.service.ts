import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@oshxona/db';
import { generateUUIDv7 } from '@oshxona/shared';
import { PrismaService } from '../prisma/prisma.service';

/** Amalni bajargan foydalanuvchi (JWT dan). */
export interface Actor {
  id: string;
  username?: string;
  role?: string;
  deviceId?: string;
}

/**
 * Muhim amallarni audit_logs jadvaliga yozish.
 * Maxfiy qiymatlar (PIN, parol, hash, token) hech qachon `details` ga uzatilmasligi kerak.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param tx tranzaksiya ichida chaqirilsa — o'sha tranzaksiyada yoziladi (amal bilan birga commit/rollback)
   */
  async log(
    actor: Actor | null | undefined,
    action: string,
    details: Record<string, unknown>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    try {
      await client.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId: actor?.id ?? null,
          action,
          details: details as Prisma.InputJsonValue,
          deviceId: actor?.deviceId,
        },
      });
    } catch (e) {
      // Tranzaksiya ichida xato bo'lsa — yuqoriga uzatamiz (amal ham bekor bo'ladi)
      if (tx) throw e;
      this.logger.error(`Audit log yozilmadi (${action}): ${(e as Error).message}`);
    }
  }
}
