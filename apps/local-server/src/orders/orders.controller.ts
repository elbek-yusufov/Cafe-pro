import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AddOrderItemDto } from './dto/add-order-item.dto';
import { SplitOrderDto } from './dto/split-order.dto';
import { MergeOrdersDto } from './dto/merge-orders.dto';
import { MoveTableDto } from './dto/move-table.dto';
import { CancelOrderDto } from './dto/cancel-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, OrderStatus, OrderType, OrderItemStatus } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Kassa — Buyurtmalar (Orders)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Yangi buyurtma yaratish (Zal, Olib ketish, Yetkazib berish)' })
  create(
    @Body() dto: CreateOrderDto,
    @CurrentUser('id') cashierId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.createOrder(dto, cashierId, deviceId);
  }

  @Get('kitchen/tickets')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'KDS oshxona ekrani uchun barcha tayyorlanayotgan faol buyurtmalar' })
  getKitchenTickets() {
    return this.ordersService.getActiveKitchenTickets();
  }

  @Patch('items/:itemId/status')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'KDS oshxona ekrani: Taom holatini o\'zgartirish (COOKING, READY, SERVED)' })
  updateItemStatus(
    @Param('itemId') itemId: string,
    @Body('status') status: OrderItemStatus,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.updateItemStatus(itemId, status, deviceId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Buyurtmalar ro\'yxati (Filtrlar bilan)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'type', enum: OrderType, required: false })
  @ApiQuery({ name: 'tableId', required: false })
  @ApiQuery({ name: 'isOpenOnly', required: false, type: Boolean })
  findAll(
    @Query('status') status?: OrderStatus,
    @Query('type') type?: OrderType,
    @Query('tableId') tableId?: string,
    @Query('cashierId') cashierId?: string,
    @Query('isOpenOnly') isOpenOnly?: string,
  ) {
    return this.ordersService.findAll({
      status,
      type,
      tableId,
      cashierId,
      isOpenOnly: isOpenOnly === 'true',
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Bitta buyurtma tafsilotlari va taomlari' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Post(':id/items')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Buyurtmaga taom qo\'shish (sotuv paytidagi narx muzlatiladi)' })
  addItem(
    @Param('id') id: string,
    @Body() dto: AddOrderItemDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.addItem(id, dto, deviceId);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Buyurtmadan taomni olib tashlash' })
  removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.removeItem(id, itemId, deviceId);
  }

  @Post(':id/send-kitchen')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Oshxonaga yuborish (KDS va oshxona printeriga buyurtma cheki chiqarish)' })
  sendToKitchen(
    @Param('id') id: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.sendToKitchen(id, deviceId);
  }

  @Post(':id/move')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Buyurtmani boshqa stolga ko\'chirish' })
  moveTable(
    @Param('id') id: string,
    @Body() dto: MoveTableDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.moveTable(id, dto, deviceId);
  }

  @Post(':id/split')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Buyurtmani bo\'lish (Split bill — alohida hisob yaratish)' })
  splitOrder(
    @Param('id') id: string,
    @Body() dto: SplitOrderDto,
    @CurrentUser('id') cashierId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.splitOrder(id, dto, cashierId, deviceId);
  }

  @Post('merge')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Ikkita ochiq buyurtmani bitta hisobga birlashtirish' })
  mergeOrders(
    @Body() dto: MergeOrdersDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.mergeOrders(dto, deviceId);
  }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Buyurtmani bekor qilish (Faqat Admin PIN tasdig\'i bilan)' })
  cancelOrder(
    @Param('id') id: string,
    @Body() dto: CancelOrderDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.cancelOrder(id, dto, userId, deviceId);
  }
}
