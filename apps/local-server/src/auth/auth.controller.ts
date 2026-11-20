import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Autentifikatsiya (Kirish)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin/Menejer uchun login va parol bilan kirish' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirildi, tokenlar qaytarildi' })
  @ApiResponse({ status: 401, description: 'Login yoki parol noto\'g\'ri' })
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.login(dto, ip);
  }

  @Post('pin-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Kassirlar uchun PIN-kod orqali tezkor kirish' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli kirildi, tokenlar qaytarildi' })
  @ApiResponse({ status: 401, description: 'PIN kod noto\'g\'ri' })
  async pinLogin(@Body() dto: PinLoginDto, @Req() req: any) {
    const ip = req.ip || req.connection?.remoteAddress;
    return this.authService.pinLogin(dto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tokenlarni yangilash (Refresh)' })
  @ApiResponse({ status: 200, description: 'Yangi tokenlar berildi' })
  @ApiResponse({ status: 401, description: 'Refresh token eskirgan yoki yaroqsiz' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto);
  }

  @Get('staff')
  @ApiOperation({ summary: 'Kassa ekranida xodimlarni tez tanlash uchun ro\'yxat' })
  async getStaff() {
    return this.authService.getActiveStaff();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy kirgan foydalanuvchi ma\'lumotlari' })
  async getProfile(@CurrentUser() user: any) {
    return user;
  }
}
