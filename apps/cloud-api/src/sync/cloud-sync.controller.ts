import { timingSafeEqual } from 'crypto';
import { Controller, Post, Get, Body, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CloudSyncService } from './cloud-sync.service';
import { SyncPushRequest } from '@oshxona/sync';

@ApiTags('Bulut Sinxronizatsiyasi (Cloud Sync API)')
@Controller('sync')
export class CloudSyncController {
  constructor(private readonly cloudSyncService: CloudSyncService) {}

  @Post('push')
  @ApiOperation({ summary: 'Lokal serverdan kelgan savdo va to\'lovlarni qabul qilish (Idempotent)' })
  @ApiHeader({ name: 'x-sync-api-key', required: true })
  async push(
    @Body() dto: SyncPushRequest,
    @Headers('x-sync-api-key') apiKey: string,
  ) {
    this.validateApiKey(apiKey);
    return this.cloudSyncService.processPush(dto);
  }

  @Get('pull')
  @ApiOperation({ summary: 'Lokal server uchun yangilangan menyu, narx va sozlamalarni berish' })
  @ApiHeader({ name: 'x-sync-api-key', required: true })
  async pull(
    @Query('since') since: string,
    @Query('branchId') branchId?: string,
    @Headers('x-sync-api-key') apiKey?: string,
  ) {
    this.validateApiKey(apiKey);
    const sinceDate = since ? new Date(since) : new Date(0);
    return this.cloudSyncService.processPull(branchId || 'branch-main-01', sinceDate);
  }

  @Get('health')
  @ApiOperation({ summary: 'Bulut API holati' })
  health() {
    return {
      status: 'ok',
      service: 'oshxona-pos-cloud-api',
      timestamp: new Date().toISOString(),
    };
  }

  private validateApiKey(apiKey?: string) {
    // Fail-closed: kalit o'rnatilmagan (yoki zaif) bo'lsa hech qanday sinxron so'rov qabul qilinmaydi
    const validKey = process.env.CLOUD_SYNC_API_KEY;
    if (!validKey || validKey.length < 32) {
      throw new UnauthorizedException('Bulut serverida CLOUD_SYNC_API_KEY sozlanmagan');
    }
    const given = Buffer.from(apiKey || '');
    const expected = Buffer.from(validKey);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      throw new UnauthorizedException('Sinxronizatsiya API kaliti noto\'g\'ri');
    }
  }
}
