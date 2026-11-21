import { isSupervisor } from '../auth/roles';
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
import { MenuItemsService } from './menu-items.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdatePriceDto } from './dto/update-price.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { CreateModifierGroupDto } from './dto/create-modifier-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { Actor } from '../audit/audit.service';

/** Tannarx va foyda ma'lumotlari faqat ADMIN uchun — kassir/ofitsiantga yuborilmaydi. */
const ADMIN_ONLY_FIELDS = ['costPrice', 'profit', 'markupPercent', 'marginPercent', 'recipes'];
function forRole<T extends Record<string, any>>(item: T, role?: string): T {
  // Tannarx/foyda — ADMIN, OWNER va MANAGER (xarid va narxlash uchun)
  if (isSupervisor(role)) return item;
  const copy: Record<string, any> = { ...item };
  for (const f of ADMIN_ONLY_FIELDS) delete copy[f];
  if (Array.isArray(copy.variants)) copy.variants = copy.variants.map(({ costPrice, ...v }: any) => v);
  if (Array.isArray(copy.modifierGroups)) {
    copy.modifierGroups = copy.modifierGroups.map((g: any) => ({
      ...g,
      modifiers: (g.modifiers || []).map(({ costPrice, ...m }: any) => m),
    }));
  }
  return copy as T;
}

@ApiTags('Menyu — Taomlar va Narxlar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('menu-items')
export class MenuItemsController {
  constructor(private readonly menuItemsService: MenuItemsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yangi taom yaratish (Faqat Admin)' })
  create(@Body() dto: CreateMenuItemDto, @CurrentUser() user: Actor) {
    return this.menuItemsService.create(dto, user);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Barcha taomlar ro\'yxati (Filtr va qidiruv bilan)' })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'kitchenStationId', required: false })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiQuery({ name: 'isAvailable', required: false, type: Boolean })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('kitchenStationId') kitchenStationId?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isAvailable') isAvailable?: string,
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser('role') role?: string,
  ) {
    const items = await this.menuItemsService.findAll({
      categoryId,
      search,
      kitchenStationId,
      isFeatured: isFeatured !== undefined ? isFeatured === 'true' : undefined,
      isAvailable: isAvailable !== undefined ? isAvailable === 'true' : undefined,
      includeInactive: includeInactive === 'true' && isSupervisor(role),
    });
    return items.map((i) => forRole(i, role));
  }

  @Post('bulk/availability')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bir nechta taomning mavjudlik holatini birdan o\'zgartirish' })
  bulkUpdateAvailability(
    @Body() body: { ids: string[]; isAvailable: boolean },
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.menuItemsService.bulkUpdateAvailability(body.ids, body.isAvailable, deviceId);
  }

  @Post('bulk/delete')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bir nechta taomni ommaviy o\'chirish (Soft delete)' })
  bulkDelete(
    @Body() body: { ids: string[] },
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.menuItemsService.bulkDelete(body.ids, deviceId);
  }

  @Post('bulk/category')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Bir nechta taomni boshqa kategoriyaga o\'tkazish' })
  bulkChangeCategory(
    @Body() body: { ids: string[]; categoryId: string },
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.menuItemsService.bulkChangeCategory(body.ids, body.categoryId, deviceId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Bitta taom ma\'lumotlari, variantlari va qo\'shimchalari' })
  async findOne(@Param('id') id: string, @CurrentUser('role') role?: string) {
    return forRole(await this.menuItemsService.findOne(id), role);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taom ma\'lumotlarini tahrirlash (Faqat Admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.update(id, dto, user);
  }

  @Patch(':id/price')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taom narxini o\'zgartirish va narx tarixiga yozish (Faqat Admin)' })
  updatePrice(
    @Param('id') id: string,
    @Body() dto: UpdatePriceDto,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.updatePrice(id, dto, user);
  }

  @Patch(':id/availability')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Taomning mavjudligini o\'zgartirish ("Tugadi" belgisi)' })
  toggleAvailability(
    @Param('id') id: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.toggleAvailability(id, dto.isAvailable, user);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taomni o\'chirish (Faqat Admin, Soft-delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.menuItemsService.remove(id, user);
  }

  @Post(':id/variants')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taomga variant qo\'shish (masalan: 0.5 porsiya / 1 kg)' })
  addVariant(
    @Param('id') id: string,
    @Body() dto: CreateVariantDto,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.addVariant(id, dto, user);
  }

  @Delete('variants/:variantId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taom variantini o\'chirish' })
  deleteVariant(
    @Param('variantId') variantId: string,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.deleteVariant(variantId, user);
  }

  @Post(':id/modifier-groups')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taomga modifier guruhi qo\'shish' })
  addModifierGroup(
    @Param('id') id: string,
    @Body() dto: CreateModifierGroupDto,
    @CurrentUser() user: Actor,
  ) {
    return this.menuItemsService.addModifierGroup(id, dto, user);
  }

  @Get(':id/price-history')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Taomning barcha narx o\'zgarishlari tarixi' })
  getPriceHistory(@Param('id') id: string) {
    return this.menuItemsService.getPriceHistory(id);
  }
}
