import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { SyncService } from './sync.service';

@Injectable()
export class SyncWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private readonly syncService: SyncService) {}

  onModuleInit() {
    const intervalMs = parseInt(process.env.SYNC_INTERVAL_MS || '15000', 10);
    this.logger.log(`🔄 Offline-First SyncWorker ishga tushdi (Har ${intervalMs / 1000} soniyada tekshiradi)`);

    // Dastlabki 3 soniyadan so'ng ishga tushirish
    setTimeout(() => this.runSyncCycle(), 3000);

    // Muntazam sikl
    this.timer = setInterval(() => this.runSyncCycle(), intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async runSyncCycle() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      // 1. Outbox navbatidagi yozuvlarni bulutga yuborish (PUSH)
      const pushedCount = await this.syncService.pushQueue(50);
      if (pushedCount > 0) {
        this.logger.log(`☁️ ${pushedCount} ta yozuv bulut serveriga sinxronlandi`);
      }

      // 2. Bulutdan admin o'zgarishlarini qabul qilish (PULL)
      await this.syncService.pullUpdates();
    } catch (err: any) {
      this.logger.warn(`Sinxronizatsiya sikli xatosi: ${err.message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
