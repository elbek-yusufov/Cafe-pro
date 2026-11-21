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
  BadRequestException,
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
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { UpdateItemStatusDto } from './dto/update-item-status.dto';

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
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER, Role.KITCHEN)
  @ApiOperation({ summary: 'KDS oshxona ekrani uchun barcha tayyorlanayotgan faol buyurtmalar' })
  getKitchenTickets() {
    return this.ordersService.getActiveKitchenTickets();
  }

  @Patch('items/:itemId/status')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER, Role.KITCHEN)
  @ApiOperation({ summary: 'KDS oshxona ekrani: Taom holatini o\'zgartirish (COOKING, READY, SERVED)' })
  updateItemStatus(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemStatusDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.ordersService.updateItemStatus(itemId, dto.status, deviceId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Buyurtmalar ro\'yxati (Filtrlar bilan)' })
  @ApiQuery({ name: 'status', enum: OrderStatus, required: false })
  @ApiQuery({ name: 'type', enum: OrderType, required: false })
  @ApiQuery({ name: 'tableId', required: false })
  @ApiQuery({ name: 'isOpenOnly', required: false, type: Boolean })
  findAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('tableId') tableId?: string,
    @Query('cashierId') cashierId?: string,
    @Query('isOpenOnly') isOpenOnly?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    // Noto'g'ri enum/sana — 400 (Prisma 500 xatosiga tushmasligi uchun)
    if (status && !(Object.values(OrderStatus) as string[]).includes(status)) {
      throw new BadRequestException('status noto\'g\'ri');
    }
    if (type && !(Object.values(OrderType) as string[]).includes(type)) {
      throw new BadRequestException('type noto\'g\'ri');
    }
    const parseDate = (v?: string) => {
      if (!v) return undefined;
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) throw new BadRequestException(`Sana noto'g'ri: ${v}`);
      return d;
    };
    return this.ordersService.findAll({
      status: status as OrderStatus | undefined,
      type: type as OrderType | undefined,
      tableId,
      cashierId,
      isOpenOnly: isOpenOnly === 'true',
      search: search?.slice(0, 40),
      from: parseDate(from),
      to: parseDate(to),
      take: take ? Number(take) || undefined : undefined,
      skip: skip ? Number(skip) || undefined : undefined,
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
    @CurrentUser() user: any,
    @Query('approverPin') approverPin?: string,
  ) {
    return this.ordersService.removeItem(id, itemId, user, approverPin);
  }

  @Patch(':id/discount')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Chegirma (foiz). Kassir limitidan oshsa admin PIN kerak' })
  applyDiscount(@Param('id') id: string, @Body() dto: ApplyDiscountDto, @CurrentUser() user: any) {
    return this.ordersService.applyDiscount(id, dto, user);
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
    @CurrentUser() user: any,
  ) {
    return this.ordersService.cancelOrder(id, dto, user);
  }
}
