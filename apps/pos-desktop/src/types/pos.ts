export interface Category {
  id: string;
  name: string;
  icon?: string;
  isFavorite?: boolean;
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  unit: string;
  isAvailable: boolean;
  image?: string;
  isFavorite?: boolean;
  description?: string;
}

export interface CartItem {
  id: string;
  dishId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface TableItem {
  id: string;
  name: string;
  capacity: number;
  hall: string; // 'Asosiy zal' | '2-qavat' | 'VIP Kabina' | 'Yozgi ayvon'
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  activeOrderId?: string;
  occupiedSince?: string;
  totalAmount?: number;
  waiterName?: string;
  activeOrder?: {
    orderNumber: string;
    startedAt: string;
    waiter: string;
    items: { name: string; quantity: number; price: number }[];
    total: number;
  };
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  table: string;
  type: 'DINE_IN' | 'TAKEAWAY';
  status: 'NEW' | 'PREPARING' | 'READY' | 'PAID' | 'CANCELLED';
  createdAt: string;
  items: {
    dishId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod?: 'CASH' | 'CARD' | 'QRIS' | 'MIXED';
  cashierName?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
  costPerUnit: number;
  category: string;
  lastUpdated: string;
}

export interface Employee {
  id: string;
  name: string;
  role: 'CASHIER' | 'WAITER' | 'CHEF' | 'MANAGER' | 'ADMIN';
  phone: string;
  pin: string;
  isActive: boolean;
  branch: string;
  currentShift?: string;
}

export interface DailyReport {
  todaySales: number;
  orderCount: number;
  cashPayments: number;
  cardPayments: number;
  qrPayments: number;
  averageCheck: number;
  hourlySales: { hour: string; amount: number }[];
}

export interface RestaurantSettings {
  name: string;
  phone: string;
  address: string;
  taxNumber: string;
  receiptHeader: string;
  receiptFooter: string;
  serviceFeePercent: number;
  currency: string;
  autoPrintReceipt: boolean;
  printerType: 'USB' | 'LAN' | 'BLUETOOTH';
  paperWidth: '80mm' | '58mm';
  enabledPayments: {
    cash: boolean;
    card: boolean;
    qris: boolean;
    mixed: boolean;
  };
}

export interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string;
  hasError: boolean;
  errorMessage?: string;
}

export type ActiveTab =
  | 'kassa'
  | 'buyurtmalar'
  | 'stollar'
  | 'oshxona'
  | 'mahsulotlar'
  | 'ombor'
  | 'hisobotlar'
  | 'xodimlar'
  | 'sozlamalar';
