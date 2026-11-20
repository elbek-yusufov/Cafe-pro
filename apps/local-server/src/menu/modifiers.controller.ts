import { Controller, Post, Body, Get, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ModifiersService } from './modifiers.service';
import { CreateModifierDto } from './dto/create-modifier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@oshxona/db';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Menyu — Modifierlar (Qo\'shimchalar)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('modifiers')
export class ModifiersController {
  constructor(private readonly modifiersService: ModifiersService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Yangi modifier (qo\'shimcha) qo\'shish' })
  create(@Body() dto: CreateModifierDto, @CurrentUser('deviceId') deviceId?: string) {
    return this.modifiersService.create(dto, deviceId);
  }

  @Get('by-group/:groupId')
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @ApiOperation({ summary: 'Guruhga tegishli barcha modifierlar ro\'yxati' })
  findAllByGroup(@Param('groupId') groupId: string) {
    return this.modifiersService.findAllByGroup(groupId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Modifierni o\'chirish' })
  remove(@Param('id') id: string, @CurrentUser('deviceId') deviceId?: string) {
    return this.modifiersService.remove(id, deviceId);
  }
}
