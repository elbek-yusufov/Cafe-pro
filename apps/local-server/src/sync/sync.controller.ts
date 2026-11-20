import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';

@ApiTags('Sinxronizatsiya (Offline-First Sync)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Get('status')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Kassa ekrani uchun sinxronizatsiya holati (Online / Syncing / Offline)' })
  getStatus() {
    return this.syncService.getStatus();
  }

  @Post('trigger')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Sinxronizatsiyani qo\'lda darhol ishga tushirish' })
  async trigger() {
    const pushed = await this.syncService.pushQueue(50);
    await this.syncService.pullUpdates();
    const status = await this.syncService.getStatus();
    return {
      success: true,
      pushedCount: pushed,
      status,
    };
  }

  @Get('queue')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sinxronizatsiya navbatida kutilayotgan yozuvlar ro\'yxati' })
  getQueue() {
    return this.syncService.getQueue();
  }
}
