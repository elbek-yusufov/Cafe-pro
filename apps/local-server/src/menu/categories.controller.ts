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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Menyu — Kategoriyalar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yangi kategoriya yaratish (Faqat Admin)' })
  create(@Body() dto: CreateCategoryDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.categoriesService.create(dto, deviceId);
  }

  @Get()
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Barcha faol kategoriyalar ro\'yxati' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.categoriesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Kategoriya tafsilotlari va uning taomlari' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kategoriyani tahrirlash (Faqat Admin)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('deviceId') deviceId?: string,
  ) {
    return this.categoriesService.update(id, dto, deviceId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kategoriyani o\'chirish (Faqat Admin, Soft-delete)' })
  remove(@Param('id') id: string, @CurrentUser('deviceId') deviceId?: string) {
    return this.categoriesService.remove(id, deviceId);
  }
}
