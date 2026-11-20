import {
  Role,
  DeviceType,
  OrderType,
  OrderStatus,
  OrderItemStatus,
  TableStatus,
  PaymentMethod,
  ReceiptType,
  StockMovementType,
  CashMovementType,
  UnitType,
  PrinterType,
  SyncOperation,
  SyncStatus
} from './enums';

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
  version: number;
  syncedAt?: Date | string | null;
  deviceId?: string | null;
}

export interface UserSummary {
  id: string;
  name: string;
  username: string;
  role: Role | string;
  discountLimit: number;
  isActive: boolean;
  branchId?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserSummary;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role | string;
  branchId?: string | null;
  deviceId?: string | null;
  iat?: number;
  exp?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}
