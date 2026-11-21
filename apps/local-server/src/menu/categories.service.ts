import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { Actor, AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsGateway,
  ) {}

  /** Bir xil nomli (o'chirilmagan) kategoriya bo'lmasligi kerak */
  private async assertNameFree(name: string, exceptId?: string) {
    const existing = await this.prisma.category.findFirst({
      where: {
        deletedAt: null,
        name: { equals: name.trim(), mode: 'insensitive' },
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException(`"${name.trim()}" nomli kategoriya allaqachon mavjud`);
    }
  }

  async create(dto: CreateCategoryDto, actor?: Actor) {
    await this.assertNameFree(dto.name);
    const id = generateUUIDv7();
    const deviceId = actor?.deviceId;

    const category = await this.prisma.$transaction(async (tx) => {
      const row = await tx.category.create({
        data: {
          id,
          name: dto.name.trim(),
          nameRu: dto.nameRu,
          color: dto.color || '#EA580C',
          icon: dto.icon,
          imageUrl: dto.imageUrl || null,
          sortOrder: dto.sortOrder || 0,
          deviceId,
        },
      });

      // Outbox Sync Queue ga yozish
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'category',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(actor, 'CATEGORY_CREATE', { categoryId: id, name: row.name }, tx);
      return row;
    });

    this.events.emitMenuChanged({ entity: 'category', action: 'created', id });
    return category;
  }

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { menuItems: { where: { deletedAt: null } } },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        menuItems: {
          where: { deletedAt: null },
          include: {
            variants: { where: { deletedAt: null } },
            modifierGroups: {
              where: { deletedAt: null },
              include: { modifiers: { where: { deletedAt: null } } },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`IDsi ${id} bo'lgan kategoriya topilmadi`);
    }

    return category;
  }

  async update(id: string, dto: UpdateCategoryDto, actor?: Actor) {
    await this.findOne(id);
    if (dto.name !== undefined) await this.assertNameFree(dto.name, id);
    const deviceId = actor?.deviceId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.category.update({
        where: { id },
        data: {
          ...dto,
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl || null } : {}),
          version: { increment: 1 },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'category',
          entityId: id,
          operation: SyncOperation.UPDATE,
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(actor, 'CATEGORY_UPDATE', { categoryId: id, changedFields: Object.keys(dto) }, tx);
      return row;
    });

    this.events.emitMenuChanged({ entity: 'category', action: 'updated', id });
    return updated;
  }

  /**
   * Soft-delete. Ichida faol (o'chirilmagan) taomlar bo'lsa — rad etiladi:
   * avval taomlarni boshqa kategoriyaga o'tkazish yoki o'chirish kerak
   * (aks holda taomlar POS dan jimgina yo'qolib qolardi).
   */
  async remove(id: string, actor?: Actor) {
    const category = await this.findOne(id);
    const activeItems = category.menuItems.length;
    if (activeItems > 0) {
      throw new ConflictException(
        `Kategoriyada ${activeItems} ta taom bor. Avval ularni boshqa kategoriyaga o'tkazing yoki o'chiring.`,
      );
    }
    const deviceId = actor?.deviceId;

    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.category.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          version: { increment: 1 },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'category',
          entityId: id,
          operation: SyncOperation.DELETE,
          payload: { id, deletedAt: deleted.deletedAt },
          deviceId,
        },
      });

      await this.audit.log(actor, 'CATEGORY_DELETE', { categoryId: id, name: category.name }, tx);
    });

    this.events.emitMenuChanged({ entity: 'category', action: 'deleted', id });
    return { success: true, message: 'Kategoriya muvaffaqiyatli o\'chirildi' };
  }
}
