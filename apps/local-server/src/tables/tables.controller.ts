import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, TableStatus } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — Zallar va Stollar Xaritasi')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tables')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('halls')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Barcha zallar va stollar xaritasi (ochiq buyurtmalari bilan)' })
  getHalls(@Query('branchId') branchId?: string) {
    return this.tablesService.getHallsWithTables(branchId);
  }

  @Post('halls')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yangi zal (hudud) qo\'shish' })
  createHall(@Body() body: { name: string; sortOrder?: number }, @CurrentUser('deviceId') deviceId?: string) {
    return this.tablesService.createHall(String(body?.name ?? ''), Number.isInteger(body?.sortOrder) ? body.sortOrder : undefined, deviceId);
  }

  @Patch('halls/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Zal nomi / tartibini o\'zgartirish' })
  updateHall(@Param('id') id: string, @Body() body: { name?: string; sortOrder?: number }, @CurrentUser('deviceId') deviceId?: string) {
    return this.tablesService.updateHall(
      id,
      { name: typeof body?.name === 'string' ? body.name : undefined, sortOrder: Number.isInteger(body?.sortOrder) ? body.sortOrder : undefined },
      deviceId,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Stol tafsilotlari' })
  getTable(@Param('id') id: string) {
    return this.tablesService.getTableById(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yangi stol qo\'shish (Faqat Admin)' })
  create(@Body() dto: CreateTableDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.tablesService.createTable(dto, deviceId);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Stol ma\'lumotlarini yangilash (Faqat Admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.tablesService.updateTable(id, dto, deviceId);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Stol holatini o\'zgartirish (AVAILABLE, OCCUPIED, PAYMENT_PENDING)' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: TableStatus,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.tablesService.updateStatus(id, status, deviceId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Stolni o\'chirish (Faqat Admin)' })
  remove(@Param('id') id: string, @CurrentUser('deviceId') deviceId?: string) {
    return this.tablesService.deleteTable(id, deviceId);
  }
}
