import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { Role } from '@oshxona/db';
import { generateUUIDv7, AuthTokens, JwtPayload } from '@oshxona/shared';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Admin / Boshqaruvchi login + parol orqali kirishi
   */
  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas');
    }

    if (!user.passwordHash) {
      throw new BadRequestException('Ushbu foydalanuvchiga parol o\'rnatilmagan (PIN orqali kiring)');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Login yoki parol noto\'g\'ri');
    }

    // Qurilma oxirgi faolligini yangilash
    if (dto.deviceId) {
      await this.updateDeviceActivity(dto.deviceId);
    }

    // Audit log yozish
    await this.logAudit(user.id, 'AUTH_LOGIN_PASSWORD', {
      username: user.username,
      deviceId: dto.deviceId,
    }, ipAddress, dto.deviceId);

    return this.generateTokens(user, dto.deviceId);
  }

  /**
   * Kassa sensorli ekrani uchun PIN-kod orqali tezkor kirish
   */
  async pinLogin(dto: PinLoginDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: dto.userIdentifier },
          { username: dto.userIdentifier }
        ]
      }
    });

    if (!user) {
      throw new NotFoundException('Tanlangan foydalanuvchi topilmadi');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi hisobi faol emas');
    }

    const isPinValid = await bcrypt.compare(dto.pin, user.pinHash);
    if (!isPinValid) {
      throw new UnauthorizedException('PIN kod noto\'g\'ri!');
    }

    if (dto.deviceId) {
      await this.updateDeviceActivity(dto.deviceId);
    }

    // Audit log
    await this.logAudit(user.id, 'AUTH_LOGIN_PIN', {
      username: user.username,
      deviceId: dto.deviceId,
    }, ipAddress, dto.deviceId);

    return this.generateTokens(user, dto.deviceId);
  }

  /**
   * Refresh Token orqali yangi Access Token olish
   */
  async refreshTokens(dto: RefreshTokenDto): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'oshxona-pos-refresh-secret-key-32chars-min-change-in-prod',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Foydalanuvchi mavjud emas yoki faol emas');
      }

      return this.generateTokens(user, payload.deviceId);
    } catch (error) {
      throw new UnauthorizedException('Yaroqsiz yoki muddati tugagan Refresh token');
    }
  }

  /**
   * Kassa ekranida tez tanlash uchun faol kassirlar va adminlar ro'yxati
   */
  async getActiveStaff() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        discountLimit: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Access va Refresh tokenlarni yaratish
   */
  private generateTokens(user: any, deviceId?: string): AuthTokens {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as Role,
      branchId: user.branchId,
      deviceId,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'oshxona-pos-access-secret-key-32chars-min-change-in-prod',
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION as any) || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'oshxona-pos-refresh-secret-key-32chars-min-change-in-prod',
      expiresIn: (process.env.JWT_REFRESH_EXPIRATION as any) || '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 daqiqa (soniyalarda)
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role as Role,
        discountLimit: user.discountLimit,
        isActive: user.isActive,
        branchId: user.branchId,
      },
    };
  }

  private async updateDeviceActivity(deviceId: string) {
    try {
      await this.prisma.device.update({
        where: { id: deviceId },
        data: { lastActive: new Date() },
      });
    } catch {
      // Agar qurilma hali kiritilmagan bo'lsa, xato chiqarmay davom etamiz
    }
  }

  private async logAudit(userId: string, action: string, details: any, ipAddress?: string, deviceId?: string) {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action,
          details,
          ipAddress: ipAddress || '127.0.0.1',
          deviceId,
        },
      });
    } catch (e) {
      console.error('Audit log saqlashda xato:', e);
    }
  }
}
