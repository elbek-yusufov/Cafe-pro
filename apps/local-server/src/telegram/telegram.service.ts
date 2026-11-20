import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatCurrency } from '@oshxona/shared';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getConfig() {
    // 1. .env dan tekshirish
    let token = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    // 2. Agar .env da bo'lmasa, ma'lumotlar bazasining Setting jadvalidan olish
    if (!token || !chatId) {
      try {
        const tokenSetting = await this.prisma.setting.findFirst({
          where: { key: 'telegram_bot_token' },
        });
        const chatSetting = await this.prisma.setting.findFirst({
          where: { key: 'telegram_chat_id' },
        });

        if (tokenSetting) token = tokenSetting.value;
        if (chatSetting) chatId = chatSetting.value;
      } catch (err) {
        // DB ulanmagan bo'lsa
      }
    }

    return { token, chatId };
  }

  /**
   * Telegram Bot orqali matnli xabar yuborish
   */
  async sendMessage(text: string): Promise<boolean> {
    const { token, chatId } = await this.getConfig();

    if (!token || !chatId) {
      this.logger.debug('Telegram Bot token yoki Chat ID sozlanmagan, xabar yuborilmadi.');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const resJson = (await response.json()) as any;
      if (!resJson.ok) {
        this.logger.warn(`Telegram xatolik: ${resJson.description}`);
        return false;
      }

      return true;
    } catch (err: any) {
      this.logger.error(`Telegram xabar yuborishda tarmoq xatosi: ${err.message}`);
      return false;
    }
  }

  /**
   * Smena yopilganda Z-Report hisobotini Telegram guruh/rahbarga yuborish
   */
  async sendZReportSummary(summary: {
    shiftId: string;
    branchName?: string;
    cashierName: string;
    openedAt: Date | string;
    closedAt: Date | string;
    totalSales: number;
    cashAmount: number;
    cardAmount: number;
    clickAmount: number;
    paymeAmount: number;
    debtAmount: number;
    receiptCount: number;
    expectedCash: number;
    actualCash: number;
    difference: number;
  }) {
    const timeStr = new Date(summary.closedAt).toLocaleString('uz-UZ', {
      timeZone: 'Asia/Tashkent',
    });

    const diffIcon = summary.difference === 0 ? '✅' : summary.difference > 0 ? '📈 Ortish' : '📉 Kamomad';
    const diffText = summary.difference === 0
      ? '0 so\'m (To\'liq mos)'
      : `${diffIcon}: ${formatCurrency(summary.difference)}`;

    const text = `
<b>📊 Z-HISOBOT (Smena yopildi)</b>
🏢 Filial: <b>${summary.branchName || 'Asosiy filial'}</b>
👤 Kassir: <b>${summary.cashierName}</b>
⏰ Vaqt: <b>${timeStr}</b>
━━━━━━━━━━━━━━━━━━
💰 <b>JAMI TUSHUM:</b> <code>${formatCurrency(summary.totalSales)}</code>

💵 Naqd: <code>${formatCurrency(summary.cashAmount)}</code>
💳 Terminal/Karta: <code>${formatCurrency(summary.cardAmount)}</code>
📱 Click: <code>${formatCurrency(summary.clickAmount)}</code>
📲 Payme: <code>${formatCurrency(summary.paymeAmount)}</code>
📝 Nasiya: <code>${formatCurrency(summary.debtAmount)}</code>
🧾 Cheklar soni: <b>${summary.receiptCount} ta</b>
━━━━━━━━━━━━━━━━━━
💼 <b>Kassadagi kutilgan naqd:</b> <code>${formatCurrency(summary.expectedCash)}</code>
📥 <b>Haqiqatda topshirildi:</b> <code>${formatCurrency(summary.actualCash)}</code>
⚖️ <b>Tafovut:</b> <b>${diffText}</b>
`;

    return this.sendMessage(text.trim());
  }

  /**
   * Ombor qoldig'i kritik darajadan kamayganda ogohlantirish
   */
  async sendLowStockAlert(ingredient: {
    name: string;
    currentStock: number;
    minStock: number;
    unit: string;
  }) {
    const text = `
<b>⚠️ OMBORDA MASALLIQ KAM QOLDI!</b>
🥩 Masalliq: <b>${ingredient.name}</b>
📉 Hozirgi qoldiq: <b>${ingredient.currentStock} ${ingredient.unit}</b>
🛑 Minimal me'yor: <b>${ingredient.minStock} ${ingredient.unit}</b>
━━━━━━━━━━━━━━━━━━
<i>Iltimos, taomlar to'xtab qolmasligi uchun zudlik bilan xarid qiling!</i>
`;

    return this.sendMessage(text.trim());
  }

  /**
   * Buyurtma bekor qilinganda xabardor qilish
   */
  async sendCancellationAlert(params: {
    orderNumber: string;
    totalAmount: number;
    cashierName: string;
    reason: string;
  }) {
    const text = `
<b>🛑 BUYURTMA BEKOR QILINDI!</b>
🧾 Chek raqami: <b>#${params.orderNumber}</b>
💸 Summa: <code>${formatCurrency(params.totalAmount)}</code>
👤 Mas'ul xodim: <b>${params.cashierName}</b>
📝 Bekor qilish sababi: <i>${params.reason}</i>
⏰ Vaqt: <b>${new Date().toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</b>
`;

    return this.sendMessage(text.trim());
  }

  /**
   * Mehmon tomonidan ofitsiant chaqirilganda yoki hisob so'ralganda
   */
  async sendCallStaffAlert(tableName: string, requestType: 'WAITER' | 'BILL') {
    const icon = requestType === 'BILL' ? '🧾 HISOB SO\'RALDI' : '🔔 OFITSIANT CHAQIRILDI';
    const text = `
<b>${icon}</b>
🍽 Stol: <b>${tableName}</b>
⏰ Vaqt: <b>${new Date().toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent' })}</b>
`;
    return this.sendMessage(text.trim());
  }
}
