import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

export interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupDir = path.resolve(process.cwd(), 'backups');

  constructor(private readonly prisma: PrismaService) {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Tizim ma'lumotlar bazasining zaxira nusxasini (Backup) yaratish
   */
  async createBackup(): Promise<{ success: boolean; filename: string; sizeBytes: number }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `oshxona_pos_backup_${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    this.logger.log(`📦 Zaxira nusxa yaratilmoqda: ${filename}...`);

    try {
      // 1. Agar SQLite fayli bo'lsa, to'g'ridan-to'g'ri .db faylini nusxalash
      const dbUrl = process.env.DATABASE_URL || '';
      if (dbUrl.startsWith('file:') || dbUrl.includes('.db')) {
        const dbPath = dbUrl.replace(/^file:/, '').replace(/\?.*$/, '');
        const resolvedDbPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);

        if (fs.existsSync(resolvedDbPath)) {
          const dbBackupName = `oshxona_pos_backup_${timestamp}.db`;
          const dbBackupPath = path.join(this.backupDir, dbBackupName);
          fs.copyFileSync(resolvedDbPath, dbBackupPath);
          const stats = fs.statSync(dbBackupPath);

          this.logger.log(`✅ SQLite ma'lumotlar bazasi nusxalandi: ${dbBackupName} (${stats.size} bayt)`);
          this.cleanOldBackups(7);
          return { success: true, filename: dbBackupName, sizeBytes: stats.size };
        }
      }

      // 2. Aks holda Prisma orqali barcha asosiy jadvallarni JSON formatida saqlash
      const [
        branches,
        users,
        categories,
        menuItems,
        tables,
        orders,
        orderItems,
        payments,
        receipts,
        shifts,
        customers,
        ingredients,
        settings,
      ] = await Promise.all([
        this.prisma.branch.findMany(),
        this.prisma.user.findMany({ select: { id: true, username: true, name: true, role: true } }),
        this.prisma.category.findMany(),
        this.prisma.menuItem.findMany(),
        this.prisma.table.findMany(),
        this.prisma.order.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
        this.prisma.orderItem.findMany({ take: 15000, orderBy: { createdAt: 'desc' } }),
        this.prisma.payment.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
        this.prisma.receipt.findMany({ take: 5000, orderBy: { createdAt: 'desc' } }),
        this.prisma.shift.findMany({ take: 500, orderBy: { openedAt: 'desc' } }),
        this.prisma.customer.findMany(),
        this.prisma.ingredient.findMany(),
        this.prisma.setting.findMany(),
      ]);

      const backupData = {
        metadata: {
          system: 'OshxonaPOS Local Server',
          version: '1.0.0',
          createdAt: new Date().toISOString(),
        },
        branches,
        users,
        categories,
        menuItems,
        tables,
        orders,
        orderItems,
        payments,
        receipts,
        shifts,
        customers,
        ingredients,
        settings,
      };

      fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2), 'utf-8');
      const stats = fs.statSync(filepath);

      this.logger.log(`✅ JSON zaxira nusxasi yaratildi: ${filename} (${stats.size} bayt)`);

      // Eskirgan nusxalarni (7 kundan ortiq) tozalash
      this.cleanOldBackups(7);

      return {
        success: true,
        filename,
        sizeBytes: stats.size,
      };
    } catch (err: any) {
      this.logger.error(`❌ Backup yaratishda xatolik: ${err.message}`);
      throw err;
    }
  }

  /**
   * Barcha mavjud zaxira fayllar ro'yxatini olish
   */
  listBackups(): BackupInfo[] {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir);
    const backups: BackupInfo[] = [];

    for (const file of files) {
      if (file.startsWith('oshxona_pos_backup_')) {
        const fullPath = path.join(this.backupDir, file);
        const stat = fs.statSync(fullPath);
        backups.push({
          filename: file,
          sizeBytes: stat.size,
          createdAt: stat.birthtime.toISOString(),
        });
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Belgilangan kundan eski bo'lgan arxivlarni tozalash
   */
  private cleanOldBackups(retentionDays = 7) {
    try {
      const now = Date.now();
      const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
      const files = fs.readdirSync(this.backupDir);

      for (const file of files) {
        if (file.startsWith('oshxona_pos_backup_')) {
          const filePath = path.join(this.backupDir, file);
          const stat = fs.statSync(filePath);
          if (now - stat.birthtime.getTime() > maxAgeMs) {
            fs.unlinkSync(filePath);
            this.logger.log(`🗑 Eskirgan backup o'chirildi: ${file}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.warn(`Backup tozalashda xatolik: ${err.message}`);
    }
  }
}
