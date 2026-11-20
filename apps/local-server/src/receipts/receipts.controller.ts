import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — Cheklar va Qayta Chop Etish')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Chek tafsilotlari va matnini olish' })
  getReceipt(@Param('id') id: string) {
    return this.receiptsService.getReceiptById(id);
  }

  @Post(':id/reprint')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Chekni qayta chop etish ("NUSXA" belgisi bilan, audit logga yoziladi)' })
  reprint(
    @Param('id') receiptId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.receiptsService.reprintReceipt(receiptId, userId, deviceId);
  }
}
