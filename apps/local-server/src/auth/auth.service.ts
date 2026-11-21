import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { PinLoginDto } from './dto/pin-login.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { LoginThrottleService } from './login-throttle.service';
import { Role } from '@oshxona/db';
import { generateUUIDv7, AuthTokens, JwtPayload } from '@oshxona/shared';
import {
  getJwtAccessExpiration,
  getJwtAccessSecret,
  getJwtRefreshExpiration,
  getJwtRefreshSecret,
} from '../config/security.config';

const INVALID_PIN_MESSAGE = 'Xodim yoki PIN kod noto\'g\'ri';
const INVALID_PASSWORD_MESSAGE = 'Login yoki parol noto\'g\'ri';
const INACTIVE_MESSAGE = 'Foydalanuvchi hisobi faol emas. Administratorga murojaat qiling.';

/** Taymer hujumlarini kamaytirish uchun: mavjud bo'lmagan foydalanuvchida ham bcrypt bajariladi. */
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-not-a-real-credential', 10);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly throttle: LoginThrottleService,
  ) {}

  /**
   * Admin / Boshqaruvchi login + parol orqali kirishi
   */
  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    const throttleKey = `pwd:${dto.username.toLowerCase()}`;
    this.throttle.assertNotLocked(throttleKey);

    const user = await this.prisma.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });

    const isMatch = await bcrypt.compare(dto.password, user?.passwordHash || DUMMY_HASH);
    if (!user || !user.passwordHash || !isMatch) {
      const locked = this.throttle.registerFailure(throttleKey);
      await this.logAudit(user?.id ?? null, 'AUTH_LOGIN_PASSWORD_FAILED', {
        username: dto.username,
        reason: !user ? 'unknown_user' : !user.passwordHash ? 'no_password_set' : 'bad_password',
        locked,
      }, ipAddress, dto.deviceId);
      throw new UnauthorizedException(INVALID_PASSWORD_MESSAGE);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(INACTIVE_MESSAGE);
    }

    this.throttle.registerSuccess(throttleKey);

    if (dto.deviceId) {
      await this.updateDeviceActivity(dto.deviceId);
    }

    await this.logAudit(user.id, 'AUTH_LOGIN_PASSWORD', {
      username: user.username,
      deviceId: dto.deviceId,
    }, ipAddress, dto.deviceId);

    return this.generateTokens(user, dto.deviceId);
  }

  /**
   * Kassa sensorli ekrani uchun: xodim tanlanadi + PIN kod.
   * PIN bcrypt hash bilan solishtiriladi; PIN hech qachon log/auditga yozilmaydi.
   */
  async pinLogin(dto: PinLoginDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: dto.userIdentifier }, { username: dto.userIdentifier }],
      },
    });

    const throttleKey = `pin:${user?.id ?? dto.userIdentifier}`;
    this.throttle.assertNotLocked(throttleKey);

    const isPinValid = await bcrypt.compare(dto.pin, user?.pinHash || DUMMY_HASH);
    if (!user || !isPinValid) {
      const locked = this.throttle.registerFailure(throttleKey);
      await this.logAudit(user?.id ?? null, 'AUTH_LOGIN_PIN_FAILED', {
        userIdentifier: dto.userIdentifier,
        reason: user ? 'bad_pin' : 'unknown_user',
        locked,
      }, ipAddress, dto.deviceId);
      throw new UnauthorizedException(INVALID_PIN_MESSAGE);
    }

    if (!user.isActive) {
      throw new UnauthorizedException(INACTIVE_MESSAGE);
    }

    this.throttle.registerSuccess(throttleKey);

    if (dto.deviceId) {
      await this.updateDeviceActivity(dto.deviceId);
    }

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
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Yaroqsiz yoki muddati tugagan Refresh token');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi mavjud emas yoki faol emas');
    }

    return this.generateTokens(user, payload.deviceId ?? undefined);
  }

  /**
   * Kassa ekranida xodimni tanlash uchun ro'yxat (autentifikatsiyasiz).
   * Faqat ko'rsatish uchun minimal maydonlar qaytariladi — hash/limitlar yo'q.
   */
  async getActiveStaff() {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      // Login (username) qaytarilmaydi — tanlash uchun id + ism + rol yetarli
      select: {
        id: true,
        name: true,
        role: true,
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
      secret: getJwtAccessSecret(),
      expiresIn: getJwtAccessExpiration() as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: getJwtRefreshSecret(),
      expiresIn: getJwtRefreshExpiration() as any,
    });

    const decoded = this.jwtService.decode(accessToken) as { exp?: number; iat?: number } | null;
    const expiresIn = decoded?.exp && decoded?.iat ? decoded.exp - decoded.iat : 15 * 60;

    return {
      accessToken,
      refreshToken,
      expiresIn,
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

  private async logAudit(
    userId: string | null,
    action: string,
    details: Record<string, unknown>,
    ipAddress?: string,
    deviceId?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateUUIDv7(),
          userId,
          action,
          details: details as any,
          ipAddress: ipAddress || null,
          deviceId,
        },
      });
    } catch (e) {
      // Xato tafsilotini emas, faqat xabarni yozamiz (maxfiy ma'lumot sizib chiqmasligi uchun)
      this.logger.error(`Audit log saqlashda xato: ${(e as Error).message}`);
    }
  }
}
