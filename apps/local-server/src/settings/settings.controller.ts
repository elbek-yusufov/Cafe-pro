import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@oshxona/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

@ApiTags('Sozlamalar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Tizim sozlamalari (restoran, chek, xizmat haqi). Maxfiy qiymatlar yo\'q.' })
  getAll() {
    return this.settings.getAll();
  }

  @Get('schema')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sozlamalar ro\'yxati va nomlari (Admin forma uchun)' })
  schema() {
    return this.settings.describe();
  }

  @Patch()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Sozlamalarni yangilash (faqat ruxsat etilgan kalitlar, server tekshiruvi bilan)' })
  update(@Body() body: Record<string, unknown>, @CurrentUser() user: any) {
    return this.settings.update(body, user);
  }
}
