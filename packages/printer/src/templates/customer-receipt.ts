import { formatCurrency } from '@oshxona/shared';

export interface CustomerReceiptParams {
  restaurantName: string;
  address?: string;
  phone?: string;
  receiptNo: string;
  dateTime: Date | string;
  cashierName: string;
  tableName?: string;
  paperWidth?: 58 | 80;
  isCopy?: boolean;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    modifiers?: Array<{ name: string; price: number }>;
  }>;
  subtotal: number;
  serviceFee: number;
  serviceFeePercent?: number;
  discount: number;
  total: number;
  payments: Array<{
    method: string;
    amount: number;
    received?: number;
    change?: number;
  }>;
  footerNote?: string;
}

export function formatCustomerReceipt(params: CustomerReceiptParams): string {
  const {
    restaurantName,
    address,
    phone,
    receiptNo,
    dateTime,
    cashierName,
    tableName,
    paperWidth = 80,
    isCopy = false,
    items,
    subtotal,
    serviceFee,
    serviceFeePercent = 10,
    discount,
    total,
    payments,
    footerNote = 'Xaridingiz uchun rahmat!',
  } = params;

  const width = paperWidth === 58 ? 32 : 42;
  const line = '-'.repeat(width);
  const doubleLine = '='.repeat(width);

  const padCenter = (text: string) => {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  };

  const padBetween = (left: string, right: string) => {
    const spaces = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const lines: string[] = [];

  // 1. Sarlavha
  if (isCopy) {
    lines.push(padCenter('*** NUSXA (DUBLIKAT) ***'));
    lines.push('');
  }

  lines.push(padCenter(`🍽️ "${restaurantName.toUpperCase()}"`));
  if (address) lines.push(padCenter(address));
  if (phone) lines.push(padCenter(`Tel: ${phone}`));
  lines.push(line);

  // 2. Chek ma'lumotlari
  const d = new Date(dateTime);
  const dateStr = d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  lines.push(padBetween(`Chek №: ${receiptNo}`, ''));
  lines.push(padBetween(`Sana: ${dateStr}`, ''));
  lines.push(padBetween(`Kassir: ${cashierName}`, tableName ? `Stol: ${tableName}` : 'Olib ketish'));
  lines.push(line);

  // 3. Taomlar
  for (const item of items) {
    const itemLeft = `${item.name}`;
    lines.push(itemLeft);

    const calcLeft = `  ${item.quantity} x ${formatCurrency(item.unitPrice)}`;
    const calcRight = formatCurrency(item.totalPrice);
    lines.push(padBetween(calcLeft, calcRight));

    if (item.modifiers && item.modifiers.length > 0) {
      for (const mod of item.modifiers) {
        lines.push(padBetween(`    + ${mod.name}`, mod.price > 0 ? formatCurrency(mod.price) : ''));
      }
    }
  }

  lines.push(line);

  // 4. Hisob-kitoblar
  lines.push(padBetween('Jami:', formatCurrency(subtotal)));

  if (serviceFee > 0) {
    lines.push(padBetween(`Xizmat haqi (${serviceFeePercent}%):`, formatCurrency(serviceFee)));
  }

  if (discount > 0) {
    lines.push(padBetween('Chegirma:', `-${formatCurrency(discount)}`));
  }

  lines.push(doubleLine);
  lines.push(padBetween('TO\'LOVGA:', formatCurrency(total)));
  lines.push(doubleLine);

  // 5. To'lovlar va qaytim
  for (const pay of payments) {
    let methodUz = pay.method;
    if (pay.method === 'CASH') methodUz = 'Naqd';
    else if (pay.method === 'CARD') methodUz = 'Karta (Uzcard/Humo)';
    else if (pay.method === 'CLICK') methodUz = 'Click';
    else if (pay.method === 'PAYME') methodUz = 'Payme';
    else if (pay.method === 'DEBT') methodUz = 'Nasiya (Qarz)';

    lines.push(padBetween(`To'lov (${methodUz}):`, formatCurrency(pay.amount)));

    if (pay.received && pay.received > pay.amount) {
      lines.push(padBetween('Qabul qilindi:', formatCurrency(pay.received)));
      lines.push(padBetween('Qaytim:', formatCurrency(pay.change || (pay.received - pay.amount))));
    }
  }

  lines.push(line);

  // 6. Xulosa
  lines.push(padCenter(footerNote));
  lines.push(padCenter('[ QR: fikr qoldirish / menyu ]'));
  lines.push('');
  lines.push('');

  return lines.join('\n');
}
