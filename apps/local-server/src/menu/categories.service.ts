import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCategoryDto, deviceId?: string) {
    const id = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({
        data: {
          id,
          name: dto.name,
          nameRu: dto.nameRu,
          color: dto.color || '#EA580C',
          icon: dto.icon,
          imageUrl: dto.imageUrl,
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
          payload: category as any,
          deviceId,
        },
      });

      return category;
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.category.findMany({
      where: {
        deletedAt: null,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: {
        sortOrder: 'asc',
      },
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

  async update(id: string, dto: UpdateCategoryDto, deviceId?: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.category.update({
        where: { id },
        data: {
          ...dto,
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
          payload: updated as any,
          deviceId,
        },
      });

      return updated;
    });
  }

  async remove(id: string, deviceId?: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
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

      return { success: true, message: 'Kategoriya muvaffaqiyatli o\'chirildi' };
    });
  }
}
