export interface KitchenReceiptParams {
  stationName?: string;
  orderNumber: string;
  tableName: string;
  waiterName?: string;
  dateTime: Date | string;
  paperWidth?: 58 | 80;
  items: Array<{
    name: string;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ name: string }>;
  }>;
}

export function formatKitchenReceipt(params: KitchenReceiptParams): string {
  const {
    stationName = 'OSHXONA',
    orderNumber,
    tableName,
    waiterName,
    dateTime,
    paperWidth = 80,
    items,
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

  const d = new Date(dateTime);
  const timeStr = d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  lines.push(line);
  lines.push(padCenter(`*** OSHXONA BUYURTMASI ***`));
  lines.push(padCenter(`[ ${stationName.toUpperCase()} ]`));
  lines.push(line);

  lines.push(padBetween(`STOL: ${tableName.toUpperCase()}`, `№: ${orderNumber}`));
  lines.push(padBetween(`Vaqt: ${timeStr}`, waiterName ? `Xodim: ${waiterName}` : ''));
  lines.push(subLine);

  lines.push('TAOM NOMI                         SONI');
  lines.push(subLine);

  for (const item of items) {
    const qtyStr = `[ ${item.quantity} ]`;
    lines.push(padBetween(item.name.toUpperCase(), qtyStr));

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(`  + ${mod.name}`);
      }
    }

    if (item.notes) {
      lines.push(`  * ESLATMA: ${item.notes}`);
    }
    lines.push('');
  }

  lines.push(line);
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
