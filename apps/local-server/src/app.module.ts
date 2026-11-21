import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { MenuModule } from './menu/menu.module';
import { TablesModule } from './tables/tables.module';
import { OrdersModule } from './orders/orders.module';
import { EventsModule } from './events/events.module';
import { PaymentsModule } from './payments/payments.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { CustomersModule } from './customers/customers.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StockModule } from './stock/stock.module';
import { SyncModule } from './sync/sync.module';
import { ReportsModule } from './reports/reports.module';
import { TelegramModule } from './telegram/telegram.module';
import { BackupModule } from './backup/backup.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    UploadsModule,
    EventsModule,
    TelegramModule,
    BackupModule,
    AuthModule,
    HealthModule,
    MenuModule,
    TablesModule,
    OrdersModule,
    StockModule,
    PaymentsModule,
    ReceiptsModule,
    CustomersModule,
    ShiftsModule,
    SyncModule,
    ReportsModule,
  ],
})
export class AppModule {}
