import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { StockInDto } from './dto/stock-in.dto';
import { StockWasteDto } from './dto/stock-waste.dto';
import { StockInventoryDto } from './dto/stock-inventory.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { StockMovementType } from '@oshxona/db';
import { generateUUIDv7, SyncOperation } from '@oshxona/shared';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
    private readonly telegramService: TelegramService,
  ) {}

  // -------------------------------------------------------------
  // XOMASHYOLAR (INGREDIENTS) CRUD
  // -------------------------------------------------------------

  async createIngredient(dto: CreateIngredientDto, deviceId?: string) {
    const id = generateUUIDv7();

    const ing = await this.prisma.ingredient.create({
      data: {
        id,
        name: dto.name,
        unit: dto.unit,
        minQty: dto.minQty || 0,
        currentQty: dto.initialQty || 0,
        avgCost: dto.avgCost || 0,
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'ingredient',
        entityId: id,
        operation: SyncOperation.CREATE,
        payload: ing as any,
        deviceId,
      },
    });

    return ing;
  }

  async findAllIngredients(lowStockOnly = false, search?: string) {
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? { name: { contains: search.trim(), mode: 'insensitive' } }
          : {}),
      },
      orderBy: { name: 'asc' },
    });

    const enriched = ingredients.map((item) => {
      const cur = Number(item.currentQty);
      const min = Number(item.minQty);
      return {
        ...item,
        currentQty: cur,
        minQty: min,
        isLowStock: cur <= min,
        totalValue: Math.round(cur * item.avgCost),
      };
    });

    if (lowStockOnly) {
      return enriched.filter((i) => i.isLowStock);
    }

    return enriched;
  }

  async findOneIngredient(id: string) {
    const ing = await this.prisma.ingredient.findFirst({
      where: { id, deletedAt: null },
      include: {
        movements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { supplier: true },
        },
      },
    });

    if (!ing) {
      throw new NotFoundException('Xomashyo topilmadi');
    }

    return {
      ...ing,
      currentQty: Number(ing.currentQty),
      minQty: Number(ing.minQty),
    };
  }

  async updateIngredient(id: string, dto: UpdateIngredientDto, deviceId?: string) {
    await this.findOneIngredient(id);

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...dto,
        version: { increment: 1 },
        deviceId,
      },
    });

    await this.prisma.syncQueue.create({
      data: {
        id: generateUUIDv7(),
        entity: 'ingredient',
        entityId: id,
        operation: SyncOperation.UPDATE,
        payload: updated as any,
        deviceId,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------
  // OMBOR HARAKATLARI (KIRIM, ISROF, INVENTARIZATSIYA)
  // -------------------------------------------------------------

  /**
   * Kirim qilish (Stock In) — o'rtacha og'irlikdagi tannarxni qayta hisoblaydi
   */
  async stockIn(dto: StockInDto, deviceId?: string) {
    const ing = await this.findOneIngredient(dto.ingredientId);

    const currentQty = Number(ing.currentQty);
    const inQty = dto.quantity;
    const inUnitCost = dto.unitCost;
    const newQty = currentQty + inQty;

    // O'rtacha og'irlikdagi tannarx (Weighted average cost)
    let newAvgCost = ing.avgCost;
    if (newQty > 0) {
      const totalCurrentCost = currentQty * ing.avgCost;
      const totalInCost = inQty * inUnitCost;
      newAvgCost = Math.round((totalCurrentCost + totalInCost) / newQty);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Qoldiq va yangi o'rtacha tannarxni yangilash
      const updatedIng = await tx.ingredient.update({
        where: { id: ing.id },
        data: {
          currentQty: newQty,
          avgCost: newAvgCost,
          version: { increment: 1 },
          deviceId,
        },
      });

      // 2. Harakatlar tarixiga yozish
      const movement = await tx.stockMovement.create({
        data: {
          id: generateUUIDv7(),
          ingredientId: ing.id,
          type: StockMovementType.IN,
          quantity: inQty,
          unitCost: inUnitCost,
          totalCost: Math.round(inQty * inUnitCost),
          supplierId: dto.supplierId,
          reason: dto.reason || 'Omborga kirim qilindi',
          deviceId,
        },
      });

      // 3. Outbox Sync
      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'stock_movement',
          entityId: movement.id,
          operation: SyncOperation.CREATE,
          payload: movement as any,
          deviceId,
        },
      });

      return {
        success: true,
        message: 'Kirim muvaffaqiyatli qabul qilindi',
        ingredient: updatedIng.name,
        previousQty: currentQty,
        newQty,
        avgCost: newAvgCost,
      };
    });
  }

  /**
   * Isrof / Chiqit (Stock Waste)
   */
  async stockWaste(dto: StockWasteDto, deviceId?: string) {
    const ing = await this.findOneIngredient(dto.ingredientId);
    const currentQty = Number(ing.currentQty);

    if (currentQty < dto.quantity) {
      throw new BadRequestException(
        `Omborda yetarli qoldiq yo'q! Mavjud: ${currentQty} ${ing.unit}, chiqarilmoqda: ${dto.quantity} ${ing.unit}`,
      );
    }

    const newQty = currentQty - dto.quantity;

    return this.prisma.$transaction(async (tx) => {
      const updatedIng = await tx.ingredient.update({
        where: { id: ing.id },
        data: {
          currentQty: newQty,
          version: { increment: 1 },
          deviceId,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          id: generateUUIDv7(),
          ingredientId: ing.id,
          type: StockMovementType.WASTE,
          quantity: dto.quantity,
          unitCost: ing.avgCost,
          totalCost: Math.round(dto.quantity * ing.avgCost),
          reason: dto.reason,
          deviceId,
        },
      });

      await tx.syncQueue.create({
        data: {
          id: generateUUIDv7(),
          entity: 'stock_movement',
          entityId: movement.id,
          operation: SyncOperation.CREATE,
          payload: movement as any,
          deviceId,
        },
      });

      // Minimal qoldiq tekshiruvi va ogohlantirish
      if (newQty <= Number(ing.minQty)) {
        this.eventsGateway.emitStockLow({
          ingredientId: ing.id,
          name: ing.name,
          currentQty: newQty,
          minQty: Number(ing.minQty),
          unit: ing.unit,
        });

        this.telegramService.sendLowStockAlert({
          name: ing.name,
          currentStock: newQty,
          minStock: Number(ing.minQty),
          unit: ing.unit,
        }).catch(() => {});
      }

      return {
        success: true,
        message: 'Chiqitga chiqarildi',
        ingredient: updatedIng.name,
        newQty,
      };
    });
  }

  /**
   * Inventarizatsiya (Stock Inventory)
   */
  async stockInventory(dto: StockInventoryDto, deviceId?: string) {
    const results: any[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const ing = await tx.ingredient.findUnique({
          where: { id: item.ingredientId },
        });
        if (!ing) continue;

        const currentQty = Number(ing.currentQty);
        const actualQty = item.actualQty;
        const diff = actualQty - currentQty;

        if (diff !== 0) {
          await tx.ingredient.update({
            where: { id: ing.id },
            data: {
              currentQty: actualQty,
              version: { increment: 1 },
              deviceId,
            },
          });

          await tx.stockMovement.create({
            data: {
              id: generateUUIDv7(),
              ingredientId: ing.id,
              type: StockMovementType.ADJUST,
              quantity: Math.abs(diff),
              unitCost: ing.avgCost,
              totalCost: Math.round(Math.abs(diff) * ing.avgCost),
              reason: dto.reason || (diff > 0 ? `Ortiqcha topildi: +${diff}` : `Kamomad aniqlandi: ${diff}`),
              deviceId,
            },
          });
        }

        results.push({
          name: ing.name,
          previousQty: currentQty,
          actualQty,
          difference: diff,
        });
      }
    });

    return {
      success: true,
      message: 'Inventarizatsiya muvaffaqiyatli yakunlandi',
      results,
    };
  }

  /**
   * Buyurtma to'langanda avtomatik ombordan chiqim qilish (Retsept bo'yicha)
   */
  /**
   * To'lovdan so'ng retsept bo'yicha xomashyoni ombordan chiqarish.
   *
   * - Chaqiruvchining tranzaksiyasida (`tx`) ishlaydi: to'lov va ombor harakati birga commit/rollback.
   * - Qoldiq atomik `decrement` bilan kamaytiriladi (parallel to'lovlarda yo'qolgan yangilanish yo'q).
   * - STOCK_ALLOW_NEGATIVE=false bo'lsa, yetarli xomashyo bo'lmaganda to'lov rad etiladi.
   * @returns minimal qoldiqdan tushgan xomashyolar (ogohlantirish commit'dan keyin yuboriladi)
   */
  async deductStockForOrder(orderId: string, deviceId: string | undefined, tx: any) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          where: { deletedAt: null, status: { not: 'CANCELLED' } },
          include: {
            menuItem: {
              include: {
                recipes: {
                  where: { deletedAt: null },
                  include: { items: { where: { deletedAt: null }, include: { ingredient: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!order) return [];

    const allowNegativeSetting = await tx.setting.findUnique({ where: { key: 'STOCK_ALLOW_NEGATIVE' } });
    const allowNegative = (allowNegativeSetting?.value ?? 'true') !== 'false';

    // Bir xil xomashyoni bitta harakatga yig'ish
    const totals = new Map<string, { ing: any; qty: number; lines: string[] }>();
    for (const orderItem of order.items) {
      const recipe = orderItem.menuItem.recipes?.[0];
      if (!recipe) continue;
      for (const rItem of recipe.items) {
        const qty = Number(rItem.quantity) * Number(orderItem.quantity);
        const cur = totals.get(rItem.ingredientId) ?? { ing: rItem.ingredient, qty: 0, lines: [] };
        cur.qty += qty;
        cur.lines.push(orderItem.name);
        totals.set(rItem.ingredientId, cur);
      }
    }

    const low: { ingredientId: string; name: string; currentQty: number; minQty: number; unit: string }[] = [];
    for (const [ingredientId, { ing, qty, lines }] of totals) {
      const deductQty = Math.round(qty * 1000) / 1000;
      if (!allowNegative) {
        const moved = await tx.ingredient.updateMany({
          where: { id: ingredientId, currentQty: { gte: deductQty } },
          data: { currentQty: { decrement: deductQty }, version: { increment: 1 }, deviceId },
        });
        if (moved.count === 0) {
          throw new BadRequestException(`Omborda "${ing.name}" yetarli emas (kerak: ${deductQty} ${ing.unit})`);
        }
      } else {
        await tx.ingredient.update({
          where: { id: ingredientId },
          data: { currentQty: { decrement: deductQty }, version: { increment: 1 }, deviceId },
        });
      }

      await tx.stockMovement.create({
        data: {
          id: generateUUIDv7(),
          ingredientId,
          type: StockMovementType.OUT_SALE,
          quantity: deductQty,
          unitCost: ing.avgCost,
          totalCost: Math.round(deductQty * ing.avgCost),
          reason: `Sotuv: #${order.orderNumber} (${[...new Set(lines)].join(', ')})`,
          deviceId,
        },
      });

      const after = await tx.ingredient.findUnique({ where: { id: ingredientId } });
      if (after && Number(after.currentQty) <= Number(after.minQty)) {
        low.push({
          ingredientId,
          name: after.name,
          currentQty: Number(after.currentQty),
          minQty: Number(after.minQty),
          unit: after.unit,
        });
      }
    }
    return low;
  }

  /** Commit'dan keyin: kam qolgan xomashyo haqida real-vaqt va Telegram ogohlantirishi */
  notifyLowStock(low: { ingredientId: string; name: string; currentQty: number; minQty: number; unit: string }[]) {
    for (const l of low) {
      this.eventsGateway.emitStockLow(l);
      this.telegramService
        .sendLowStockAlert({ name: l.name, currentStock: l.currentQty, minStock: l.minQty, unit: l.unit })
        .catch(() => {});
    }
  }

  // -------------------------------------------------------------
  // RETSEPTLAR (RECIPES)
  // -------------------------------------------------------------

  async createRecipe(dto: CreateRecipeDto, deviceId?: string) {
    const recipeId = generateUUIDv7();

    return this.prisma.$transaction(async (tx) => {
      // Mavjud eski retseptlarni nofaol qilish
      await tx.recipe.updateMany({
        where: { menuItemId: dto.menuItemId, deletedAt: null },
        data: { deletedAt: new Date(), deviceId },
      });

      const recipe = await tx.recipe.create({
        data: {
          id: recipeId,
          menuItemId: dto.menuItemId,
          description: dto.description,
          deviceId,
        },
      });

      let totalCalculatedCost = 0;

      for (const item of dto.items) {
        const ing = await tx.ingredient.findUnique({ where: { id: item.ingredientId } });
        if (ing) {
          totalCalculatedCost += Math.round(Number(item.quantity) * ing.avgCost);
        }

        await tx.recipeItem.create({
          data: {
            id: generateUUIDv7(),
            recipeId,
            ingredientId: item.ingredientId,
            quantity: item.quantity,
            deviceId,
          },
        });
      }

      // Taomning avtomatik tannarxini retsept bo'yicha yangilash
      await tx.menuItem.update({
        where: { id: dto.menuItemId },
        data: { costPrice: totalCalculatedCost, deviceId },
      });

      return {
        ...recipe,
        calculatedCostPrice: totalCalculatedCost,
      };
    });
  }

  async getRecipe(menuItemId: string) {
    return this.prisma.recipe.findFirst({
      where: { menuItemId, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          include: { ingredient: true },
        },
      },
    });
  }

  // -------------------------------------------------------------
  // YETKAZIB BERUVCHILAR (SUPPLIERS)
  // -------------------------------------------------------------

  async createSupplier(dto: CreateSupplierDto, deviceId?: string) {
    const id = generateUUIDv7();
    return this.prisma.supplier.create({
      data: { id, ...dto, deviceId },
    });
  }

  async findAllSuppliers() {
    return this.prisma.supplier.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  // -------------------------------------------------------------
  // HARAKATLAR RO'YXATI (MOVEMENTS)
  // -------------------------------------------------------------

  async getMovements(params: {
    ingredientId?: string;
    type?: StockMovementType;
    supplierId?: string;
  }) {
    return this.prisma.stockMovement.findMany({
      where: {
        deletedAt: null,
        ...(params.ingredientId ? { ingredientId: params.ingredientId } : {}),
        ...(params.type ? { type: params.type } : {}),
        ...(params.supplierId ? { supplierId: params.supplierId } : {}),
      },
      include: {
        ingredient: { select: { id: true, name: true, unit: true } },
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
