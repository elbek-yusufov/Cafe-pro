import { ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginThrottleService } from './login-throttle.service';
import { isSupervisor } from './roles';

/** Tasdiqlash huquqiga ega rollar (bekor qilish, qaytarish, katta chegirma) */
export const SUPERVISOR_ROLES = ['OWNER', 'ADMIN', 'MANAGER'] as const;

export interface ApprovalActor {
  id: string;
  role?: string;
}

/**
 * Nazoratchi (admin) tasdig'i.
 * - So'rovchi o'zi ADMIN bo'lsa — PIN talab qilinmaydi (u allaqachon PIN/parol bilan kirgan).
 * - Aks holda istalgan faol ADMIN ning PIN kodi tekshiriladi (faqat birinchisiniki emas).
 * - Xato PINlar so'rovchi bo'yicha bloklanadi (4 xonali PIN ni terib topishdan himoya).
 * @returns tasdiqlagan admin IDsi (audit uchun)
 */
@Injectable()
export class SupervisorApprovalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async approve(actor: ApprovalActor, pin: string | undefined, action: string): Promise<string> {
    if (isSupervisor(actor.role)) {
      return actor.id;
    }

    if (!pin) {
      throw new ForbiddenException(`"${action}" uchun admin PIN tasdig'i talab qilinadi`);
    }

    const key = `approve:${actor.id}`;
    this.throttle.assertNotLocked(key);

    const supervisors = await this.prisma.user.findMany({
      where: { role: { in: [...SUPERVISOR_ROLES] as any }, isActive: true, deletedAt: null },
      select: { id: true, pinHash: true },
    });

    for (const s of supervisors) {
      if (await bcrypt.compare(pin, s.pinHash)) {
        this.throttle.registerSuccess(key);
        return s.id;
      }
    }

    this.throttle.registerFailure(key);
    throw new ForbiddenException('Admin PIN kodi noto\'g\'ri');
  }
}
