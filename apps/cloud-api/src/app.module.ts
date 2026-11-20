import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { CloudSyncModule } from './sync/cloud-sync.module';

@Module({
  imports: [
    PrismaModule,
    CloudSyncModule,
  ],
})
export class AppModule {}
