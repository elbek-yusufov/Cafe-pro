import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';

@Injectable()
export class MenuItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yangi taom yaratish
   */
  async create(dto: CreateMenuItemDto, deviceId?: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Bunday kategoriya mavjud emas');
    }

    const id = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: {
          id,
          name: dto.name,
          nameRu: dto.nameRu,
          description: dto.description,
          imageUrl: dto.imageUrl,
          price: dto.price,
          costPrice: dto.costPrice || 0,
          unit: dto.unit,
          categoryId: dto.categoryId,
          kitchenStationId: dto.kitchenStationId,
          isAvailable: dto.isAvailable ?? true,
          isFeatured: dto.isFeatured ?? false,
          deviceId,
        },
      });

      // Boshlang'ich narx tarixini yozish
      await tx.priceHistory.create({
        data: {
          id: generateUUIDv7(),
          menuItemId: id,
          oldPrice: 0,
          newPrice: dto.price,
          changedBy: 'ADMIN',
          reason: 'Dastlabki narx belgilandi',
          deviceId,
        },
      });

      // Outbox Sync Queue
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: item as any,
          deviceId,
        },
      });

      return this.enrichWithProfit(item);
    });
  }

  /**
   * Barcha taomlar (qidiruv va filtrlar bilan)
   */
  async findAll(params: {
    categoryId?: string;
    search?: string;
    kitchenStationId?: string;
    isFeatured?: boolean;
    isAvailable?: boolean;
    includeInactive?: boolean;
  }) {
    const {
      categoryId,
      search,
      kitchenStationId,
      isFeatured,
      isAvailable,
      includeInactive,
    } = params;

    const where: any = {
      deletedAt: null,
      ...(categoryId ? { categoryId } : {}),
      ...(kitchenStationId ? { kitchenStationId } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isAvailable !== undefined ? { isAvailable } : {}),
      ...(includeInactive ? {} : { category: { isActive: true } }),
    };

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { nameRu: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.menuItem.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, nameRu: true, color: true },
        },
        variants: {
          where: { deletedAt: null },
        },
        modifierGroups: {
          where: { deletedAt: null },
          include: {
            modifiers: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { name: 'asc' },
      ],
    });

    return items.map((item) => this.enrichWithProfit(item));
  }

  /**
   * Bitta taom tafsilotlari (retsepti va tarkibiy qismlari bilan)
   */
  async findOne(id: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, deletedAt: null },
      include: {
        category: true,
        variants: { where: { deletedAt: null } },
        modifierGroups: {
          where: { deletedAt: null },
          include: { modifiers: { where: { deletedAt: null } } },
        },
        recipes: {
          where: { deletedAt: null },
          include: {
            items: {
              where: { deletedAt: null },
              include: { ingredient: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`IDsi ${id} bo'lgan taom topilmadi`);
    }

    return this.enrichWithProfit(item);
  }

  /**
   * Taom ma'lumotlarini yangilash
   */
  async update(id: string, dto: UpdateMenuItemDto, deviceId?: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.menuItem.update({
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
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.UPDATE,
          payload: updated as any,
          deviceId,
        },
      });

      return this.enrichWithProfit(updated);
    });
  }

  /**
   * Taom narxini o'zgartirish va narx tarixiga yozish
   */
  async updatePrice(id: string, dto: UpdatePriceDto, changedBy = 'ADMIN', deviceId?: string) {
    const current = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Narxlar tarixiga yozish
      await tx.priceHistory.create({
        data: {
          id: generateUUIDv7(),
          menuItemId: id,
          oldPrice: current.price,
          newPrice: dto.newPrice,
          changedBy,
          reason: dto.reason || 'Narx qayta belgilandi',
          deviceId,
        },
      });

      // 2. Taom narxini yangilash
      const updated = await tx.menuItem.update({
        where: { id },
        data: {
          price: dto.newPrice,
          ...(dto.newCostPrice !== undefined ? { costPrice: dto.newCostPrice } : {}),
          version: { increment: 1 },
          deviceId,
        },
      });

      // 3. Sync navbatiga yuborish
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.UPDATE,
          payload: updated as any,
          deviceId,
        },
      });

      return this.enrichWithProfit(updated);
    });
  }

  /**
   * "Tugadi" yoki "Mavjud" tugmasi (Kassa uchun tezkor switch)
   */
  async toggleAvailability(id: string, isAvailable: boolean, deviceId?: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.menuItem.update({
        where: { id },
        data: {
          isAvailable,
          version: { increment: 1 },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.UPDATE,
          payload: { id, isAvailable },
          deviceId,
        },
      });

      return updated;
    });
  }

  /**
   * Taomni o'chirish (Soft-delete)
   */
  async remove(id: string, deviceId?: string) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const deleted = await tx.menuItem.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isAvailable: false,
          version: { increment: 1 },
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.DELETE,
          payload: { id, deletedAt: deleted.deletedAt },
          deviceId,
        },
      });

      return { success: true, message: 'Taom muvaffaqiyatli o\'chirildi' };
    });
  }

  /**
   * Taom variantini qo'shish (0.5 porsiya, 1 kg va h.k.)
   */
  async addVariant(menuItemId: string, dto: CreateVariantDto, deviceId?: string) {
    await this.findOne(menuItemId);
    const id = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.menuItemVariant.create({
        data: {
          id,
          menuItemId,
          name: dto.name,
          price: dto.price,
          costPrice: dto.costPrice || 0,
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item_variant',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: variant as any,
          deviceId,
        },
      });

      return variant;
    });
  }

  /**
   * Taom variantini o'chirish
   */
  async deleteVariant(variantId: string, deviceId?: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.menuItemVariant.update({
        where: { id: variantId },
        data: { deletedAt: new Date(), deviceId },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item_variant',
          entityId: variantId,
          operation: SyncOperation.DELETE,
          payload: { id: variantId },
          deviceId,
        },
      });

      return { success: true, message: 'Variant o\'chirildi' };
    });
  }

  /**
   * Taomga modifier guruh qo'shish
   */
  async addModifierGroup(menuItemId: string, dto: CreateModifierGroupDto, deviceId?: string) {
    await this.findOne(menuItemId);
    const id = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.modifierGroup.create({
        data: {
          id,
          menuItemId,
          name: dto.name,
          minSelect: dto.minSelect ?? 0,
          maxSelect: dto.maxSelect ?? 1,
          isRequired: dto.isRequired ?? false,
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'modifier_group',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: group as any,
          deviceId,
        },
      });

      return group;
    });
  }

  /**
   * Narxlar tarixi
   */
  async getPriceHistory(menuItemId: string) {
    return this.prisma.priceHistory.findMany({
      where: { menuItemId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Foyda, marja va ustama foizini avtomatik hisoblovchi yordamchi
   */
  private enrichWithProfit(item: any) {
    const profit = Math.max(0, item.price - (item.costPrice || 0));
    const markupPercent = item.costPrice > 0 ? Math.round((profit / item.costPrice) * 100) : 100;
    const marginPercent = item.price > 0 ? Math.round((profit / item.price) * 100) : 0;

    return {
      ...item,
      profit,
      markupPercent,
      marginPercent,
    };
  }
}
