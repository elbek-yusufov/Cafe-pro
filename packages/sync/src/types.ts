import { SyncOperation, SyncStatus } from '@oshxona/shared';

export interface SyncQueueItem {
  id: string;
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload: any;
  version?: number;
  deviceId?: string | null;
  createdAt: Date | string;
}

export interface SyncPushRequest {
  branchId: string;
  deviceId?: string;
  items: SyncQueueItem[];
}

export interface SyncPushResponse {
  success: boolean;
  processedCount: number;
  acknowledgedIds: string[];
  errors?: Array<{ id: string; error: string }>;
}

export interface SyncPullResponse {
  success: boolean;
  categories: any[];
  menuItems: any[];
  menuItemVariants: any[];
  modifierGroups: any[];
  modifiers: any[];
  discounts: any[];
  settings: any[];
  users: any[];
  latestSyncedAt: string;
}

export interface SyncStatusInfo {
  state: 'ONLINE' | 'SYNCING' | 'OFFLINE';
  isOnline: boolean;
  cloudConfigured?: boolean;
  failedCount?: number;
  pendingCount: number;
  lastSyncedAt?: Date | string | null;
  lastPushCount?: number;
  lastError?: string | null;
}
