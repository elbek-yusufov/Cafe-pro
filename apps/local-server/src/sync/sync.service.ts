import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SyncStatus, SyncOperation } from '@oshxona/db';
import {
  SyncPushRequest,
  SyncPushResponse,
  SyncPullResponse,
  SyncStatusInfo,
  getRetryDelay,
} from '@oshxona/sync';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private lastSyncedAt: Date | null = null;
  private lastError: string | null = null;
  private isSyncing = false;
  private isOnline = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Kassa ekranidagi status indikatori uchun joriy holat:
   * 🟢 Online / 🟡 Sinxronlanmoqda (N ta kutilmoqda) / 🔴 Offline
   */
  async getStatus(): Promise<SyncStatusInfo> {
    const pendingCount = await this.prisma.syncQueue.count({
      where: {
        status: { in: [SyncStatus.PENDING, SyncStatus.PROCESSING, SyncStatus.FAILED] },
      },
    });

    let state: 'ONLINE' | 'SYNCING' | 'OFFLINE' = 'OFFLINE';
    if (!this.isOnline) {
      state = 'OFFLINE';
    } else if (pendingCount > 0 || this.isSyncing) {
      state = 'SYNCING';
    } else {
      state = 'ONLINE';
    }

    return {
      state,
      isOnline: this.isOnline,
      // Bulut manzili va kaliti .env da sozlanganmi (sozlanmagan bo'lsa — faqat lokal/LAN rejim)
      cloudConfigured: !!(process.env.CLOUD_API_URL && process.env.CLOUD_SYNC_API_KEY),
      failedCount: await this.prisma.syncQueue.count({ where: { status: SyncStatus.FAILED } }),
      pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
    };
  }

  /**
   * 50 talik paketlar bilan Outbox navbatidagi yozuvlarni Bulutga yuborish (POST /sync/push)
   */
  async pushQueue(batchSize = 50): Promise<number> {
    const pendingItems = await this.prisma.syncQueue.findMany({
      where: {
        status: { in: [SyncStatus.PENDING, SyncStatus.FAILED] },
        attempts: { lt: 10 }, // maksimal 10 marta urinish
      },
      orderBy: { createdAt: 'asc' },
      take: batchSize,
    });

    if (pendingItems.length === 0) {
      return 0;
    }

    const cloudUrl = process.env.CLOUD_API_URL;
    const apiKey = process.env.CLOUD_SYNC_API_KEY;

    // Kalitsiz bulutga hech narsa yuborilmaydi (hardcoded default kalit yo'q)
    if (!cloudUrl || !apiKey) {
      this.isOnline = false;
      return 0;
    }

    const branchSetting = await this.prisma.setting.findUnique({ where: { key: 'BRANCH_ID' } });
    const branchId = branchSetting?.value || process.env.DEFAULT_BRANCH_ID || 'branch-main-01';

    const payload: SyncPushRequest = {
      branchId,
      items: pendingItems.map((item) => ({
        id: item.id,
        entity: item.entity,
        entityId: item.entityId,
        operation: item.operation as any,
        payload: item.payload,
        deviceId: item.deviceId,
        createdAt: item.createdAt,
      })),
    };

    try {
      this.isSyncing = true;
      this.broadcastStatus();

      // Bulutga yuborish (Fetch orqali)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 soniya timeout

      const response = await fetch(`${cloudUrl}/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sync-api-key': apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Bulut server xatosi: ${response.status} ${response.statusText}`);
      }

      const result: SyncPushResponse = await response.json();
      this.isOnline = true;
      this.lastError = null;

      // Muvaffaqiyatli qabul qilingan IDlarni SYNCED ga o'tkazish
      if (result.acknowledgedIds && result.acknowledgedIds.length > 0) {
        await this.prisma.syncQueue.updateMany({
          where: { id: { in: result.acknowledgedIds } },
          data: {
            status: SyncStatus.SYNCED,
            syncedAt: new Date(),
          },
        });
      }

      this.lastSyncedAt = new Date();
      return result.acknowledgedIds?.length || 0;
    } catch (err: any) {
      this.isOnline = false;
      this.lastError = err.message || 'Bulut serveri bilan aloqa yo\'q';

      // Xato bo'lsa urinishlar sonini oshirish
      await this.prisma.syncQueue.updateMany({
        where: { id: { in: pendingItems.map((i) => i.id) } },
        data: {
          status: SyncStatus.FAILED,
          attempts: { increment: 1 },
          lastError: this.lastError,
        },
      });

      return 0;
    } finally {
      this.isSyncing = false;
      this.broadcastStatus();
    }
  }

  /**
   * Bulutdan o'zgarishlarni yuklab olish (GET /sync/pull)
   * Admin bulutda o'zgartirgan narx, menyu va sozlamalarni lokal serverga qabul qiladi
   */
  async pullUpdates(): Promise<boolean> {
    const cloudUrl = process.env.CLOUD_API_URL;
    const apiKey = process.env.CLOUD_SYNC_API_KEY;
    if (!cloudUrl || !apiKey) return false;

    try {
      const since = this.lastSyncedAt ? this.lastSyncedAt.toISOString() : '1970-01-01T00:00:00.000Z';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${cloudUrl}/sync/pull?since=${encodeURIComponent(since)}`, {
        headers: {
          'x-sync-api-key': apiKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) return false;

      const data: SyncPullResponse = await res.json();
      this.isOnline = true;

      // Bulutdan kelgan yangi menyu/narxlarni lokal bazaga yozish (Last Write Wins)
      if (data.menuItems && data.menuItems.length > 0) {
        for (const item of data.menuItems) {
          await this.prisma.menuItem.upsert({
            where: { id: item.id },
            update: {
              name: item.name,
              nameRu: item.nameRu,
              price: item.price,
              costPrice: item.costPrice,
              isAvailable: item.isAvailable,
              version: item.version,
              syncedAt: new Date(),
            },
            create: {
              id: item.id,
              name: item.name,
              nameRu: item.nameRu,
              price: item.price,
              costPrice: item.costPrice,
              unit: item.unit,
              categoryId: item.categoryId,
              isAvailable: item.isAvailable,
              version: item.version,
              syncedAt: new Date(),
            },
          });
        }
      }

      this.lastSyncedAt = new Date();
      return true;
    } catch {
      this.isOnline = false;
      return false;
    }
  }

  /**
   * Navbatdagi kutilayotgan yozuvlarni ko'rish
   */
  async getQueue() {
    return this.prisma.syncQueue.findMany({
      where: {
        status: { in: [SyncStatus.PENDING, SyncStatus.FAILED, SyncStatus.PROCESSING] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * WebSocket orqali kassa monitoriga indikator yuborish
   */
  private async broadcastStatus() {
    try {
      const status = await this.getStatus();
      this.eventsGateway.emitSyncStatus(status);
    } catch {
      // ignore
    }
  }
}
