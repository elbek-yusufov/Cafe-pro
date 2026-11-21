import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@oshxona/db';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { Actor, AuditService } from '../audit/audit.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MenuItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventsGateway,
  ) {}

  /** O'chirilmagan va faol kategoriyani tekshirish */
  private async assertCategoryUsable(categoryId: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    const category = await tx.category.findFirst({
      where: { id: categoryId, deletedAt: null },
    });
    if (!category) {
      throw new BadRequestException('Bunday kategoriya mavjud emas yoki o\'chirilgan');
    }
    return category;
  }

  /**
   * Yangi taom yaratish
   */
  async create(dto: CreateMenuItemDto, actor?: Actor) {
    await this.assertCategoryUsable(dto.categoryId);
    const id = generateUUIDv7();
    const deviceId = actor?.deviceId;

    const item = await this.prisma.$transaction(async (tx) => {
      const created = await tx.menuItem.create({
        data: {
          id,
          name: dto.name.trim(),
          nameRu: dto.nameRu,
          description: dto.description,
          imageUrl: dto.imageUrl || null,
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
          changedBy: actor?.username || 'ADMIN',
          reason: 'Dastlabki narx belgilandi',
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.CREATE,
          payload: created as any,
          deviceId,
        },
      });

      await this.audit.log(actor, 'MENU_ITEM_CREATE', { menuItemId: id, name: created.name, price: created.price }, tx);

      return created;
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'created', id });
    return this.enrichWithProfit(item);
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
      ...(includeInactive ? {} : { category: { isActive: true, deletedAt: null } }),
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
   * Taom ma'lumotlarini yangilash.
   * Narx o'zgargan bo'lsa — narx tarixiga ham yoziladi (narx hech qachon izsiz o'zgarmaydi).
   */
  async update(id: string, dto: UpdateMenuItemDto, actor?: Actor) {
    const current = await this.findOne(id);
    if (dto.categoryId && dto.categoryId !== current.categoryId) {
      await this.assertCategoryUsable(dto.categoryId);
    }
    const deviceId = actor?.deviceId;
    const priceChanged = dto.price !== undefined && dto.price !== current.price;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (priceChanged) {
        await tx.priceHistory.create({
          data: {
            id: generateUUIDv7(),
            menuItemId: id,
            oldPrice: current.price,
            newPrice: dto.price!,
            changedBy: actor?.username || 'ADMIN',
            reason: 'Taom tahrirlanganda narx o\'zgartirildi',
            deviceId,
          },
        });
      }

      const row = await tx.menuItem.update({
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
          entity: 'menu_item',
          entityId: id,
          operation: SyncOperation.UPDATE,
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(
        actor,
        'MENU_ITEM_UPDATE',
        {
          menuItemId: id,
          changedFields: Object.keys(dto),
          ...(priceChanged ? { oldPrice: current.price, newPrice: dto.price } : {}),
        },
        tx,
      );

      return row;
    });

    this.events.emitMenuChanged({
      entity: 'menu_item',
      action: priceChanged ? 'price_changed' : 'updated',
      id,
      price: updated.price,
      isAvailable: updated.isAvailable,
    });
    return this.enrichWithProfit(updated);
  }

  /**
   * Taom narxini o'zgartirish va narx tarixiga yozish
   */
  async updatePrice(id: string, dto: UpdatePriceDto, actor?: Actor) {
    const current = await this.findOne(id);
    const deviceId = actor?.deviceId;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.priceHistory.create({
        data: {
          id: generateUUIDv7(),
          menuItemId: id,
          oldPrice: current.price,
          newPrice: dto.newPrice,
          changedBy: actor?.username || 'ADMIN',
          reason: dto.reason || 'Narx qayta belgilandi',
          deviceId,
        },
      });

      const row = await tx.menuItem.update({
        where: { id },
        data: {
          price: dto.newPrice,
          ...(dto.newCostPrice !== undefined ? { costPrice: dto.newCostPrice } : {}),
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
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(
        actor,
        'MENU_ITEM_PRICE_CHANGE',
        { menuItemId: id, name: current.name, oldPrice: current.price, newPrice: dto.newPrice, reason: dto.reason },
        tx,
      );

      return row;
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'price_changed', id, price: updated.price });
    return this.enrichWithProfit(updated);
  }

  /**
   * "Tugadi" yoki "Mavjud" tugmasi (Kassa uchun tezkor switch)
   */
  async toggleAvailability(id: string, isAvailable: boolean, actor?: Actor) {
    const current = await this.findOne(id);
    const deviceId = actor?.deviceId;

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.menuItem.update({
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

      await this.audit.log(
        actor,
        'MENU_ITEM_AVAILABILITY',
        { menuItemId: id, name: current.name, from: current.isAvailable, to: isAvailable },
        tx,
      );

      return row;
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'availability_changed', id, isAvailable });
    return updated;
  }

  /**
   * Taomni o'chirish (Soft-delete) — eski buyurtmalardagi tarix saqlanib qoladi
   */
  async remove(id: string, actor?: Actor) {
    const current = await this.findOne(id);
    const deviceId = actor?.deviceId;

    await this.prisma.$transaction(async (tx) => {
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

      await this.audit.log(actor, 'MENU_ITEM_DELETE', { menuItemId: id, name: current.name }, tx);
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'deleted', id });
    return { success: true, message: 'Taom muvaffaqiyatli o\'chirildi' };
  }

  /**
   * Taom variantini qo'shish (0.5 porsiya, 1 kg va h.k.)
   */
  async addVariant(menuItemId: string, dto: CreateVariantDto, actor?: Actor) {
    await this.findOne(menuItemId);
    const id = generateUUIDv7();
    const deviceId = actor?.deviceId;

    const variant = await this.prisma.$transaction(async (tx) => {
      const row = await tx.menuItemVariant.create({
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
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(actor, 'MENU_VARIANT_CREATE', { menuItemId, variantId: id, name: dto.name, price: dto.price }, tx);
      return row;
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'updated', id: menuItemId });
    return variant;
  }

  /**
   * Taom variantini o'chirish
   */
  async deleteVariant(variantId: string, actor?: Actor) {
    const variant = await this.prisma.menuItemVariant.findFirst({ where: { id: variantId, deletedAt: null } });
    if (!variant) throw new NotFoundException('Variant topilmadi');
    const deviceId = actor?.deviceId;

    await this.prisma.$transaction(async (tx) => {
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

      await this.audit.log(actor, 'MENU_VARIANT_DELETE', { menuItemId: variant.menuItemId, variantId }, tx);
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'updated', id: variant.menuItemId });
    return { success: true, message: 'Variant o\'chirildi' };
  }

  /**
   * Taomga modifier guruh qo'shish
   */
  async addModifierGroup(menuItemId: string, dto: CreateModifierGroupDto, actor?: Actor) {
    await this.findOne(menuItemId);
    const id = generateUUIDv7();
    const deviceId = actor?.deviceId;

    const group = await this.prisma.$transaction(async (tx) => {
      const row = await tx.modifierGroup.create({
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
          payload: row as any,
          deviceId,
        },
      });

      await this.audit.log(actor, 'MENU_MODIFIER_GROUP_CREATE', { menuItemId, groupId: id, name: dto.name }, tx);
      return row;
    });

    this.events.emitMenuChanged({ entity: 'menu_item', action: 'updated', id: menuItemId });
    return group;
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
