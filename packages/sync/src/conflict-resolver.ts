/**
 * Offline-First Sinxronizatsiya Konfliktlarini Hal Qilish Siyosati
 */
export enum ConflictStrategy {
  APPEND_ONLY = 'APPEND_ONLY',
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
}

export function getEntityConflictStrategy(entity: string): ConflictStrategy {
  const appendOnlyEntities = [
    'order',
    'order_item',
    'payment',
    'payment_refund',
    'receipt',
    'debt_transaction',
    'cash_movement',
    'shift_z_report',
    'stock_movement',
    'audit_log',
  ];

  if (appendOnlyEntities.includes(entity)) {
    return ConflictStrategy.APPEND_ONLY;
  }

  // Menyu, narxlar, kategoriyalar, sozlamalar — Last Write Wins
  return ConflictStrategy.LAST_WRITE_WINS;
}

export function shouldApplyIncomingUpdate(localVersion: number, incomingVersion: number): boolean {
  return incomingVersion >= localVersion;
}
