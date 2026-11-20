import { Injectable } from '@nestjs/common';
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
}
