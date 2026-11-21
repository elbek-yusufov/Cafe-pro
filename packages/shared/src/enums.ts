export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  CASHIER = 'CASHIER',
  WAITER = 'WAITER',
  KITCHEN = 'KITCHEN'
}

export enum DeviceType {
  POS_CASHIER = 'POS_CASHIER',
  KDS_KITCHEN = 'KDS_KITCHEN',
  WAITER_TABLET = 'WAITER_TABLET',
  ADMIN_STATION = 'ADMIN_STATION'
}

export enum OrderType {
  DINE_IN = 'DINE_IN',
  TAKEAWAY = 'TAKEAWAY',
  DELIVERY = 'DELIVERY'
}

export enum OrderStatus {
  OPEN = 'OPEN',
  SENT = 'SENT',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED'
}

export enum OrderItemStatus {
  PENDING = 'PENDING',
  COOKING = 'COOKING',
  READY = 'READY',
  SERVED = 'SERVED',
  CANCELLED = 'CANCELLED'
}

export enum TableStatus {
  AVAILABLE = 'AVAILABLE',
  OCCUPIED = 'OCCUPIED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  RESERVED = 'RESERVED'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  DEBT = 'DEBT'
}

export enum ReceiptType {
  SALE = 'SALE',
  KITCHEN = 'KITCHEN',
  COPY = 'COPY',
  X_REPORT = 'X_REPORT',
  Z_REPORT = 'Z_REPORT'
}

export enum StockMovementType {
  IN = 'IN',
  OUT_SALE = 'OUT_SALE',
  WASTE = 'WASTE',
  ADJUST = 'ADJUST',
  RETURN = 'RETURN'
}

export enum CashMovementType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  EXPENSE = 'EXPENSE'
}

export enum UnitType {
  PORTION = 'PORTION',
  KG = 'KG',
  GRAM = 'GRAM',
  LITRE = 'LITRE',
  ML = 'ML',
  PIECE = 'PIECE'
}

export enum PrinterType {
  USB = 'USB',
  LAN = 'LAN',
  BLUETOOTH = 'BLUETOOTH'
}

export enum SyncOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE'
}

export enum SyncStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED'
}
