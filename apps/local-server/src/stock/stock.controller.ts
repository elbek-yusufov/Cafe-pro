import { isSupervisor } from '../auth/roles';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StockService } from './stock.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { StockInDto } from './dto/stock-in.dto';
import { StockWasteDto } from './dto/stock-waste.dto';
import { StockInventoryDto } from './dto/stock-inventory.dto';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, StockMovementType } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

/** Tannarx (avgCost, unitCost, totalCost) faqat ADMIN/OWNER/MANAGER ga ko'rinadi */
function stripCost<T>(data: T, role?: string): T {
  if (isSupervisor(role)) return data;
  const COST = new Set(['avgCost', 'unitCost', 'totalCost', 'costPrice']);
  const walk = (v: any): any => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      return Object.fromEntries(Object.entries(v).filter(([k]) => !COST.has(k)).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(data);
}

@ApiTags('Ombor, Retseptlar va Xomashyo')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  // ---------------------------------------------------------
  // XOMASHYO
  // ---------------------------------------------------------

  @Get('ingredients')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Barcha xomashyolar ro\'yxati va qoldiqlar' })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false })
  async getIngredients(
    @Query('lowStockOnly') lowStockOnly?: string,
    @Query('search') search?: string,
    @CurrentUser('role') role?: string,
  ) {
    return stripCost(await this.stockService.findAllIngredients(lowStockOnly === 'true', search), role);
  }

  @Post('ingredients')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi xomashyo qo\'shish (Faqat Admin)' })
  createIngredient(@Body() dto: CreateIngredientDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.createIngredient(dto, deviceId);
  }

  @Get('ingredients/:id')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Xomashyo tafsilotlari va harakatlari' })
  async getIngredient(@Param('id') id: string, @CurrentUser('role') role?: string) {
    return stripCost(await this.stockService.findOneIngredient(id), role);
  }

  @Patch('ingredients/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Xomashyoni tahrirlash (Faqat Admin)' })
  updateIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.stockService.updateIngredient(id, dto, deviceId);
  }

  // ---------------------------------------------------------
  // OMBOR OPERATSIYALARI
  // ---------------------------------------------------------

  @Post('stock/in')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Omborga kirim qilish (tannarx avtomatik yangilanadi)' })
  stockIn(@Body() dto: StockInDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.stockIn(dto, deviceId);
  }

  @Post('stock/waste')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Isrof / chiqitga chiqarish (sababi majburiy)' })
  stockWaste(@Body() dto: StockWasteDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.stockWaste(dto, deviceId);
  }

  @Post('stock/inventory')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Inventarizatsiya (haqiqiy qoldiqni sanash va farqni kiritish)' })
  stockInventory(@Body() dto: StockInventoryDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.stockInventory(dto, deviceId);
  }

  @Get('stock/movements')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Ombor harakatlari tarixi' })
  @ApiQuery({ name: 'ingredientId', required: false })
  @ApiQuery({ name: 'type', enum: StockMovementType, required: false })
  getMovements(
    @Query('ingredientId') ingredientId?: string,
    @Query('type') type?: StockMovementType,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.stockService.getMovements({ ingredientId, type, supplierId });
  }

  @Get('stock/low')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Kam qolgan xomashyolar ro\'yxati (ogohlantirish)' })
  async getLowStock(@CurrentUser('role') role?: string) {
    return stripCost(await this.stockService.findAllIngredients(true), role);
  }

  // ---------------------------------------------------------
  // RETSEPTLAR
  // ---------------------------------------------------------

  @Post('recipes')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Taomga texnologik karta (retsept) biriktirish' })
  createRecipe(@Body() dto: CreateRecipeDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.createRecipe(dto, deviceId);
  }

  @Get('recipes/:menuItemId')
  @Roles(Role.ADMIN, Role.CASHIER)
  @ApiOperation({ summary: 'Taomning retsepti va xomashyo sarfini ko\'rish' })
  async getRecipe(@Param('menuItemId') menuItemId: string, @CurrentUser('role') role?: string) {
    return stripCost(await this.stockService.getRecipe(menuItemId), role);
  }

  // ---------------------------------------------------------
  // YETKAZIB BERUVCHILAR
  // ---------------------------------------------------------

  @Get('suppliers')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Yetkazib beruvchilar ro\'yxati' })
  getSuppliers() {
    return this.stockService.findAllSuppliers();
  }

  @Post('suppliers')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Yangi yetkazib beruvchi qo\'shish' })
  createSupplier(@Body() dto: CreateSupplierDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.stockService.createSupplier(dto, deviceId);
  }
}
