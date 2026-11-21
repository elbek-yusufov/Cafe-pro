import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@oshxona/db';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ALL_ROLES, AppRole } from '../auth/roles';
import { UsersService } from './users.service';

class CreateUserDto {
  @MaxLength(80)
  @IsString()
  @IsNotEmpty()
  name: string;

  @Matches(/^[a-zA-Z0-9_.-]{3,32}$/, { message: 'Login 3–32 belgi: harf, raqam, _ . -' })
  username: string;

  @IsIn(ALL_ROLES)
  role: AppRole;

  @Matches(/^\d{4,6}$/, { message: 'PIN 4–6 xonali raqam' })
  pin: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountLimit?: number;
}

class UpdateUserDto {
  @IsOptional()
  @MaxLength(80)
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(ALL_ROLES)
  role?: AppRole;

  @IsOptional()
  @Matches(/^\d{4,6}$/, { message: 'PIN 4–6 xonali raqam' })
  pin?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  discountLimit?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Xodimlar va rollar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xodimlar ro\'yxati (PIN/parol hashlarisiz)' })
  list() {
    return this.users.list();
  }

  @Get('roles')
  @Roles(Role.ADMIN)
  roles() {
    return UsersService.roles();
  }

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xodim qo\'shish (oddiy PIN rad etiladi; ADMIN/MANAGER/KITCHEN uchun parol majburiy)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.users.create(dto, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Xodimni tahrirlash / PIN almashtirish / faolsizlantirish' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: any) {
    return this.users.update(id, dto, user);
  }

  @Get('logins')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Kirishlar tarixi (muvaffaqiyatli va xato urinishlar)' })
  logins(@Query('userId') userId?: string, @Query('take') take?: string) {
    return this.users.loginHistory(userId, take ? Number(take) || 100 : 100);
  }

  @Get('audit')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Audit jurnali' })
  audit(
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    const d = (v?: string) => {
      if (!v) return undefined;
      const x = new Date(v);
      if (Number.isNaN(x.getTime())) throw new BadRequestException(`Sana noto'g'ri: ${v}`);
      return x;
    };
    return this.users.auditLog({
      action: action?.slice(0, 64),
      userId,
      from: d(from),
      to: d(to),
      take: take ? Number(take) || undefined : undefined,
      skip: skip ? Number(skip) || undefined : undefined,
    });
  }
}
