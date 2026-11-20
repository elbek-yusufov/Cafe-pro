/**
 * Pul summasini formatlash (so'm, masalan 35 000 so'm)
 */
export function formatCurrency(amount: number | bigint): string {
  const num = typeof amount === 'bigint' ? Number(amount) : amount;
  return new Intl.NumberFormat('uz-UZ').format(num) + " so'm";
}

/**
 * Matnli pul summasini butun songa o'tkazish
 */
export function parseCurrency(formatted: string): number {
  const cleaned = formatted.replace(/[^\d-]/g, '');
  return parseInt(cleaned, 10) || 0;
}

/**
 * Xizmat haqi va chegirma hisoblash yordamchilari
 */
export function calculateOrderTotals(params: {
  subtotal: number;
  serviceFeePercent?: number;
  discountPercent?: number;
  discountFixed?: number;
}) {
  const { subtotal, serviceFeePercent = 0, discountPercent = 0, discountFixed = 0 } = params;

  const percentDiscount = Math.round((subtotal * discountPercent) / 100);
  const totalDiscount = Math.min(subtotal, percentDiscount + discountFixed);

  const discountedAmount = subtotal - totalDiscount;
  const serviceFee = Math.round((discountedAmount * serviceFeePercent) / 100);

  const total = discountedAmount + serviceFee;

  return {
    subtotal,
    discount: totalDiscount,
    serviceFee,
    total: Math.max(0, total)
  };
}
