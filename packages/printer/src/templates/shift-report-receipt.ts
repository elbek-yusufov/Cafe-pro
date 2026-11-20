import { formatCurrency } from '@oshxona/shared';

export interface ShiftReportParams {
  type: 'X_REPORT' | 'Z_REPORT';
  restaurantName: string;
  shiftId: string;
  cashierName: string;
  openedAt: Date | string;
  closedAt?: Date | string | null;
  paperWidth?: 58 | 80;
  startingCash: number;
  totalSales: number;
  ordersCount: number;
  averageCheck: number;
  payments: {
    cash: number;
    card: number;
    click: number;
    payme: number;
    debt: number;
  };
  cashMovements: {
    deposits: number;
    withdrawals: number;
    expenses: number;
  };
  expectedCash: number;
  actualCash: number;
  cashDifference: number; // actualCash - expectedCash
}

export function formatShiftReport(params: ShiftReportParams): string {
  const {
    type,
    restaurantName,
    shiftId,
    cashierName,
    openedAt,
    closedAt,
    paperWidth = 80,
    startingCash,
    totalSales,
    ordersCount,
    averageCheck,
    payments,
    cashMovements,
    expectedCash,
    actualCash,
    cashDifference,
  } = params;

  const width = paperWidth === 58 ? 32 : 42;
  const line = '='.repeat(width);
  const subLine = '-'.repeat(width);

  const padCenter = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const padBetween = (left: string, right: string) => {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const lines: string[] = [];

  const title = type === 'Z_REPORT' ? 'Z-HISOBOT (SMENA YOPILISHI)' : 'X-HISOBOT (ORALIQ KO\'ZDAN KECHIRISH)';
  lines.push(line);
  lines.push(padCenter(`🍽️ "${restaurantName.toUpperCase()}"`));
  lines.push(padCenter(title));
  lines.push(line);

  const openDate = new Date(openedAt);
  const openStr = openDate.toLocaleDateString('uz-UZ') + ' ' + openDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
  lines.push(padBetween('Kassir:', cashierName));
  lines.push(padBetween('Ochilgan vaqt:', openStr));

  if (closedAt) {
    const closeDate = new Date(closedAt);
    const closeStr = closeDate.toLocaleDateString('uz-UZ') + ' ' + closeDate.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
    lines.push(padBetween('Yopilgan vaqt:', closeStr));
  } else {
    lines.push(padBetween('Holat:', 'Ochiq (Aktiv)'));
  }

  lines.push(subLine);
  lines.push(padCenter('📊 SAVDO NATIJALARI'));
  lines.push(subLine);

  lines.push(padBetween('Jami tushum:', formatCurrency(totalSales)));
  lines.push(padBetween('Buyurtmalar soni:', `${ordersCount} ta`));
  lines.push(padBetween('O\'rtacha chek:', formatCurrency(averageCheck)));

  lines.push(subLine);
  lines.push(padCenter('💳 TO\'LOV TURLARI BO\'YICHA'));
  lines.push(subLine);

  lines.push(padBetween('1. Naqd pul (CASH):', formatCurrency(payments.cash)));
  lines.push(padBetween('2. Karta (Uzcard/Humo):', formatCurrency(payments.card)));
  lines.push(padBetween('3. Click:', formatCurrency(payments.click)));
  lines.push(padBetween('4. Payme:', formatCurrency(payments.payme)));
  lines.push(padBetween('5. Nasiya (Qarzga):', formatCurrency(payments.debt)));

  lines.push(subLine);
  lines.push(padCenter('💰 KASSA HARAKATLARI VA BALANS'));
  lines.push(subLine);

  lines.push(padBetween('Boshlang\'ich naqd pul:', formatCurrency(startingCash)));
  lines.push(padBetween('+ Naqd savdo:', formatCurrency(payments.cash)));

  if (cashMovements.deposits > 0) {
    lines.push(padBetween('+ Kassaga kirim (Deposit):', formatCurrency(cashMovements.deposits)));
  }
  if (cashMovements.withdrawals > 0) {
    lines.push(padBetween('- Inkassatsiya (Chiqim):', formatCurrency(cashMovements.withdrawals)));
  }
  if (cashMovements.expenses > 0) {
    lines.push(padBetween('- Kassa xarajatlari:', formatCurrency(cashMovements.expenses)));
  }

  lines.push(subLine);
  lines.push(padBetween('Kutilgan naqd pul:', formatCurrency(expectedCash)));

  if (type === 'Z_REPORT') {
    lines.push(padBetween('Haqiqiy sanalgan naqd:', formatCurrency(actualCash)));

    if (cashDifference === 0) {
      lines.push(padBetween('Farq (Kamomad/Ortiqcha):', '0 so\'m (To\'liq)'));
    } else if (cashDifference > 0) {
      lines.push(padBetween('Ortiqcha naqd pul:', `+${formatCurrency(cashDifference)}`));
    } else {
      lines.push(padBetween('⚠️ KAMOMAD (Yetishmaydi):', `-${formatCurrency(Math.abs(cashDifference))}`));
    }
  }

  lines.push(line);
  lines.push(padCenter(`Chop etildi: ${new Date().toLocaleTimeString('uz-UZ')}`));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
