import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentMethod, TableStatus } from '@oshxona/db';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Boshqaruv paneli (Dashboard) uchun bugungi tezkor ma'lumotlar
   */
  async getDashboardSummary() {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Bugungi to'langan buyurtmalar
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: 'PAID',
        deletedAt: null,
      },
      include: {
        payments: { where: { deletedAt: null } },
      },
    });

    const todayRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const orderCount = orders.length;
    const averageCheck = orderCount > 0 ? Math.round(todayRevenue / orderCount) : 0;

    // 2. Ochiq stollar soni
    const openTablesCount = await this.prisma.table.count({
      where: { status: TableStatus.OCCUPIED, deletedAt: null },
    });

    const totalTablesCount = await this.prisma.table.count({
      where: { deletedAt: null },
    });

    // 3. Kam qolgan xomashyolar soni
    const ingredients = await this.prisma.ingredient.findMany({
      where: { deletedAt: null },
      select: { currentQty: true, minQty: true },
    });
    const lowStockCount = ingredients.filter(
      (i) => Number(i.currentQty) <= Number(i.minQty),
    ).length;

    // 4. To'lov usullari bo'yicha taqsimot
    let cash = 0, card = 0, click = 0, payme = 0, debt = 0;
    for (const order of orders) {
      for (const p of order.payments) {
        if (p.method === PaymentMethod.CASH) cash += p.amount;
        else if (p.method === PaymentMethod.CARD) card += p.amount;
        else if (p.method === PaymentMethod.CLICK) click += p.amount;
        else if (p.method === PaymentMethod.PAYME) paymeSales(p.amount);
        else if (p.method === PaymentMethod.DEBT) debt += p.amount;
      }
    }

    function paymeSales(amount: number) {
      payme += amount;
    }

    return {
      todayRevenue,
      orderCount,
      averageCheck,
      openTables: `${openTablesCount} / ${totalTablesCount}`,
      openTablesCount,
      totalTablesCount,
      lowStockCount,
      paymentsDistribution: { cash, card, click, payme, debt },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Savdo tahlili (Kunlik / Haftalik / Oylik grafik)
   */
  async getSalesReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'PAID',
        deletedAt: null,
      },
      select: {
        id: true,
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const grouped: Record<string, { date: string; revenue: number; count: number }> = {};

    for (const o of orders) {
      const dStr = o.createdAt.toISOString().slice(0, 10);
      if (!grouped[dStr]) {
        grouped[dStr] = { date: dStr, revenue: 0, count: 0 };
      }
      grouped[dStr].revenue += o.total;
      grouped[dStr].count += 1;
    }

    return Object.values(grouped);
  }

  /**
   * Eng ko'p sotilgan TOP-10 taomlar
   */
  async getTopDishes(limit = 10, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          status: 'PAID',
        },
        deletedAt: null,
      },
      select: {
        menuItemId: true,
        name: true,
        quantity: true,
        totalPrice: true,
      },
    });

    const map: Record<string, { id: string; name: string; quantity: number; revenue: number }> = {};

    for (const item of orderItems) {
      if (!map[item.menuItemId]) {
        map[item.menuItemId] = {
          id: item.menuItemId,
          name: item.name.split(' (')[0], // asosiy nom
          quantity: 0,
          revenue: 0,
        };
      }
      map[item.menuItemId].quantity += Number(item.quantity);
      map[item.menuItemId].revenue += item.totalPrice;
    }

    return Object.values(map)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  }

  /**
   * Kassirlar bo'yicha savdo ko'rsatkichi
   */
  async getCashiersPerformance(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        status: 'PAID',
        deletedAt: null,
      },
      include: {
        cashier: { select: { id: true, name: true, username: true } },
      },
    });

    const map: Record<string, { id: string; name: string; revenue: number; orderCount: number }> = {};

    for (const o of orders) {
      const cId = o.cashierId;
      if (!map[cId]) {
        map[cId] = {
          id: cId,
          name: o.cashier?.name || 'Noma\'lum',
          revenue: 0,
          orderCount: 0,
        };
      }
      map[cId].revenue += o.total;
      map[cId].orderCount += 1;
    }

    return Object.values(map);
  }

  /**
   * Sof foyda hisoboti (Tushum - Tannarx - Kassa Xarajatlari)
   */
  async getProfitReport(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Tushum va sotilgan taomlar tannarxi
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: start, lte: end }, status: 'PAID' },
        deletedAt: null,
      },
      select: {
        totalPrice: true,
        costPrice: true,
        quantity: true,
      },
    });

    let totalRevenue = 0;
    let totalCost = 0;

    for (const item of orderItems) {
      totalRevenue += item.totalPrice;
      totalCost += Math.round(item.costPrice * Number(item.quantity));
    }

    // 2. Kassa xarajatlari
    const expenses = await this.prisma.cashMovement.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        type: 'EXPENSE',
        deletedAt: null,
      },
      select: { amount: true },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const grossProfit = totalRevenue - totalCost; // Yalpi foyda
    const netProfit = grossProfit - totalExpenses; // Sof foyda
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalCost,
      totalExpenses,
      grossProfit,
      netProfit,
      profitMargin,
    };
  }

  /**
   * Soatlik mijozlar yuklamasi (08:00 dan 23:00 gacha)
   */
  async getHourlyLoad(dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: dayStart, lte: dayEnd },
        deletedAt: null,
      },
      select: { createdAt: true, total: true },
    });

    const hourlyMap: Record<number, { hour: string; count: number; revenue: number }> = {};
    for (let h = 8; h <= 23; h++) {
      const hStr = `${String(h).padStart(2, '0')}:00`;
      hourlyMap[h] = { hour: hStr, count: 0, revenue: 0 };
    }

    for (const o of orders) {
      const hour = o.createdAt.getHours();
      if (hourlyMap[hour]) {
        hourlyMap[hour].count += 1;
        hourlyMap[hour].revenue += o.total;
      }
    }

    return Object.values(hourlyMap);
  }

  /**
   * Hisobotlarni Excel (.csv/.xlsx) va PDF formatida eksport qilish
   */
  async exportReport(type: 'sales' | 'top-items' | 'profit' | 'debts', format: 'xlsx' | 'pdf' = 'xlsx') {
    if (type === 'sales') {
      const data = await this.getSalesReport();
      const csvHeader = 'Sana,Tushum (so\'m),Cheklar soni\n';
      const csvRows = data.map((d) => `${d.date},${d.revenue},${d.count}`).join('\n');
      return {
        filename: `savdo_hisoboti_${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: '\uFEFF' + csvHeader + csvRows, // UTF-8 BOM for Excel
      };
    } else if (type === 'top-items') {
      const data = await this.getTopDishes(20);
      const csvHeader = 'Taom nomi,Sotilgan miqdor,Jami tushum (so\'m)\n';
      const csvRows = data.map((d) => `"${d.name}",${d.quantity},${d.revenue}`).join('\n');
      return {
        filename: `top_taomlar_${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: '\uFEFF' + csvHeader + csvRows,
      };
    } else if (type === 'debts') {
      const customers = await this.prisma.customer.findMany({
        where: { debtBalance: { gt: 0 }, deletedAt: null },
      });
      const csvHeader = 'Mijoz ismi,Telefon raqami,Qarzdorlik summasi (so\'m)\n';
      const csvRows = customers.map((c) => `"${c.name}",${c.phone},${c.debtBalance}`).join('\n');
      return {
        filename: `qarzdorlar_royxati_${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: '\uFEFF' + csvHeader + csvRows,
      };
    } else {
      const profit = await this.getProfitReport();
      const csvHeader = 'Ko\'rsatkich,Summa (so\'m)\n';
      const rows = [
        `Jami tushum,${profit.totalRevenue}`,
        `Tannarx sarfi,${profit.totalCost}`,
        `Kassa xarajatlari,${profit.totalExpenses}`,
        `Yalpi foyda,${profit.grossProfit}`,
        `Sof foyda,${profit.netProfit}`,
        `Rentabellik (marja),${profit.profitMargin}%`,
      ].join('\n');
      return {
        filename: `foyda_hisoboti_${new Date().toISOString().slice(0, 10)}.csv`,
        contentType: 'text/csv; charset=utf-8',
        data: '\uFEFF' + csvHeader + rows,
      };
    }
  }

  /**
   * Yagona moliyaviy xulosa (Admin dashboard va hisobotlar uchun).
   *
   * Ta'riflar (barcha summalar so'mda, server hisobi):
   *  - Tushum (revenue)  = davrda YARATILGAN va holati PAID bo'lgan buyurtmalar `total` yig'indisi.
   *  - Qaytarilgan (refunds) = davrdagi REFUNDED buyurtmalar (tushumga kirmaydi).
   *  - Chegirma / xizmat haqi = PAID buyurtmalardagi qiymatlar yig'indisi.
   *  - To'lov turlari = PAID buyurtmalarga bog'liq to'lovlar (amount), naqd uchun qaytim hisobga olinmaydi.
   *  - Tannarx = sotuv paytidagi muzlatilgan orderItem.costPrice × miqdor. `costCoverage` — tannarxi
   *    kiritilgan taomlar ulushi (100% bo'lmasa foyda taxminiy).
   *  - Xarajatlar = kassa smenalaridagi EXPENSE harakatlari.
   */
  async getSummary(fromStr?: string, toStr?: string) {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr ? new Date(fromStr) : new Date(new Date(to).setHours(0, 0, 0, 0));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
      throw new BadRequestException('Sana oralig\'i noto\'g\'ri');
    }
    if (to.getTime() - from.getTime() > 400 * 24 * 3600 * 1000) {
      throw new BadRequestException('Oraliq 400 kundan oshmasligi kerak');
    }
    const range = { gte: from, lt: to };
    const paidWhere = { deletedAt: null, status: 'PAID' as const, createdAt: range };

    const [paidAgg, refundAgg, cancelledCount, payments, items, cashierRows, recent, lowStock, activeTables, expenses, shifts] =
      await Promise.all([
        this.prisma.order.aggregate({ where: paidWhere, _sum: { total: true, subtotal: true, discount: true, serviceFee: true }, _count: true }),
        this.prisma.order.aggregate({ where: { deletedAt: null, status: 'REFUNDED', createdAt: range }, _sum: { total: true }, _count: true }),
        this.prisma.order.count({ where: { deletedAt: null, status: 'CANCELLED', createdAt: range } }),
        this.prisma.payment.groupBy({ by: ['method'], where: { deletedAt: null, order: paidWhere }, _sum: { amount: true }, _count: true }),
        this.prisma.orderItem.findMany({
          where: { deletedAt: null, status: { not: 'CANCELLED' }, order: paidWhere },
          select: { menuItemId: true, name: true, quantity: true, totalPrice: true, costPrice: true, menuItem: { select: { name: true, category: { select: { id: true, name: true } } } } },
        }),
        this.prisma.order.groupBy({ by: ['cashierId'], where: paidWhere, _sum: { total: true }, _count: true }),
        this.prisma.order.findMany({
          where: { deletedAt: null, createdAt: range },
          select: { id: true, orderNumber: true, status: true, type: true, total: true, createdAt: true, table: { select: { name: true } }, cashier: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        this.prisma.$queryRaw<{ id: string; name: string; currentQty: number; minQty: number; unit: string }[]>`
          SELECT id, name, "currentQty"::float AS "currentQty", "minQty"::float AS "minQty", unit::text AS unit
          FROM ingredients WHERE "deletedAt" IS NULL AND "currentQty" <= "minQty" ORDER BY name LIMIT 50`,
        this.prisma.order.findMany({
          where: { deletedAt: null, status: { in: ['OPEN', 'SENT'] }, tableId: { not: null } },
          select: { tableId: true, total: true },
        }),
        this.prisma.cashMovement.aggregate({ where: { deletedAt: null, type: 'EXPENSE', createdAt: range }, _sum: { amount: true }, _count: true }),
        this.prisma.shift.findMany({
          where: { deletedAt: null, openedAt: { lt: to }, OR: [{ closedAt: null }, { closedAt: { gte: from } }] },
          select: { id: true, openedAt: true, closedAt: true, startingCash: true, expectedCash: true, actualCash: true, cashDifference: true, totalSales: true, user: { select: { name: true } } },
          orderBy: { openedAt: 'desc' },
          take: 50,
        }),
      ]);

    // Mahsulot va kategoriya bo'yicha
    const byProduct = new Map<string, { menuItemId: string; name: string; category: string; quantity: number; revenue: number; cost: number }>();
    const byCategory = new Map<string, { categoryId: string; name: string; quantity: number; revenue: number }>();
    let cost = 0;
    let costedRevenue = 0;
    let revenueFromItems = 0;
    for (const it of items) {
      const q = Number(it.quantity);
      const lineCost = Math.round(it.costPrice * q);
      cost += lineCost;
      revenueFromItems += it.totalPrice;
      if (it.costPrice > 0) costedRevenue += it.totalPrice;
      const p = byProduct.get(it.menuItemId) ?? { menuItemId: it.menuItemId, name: it.menuItem?.name || it.name, category: it.menuItem?.category?.name || '—', quantity: 0, revenue: 0, cost: 0 };
      p.quantity += q;
      p.revenue += it.totalPrice;
      p.cost += lineCost;
      byProduct.set(it.menuItemId, p);
      const cat = it.menuItem?.category;
      if (cat) {
        const c = byCategory.get(cat.id) ?? { categoryId: cat.id, name: cat.name, quantity: 0, revenue: 0 };
        c.quantity += q;
        c.revenue += it.totalPrice;
        byCategory.set(cat.id, c);
      }
    }

    const cashierNames = await this.prisma.user.findMany({
      where: { id: { in: cashierRows.map((c) => c.cashierId) } },
      select: { id: true, name: true },
    });
    const nameOf = new Map(cashierNames.map((u) => [u.id, u.name]));

    // Kunlik trend (server vaqti bo'yicha)
    const paidOrders = await this.prisma.order.findMany({ where: paidWhere, select: { createdAt: true, total: true } });
    const daily = new Map<string, { date: string; revenue: number; orders: number }>();
    const hourly = Array.from({ length: 24 }, (_, h) => ({ hour: h, revenue: 0, orders: 0 }));
    for (const o of paidOrders) {
      const d = new Date(o.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const row = daily.get(key) ?? { date: key, revenue: 0, orders: 0 };
      row.revenue += o.total;
      row.orders += 1;
      daily.set(key, row);
      hourly[d.getHours()].revenue += o.total;
      hourly[d.getHours()].orders += 1;
    }

    const revenue = paidAgg._sum.total ?? 0;
    const ordersCount = paidAgg._count;
    const expensesTotal = expenses._sum.amount ?? 0;
    const costCoverage = revenueFromItems > 0 ? Math.round((costedRevenue / revenueFromItems) * 100) : 0;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      revenue,
      ordersCount,
      averageCheck: ordersCount ? Math.round(revenue / ordersCount) : 0,
      subtotal: paidAgg._sum.subtotal ?? 0,
      discounts: paidAgg._sum.discount ?? 0,
      serviceFees: paidAgg._sum.serviceFee ?? 0,
      refunds: { count: refundAgg._count, amount: refundAgg._sum.total ?? 0 },
      cancelledCount,
      payments: payments.map((p) => ({ method: p.method, amount: p._sum.amount ?? 0, count: p._count })).sort((a, b) => b.amount - a.amount),
      topProducts: [...byProduct.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 15),
      byCategory: [...byCategory.values()].sort((a, b) => b.revenue - a.revenue),
      byCashier: cashierRows
        .map((c) => ({ cashierId: c.cashierId, name: nameOf.get(c.cashierId) || '—', orders: c._count, revenue: c._sum.total ?? 0 }))
        .sort((a, b) => b.revenue - a.revenue),
      daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)),
      hourly,
      cost,
      costCoverage,
      grossProfit: revenueFromItems - cost,
      expenses: { count: expenses._count, amount: expensesTotal },
      netAfterExpenses: revenueFromItems - cost - expensesTotal,
      lowStock,
      activeTables: { count: new Set(activeTables.map((t) => t.tableId)).size, openTotal: activeTables.reduce((s, t) => s + t.total, 0) },
      recentOrders: recent,
      shifts,
    };
  }
}
