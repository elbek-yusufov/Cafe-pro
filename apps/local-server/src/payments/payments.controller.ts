import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — To\'lovlar (Payments)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post(':id/pay')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Buyurtmaga to\'lov qabul qilish (Naqd, Karta, Click, Payme, Nasiya)' })
  pay(
    @Param('id') orderId: string,
    @Body() dto: ProcessPaymentDto,
    @CurrentUser('id') cashierId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.paymentsService.processPayment(orderId, dto, cashierId, deviceId);
  }

  @Post(':id/refund')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'To\'lovni qaytarish (Refund — Faqat Admin PIN tasdig\'i bilan)' })
  refund(
    @Param('id') orderId: string,
    @Body() dto: RefundPaymentDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.paymentsService.refundPayment(orderId, dto, userId, deviceId);
  }
}
