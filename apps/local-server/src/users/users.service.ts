import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, AuditService } from '../audit/audit.service';
import { ALL_ROLES, AppRole, isAdminLike } from '../auth/roles';

const SAFE_SELECT = {
  id: true,
  name: true,
  username: true,
  role: true,
  discountLimit: true,
  isActive: true,
  branchId: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true, // faqat "parol o'rnatilganmi" belgisi uchun — javobdan olib tashlanadi
} as const;

/** Oson topiladigan PINlar (bir xil raqamlar, ketma-ketlik, ommabop) rad etiladi */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true; // 0000, 1111
  const asc = '01234567890';
  const desc = '09876543210';
  if (asc.includes(pin) || desc.includes(pin)) return true; // 1234, 4321
  return ['1212', '2580', '0852', '1004', '2000', '6969', '1122', '0101'].includes(pin);
}

function present(u: any) {
  const { passwordHash, ...rest } = u;
  return { ...rest, hasPassword: !!passwordHash };
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: SAFE_SELECT,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
    return users.map(present);
  }

  private assertCanManage(actor: Actor, targetRole?: string) {
    // Faqat OWNER egani (OWNER) yaratishi/o'zgartirishi mumkin
    if (targetRole === 'OWNER' && actor.role !== 'OWNER') {
      throw new ForbiddenException('OWNER rolini faqat egasi bera oladi');
    }
  }

  private async validateSecrets(pin?: string, password?: string) {
    if (pin !== undefined) {
      if (!/^\d{4,6}$/.test(pin)) throw new BadRequestException('PIN 4–6 xonali raqam bo\'lishi kerak');
      if (isWeakPin(pin)) throw new BadRequestException('PIN juda oddiy (masalan 1111, 1234). Boshqa PIN tanlang');
    }
    if (password !== undefined && password.length < 8) {
      throw new BadRequestException('Parol kamida 8 belgidan iborat bo\'lishi kerak');
    }
  }

  async create(
    dto: { name: string; username: string; role: AppRole; pin: string; password?: string; discountLimit?: number },
    actor: Actor,
  ) {
    this.assertCanManage(actor, dto.role);
    await this.validateSecrets(dto.pin, dto.password);
    const username = dto.username.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { username } })) {
      throw new ConflictException(`"${username}" logini band`);
    }
    if (['OWNER', 'ADMIN', 'MANAGER', 'KITCHEN'].includes(dto.role) && !dto.password) {
      // Admin panel / KDS parol bilan kiriladi
      throw new BadRequestException(`${dto.role} roli uchun parol majburiy (admin panel / oshxona ekraniga kirish)`);
    }

    const id = generateUUIDv7();
    const user = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.create({
        data: {
          id,
          name: dto.name.trim(),
          username,
          role: dto.role as any,
          pinHash: await bcrypt.hash(dto.pin, 10),
          passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : null,
          discountLimit: dto.discountLimit ?? (isAdminLike(dto.role) ? 100 : 10),
          deviceId: actor.deviceId,
        },
        select: SAFE_SELECT,
      });
      await tx.syncQueue.create({
        data: { id: generateUUIDv7(), entity: 'user', entityId: id, operation: SyncOperation.CREATE, payload: { id, username, role: dto.role }, deviceId: actor.deviceId },
      });
      await this.audit.log(actor, 'STAFF_CREATE', { userId: id, username, role: dto.role }, tx);
      return row;
    });
    return present(user);
  }

  async update(
    id: string,
    dto: { name?: string; role?: AppRole; pin?: string; password?: string; discountLimit?: number; isActive?: boolean },
    actor: Actor,
  ) {
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!target) throw new NotFoundException('Xodim topilmadi');
    this.assertCanManage(actor, target.role);
    if (dto.role) this.assertCanManage(actor, dto.role);
    await this.validateSecrets(dto.pin, dto.password);

    const demoting = dto.role !== undefined && isAdminLike(target.role) && !isAdminLike(dto.role);
    const deactivating = dto.isActive === false && target.isActive;
    if (id === actor.id && (demoting || deactivating)) {
      throw new BadRequestException('O\'zingizning rolingizni pasaytira yoki hisobingizni o\'chira olmaysiz');
    }
    if ((demoting || deactivating) && isAdminLike(target.role)) {
      const admins = await this.prisma.user.count({
        where: { deletedAt: null, isActive: true, role: { in: ['OWNER', 'ADMIN'] as any }, NOT: { id } },
      });
      if (admins === 0) throw new BadRequestException('Oxirgi faol administratorni o\'chirib bo\'lmaydi');
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const row = await tx.user.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.role !== undefined ? { role: dto.role as any } : {}),
          ...(dto.discountLimit !== undefined ? { discountLimit: dto.discountLimit } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.pin !== undefined ? { pinHash: await bcrypt.hash(dto.pin, 10) } : {}),
          ...(dto.password !== undefined ? { passwordHash: await bcrypt.hash(dto.password, 10) } : {}),
          version: { increment: 1 },
          deviceId: actor.deviceId,
        },
        select: SAFE_SELECT,
      });
      await tx.syncQueue.create({
        data: { id: generateUUIDv7(), entity: 'user', entityId: id, operation: SyncOperation.UPDATE, payload: { id, role: row.role, isActive: row.isActive }, deviceId: actor.deviceId },
      });
      await this.audit.log(
        actor,
        'STAFF_UPDATE',
        {
          userId: id,
          username: target.username,
          // Maxfiy qiymatlar emas — faqat qaysi maydon o'zgargani
          changed: Object.keys(dto).map((k) => (k === 'pin' || k === 'password' ? `${k}(reset)` : k)),
          ...(dto.role ? { roleFrom: target.role, roleTo: dto.role } : {}),
        },
        tx,
      );
      return row;
    });
    return present(user);
  }

  /** Kirishlar tarixi (muvaffaqiyatli va xato) — audit_logs dan */
  async loginHistory(userId?: string, take = 100) {
    return this.prisma.auditLog.findMany({
      where: {
        action: { in: ['AUTH_LOGIN_PIN', 'AUTH_LOGIN_PASSWORD', 'AUTH_LOGIN_PIN_FAILED', 'AUTH_LOGIN_PASSWORD_FAILED'] },
        ...(userId ? { userId } : {}),
      },
      select: { id: true, action: true, userId: true, ipAddress: true, deviceId: true, createdAt: true, details: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(take, 1), 500),
    });
  }

  /** Audit jurnali (filtr bilan) */
  async auditLog(params: { action?: string; userId?: string; from?: Date; to?: Date; take?: number; skip?: number }) {
    const where: any = {
      ...(params.action ? { action: params.action } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.from || params.to ? { createdAt: { ...(params.from ? { gte: params.from } : {}), ...(params.to ? { lt: params.to } : {}) } } : {}),
    };
    const take = Math.min(Math.max(params.take ?? 100, 1), 500);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: { id: true, action: true, details: true, ipAddress: true, deviceId: true, createdAt: true, user: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take,
        skip: Math.max(params.skip ?? 0, 0),
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  }

  static roles() {
    return ALL_ROLES;
  }
}
