import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { OpenShiftDto } from './dto/open-shift.dto';
import { CloseShiftDto } from './dto/close-shift.dto';
import { CreateCashMovementDto } from './dto/create-cash-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — Smena va Kassa Harakatlari')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('open')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Yangi smena ochish (boshlang\'ich naqd pul bilan)' })
  open(
    @Body() dto: OpenShiftDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.shiftsService.openShift(userId, dto, deviceId);
  }

  @Get('current')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Joriy kassirning ochiq smenasi va oraliq ma\'lumotlari' })
  getCurrent(@CurrentUser('id') userId: string) {
    return this.shiftsService.getCurrentShift(userId);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Smenani yopish va Z-Hisobot chiqarish (haqiqiy naqd sanaladi)' })
  close(
    @Param('id') shiftId: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.shiftsService.closeShift(shiftId, dto, userId, deviceId);
  }

  @Get(':id/x-report')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'X-Hisobot (Oraliq hisobot — smena yopilmaydi)' })
  getXReport(@Param('id') shiftId: string) {
    return this.shiftsService.getXReport(shiftId);
  }

  @Post(':id/cash-movements')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Kassadan pul olish (inkassatsiya), kirim yoki xarajat kiritish' })
  addCashMovement(
    @Param('id') shiftId: string,
    @Body() dto: CreateCashMovementDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.shiftsService.addCashMovement(shiftId, dto, userId, deviceId);
  }
}
