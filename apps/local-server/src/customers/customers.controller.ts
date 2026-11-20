import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { DebtPaymentDto } from './dto/debt-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — Mijozlar va Qarz Daftari (Nasiya)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Mijozlar va qarzdorlar ro\'yxati' })
  @ApiQuery({ name: 'onlyWithDebt', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @Query('onlyWithDebt') onlyWithDebt?: string,
    @Query('search') search?: string,
  ) {
    return this.customersService.findAll(onlyWithDebt === 'true', search);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Mijoz ma\'lumotlari va qarz tarixi' })
  findOne(@Param('id') id: string) {
    return this.customersService.findOne(id);
  }

  @Post(':id/debt-payment')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Qarzni (nasiyani) to\'lash — qisman yoki to\'liq' })
  payDebt(
    @Param('id') customerId: string,
    @Body() dto: DebtPaymentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.customersService.payDebt(customerId, dto, userId, deviceId);
  }
}
