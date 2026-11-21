import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';

@ApiTags('Admin — Hisobotlar va Tahlil')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Moliyaviy xulosa: tushum, to\'lovlar, mahsulot/kategoriya/kassir, qaytarish, xarajat, foyda, smenalar' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.getSummary(from, to);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Dashboard uchun bugungi kunlik tezkor hisobot' })
  getDashboard() {
    return this.reportsService.getDashboardSummary();
  }

  @Get('sales')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Kunlik/haftalik/oylik savdo hisoboti' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  getSales(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getSalesReport(startDate, endDate);
  }

  @Get('top-items')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Eng ko\'p sotilgan TOP taomlar' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopDishes(
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTopDishes(limit ? Number(limit) : 10, startDate, endDate);
  }

  @Get('cashiers')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Kassirlar bo\'yicha savdo va cheklar ko\'rsatkichi' })
  getCashiers(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getCashiersPerformance(startDate, endDate);
  }

  @Get('profit')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Sof foyda hisoboti (Tushum - Tannarx - Xarajatlar)' })
  getProfit(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getProfitReport(startDate, endDate);
  }

  @Get('hourly')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Soatlik mijozlar yuklamasi (qaysi soatda eng ko\'p mijoz)' })
  @ApiQuery({ name: 'date', required: false })
  getHourly(@Query('date') date?: string) {
    return this.reportsService.getHourlyLoad(date);
  }

  @Get(':type/export')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Hisobotlarni Excel / CSV formatida yuklab olish' })
  async export(
    @Param('type') type: 'sales' | 'top-items' | 'profit' | 'debts',
    @Query('format') format: 'xlsx' | 'pdf',
    @Res() res: Response,
  ) {
    const result = await this.reportsService.exportReport(type, format || 'xlsx');
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.data);
  }
}
