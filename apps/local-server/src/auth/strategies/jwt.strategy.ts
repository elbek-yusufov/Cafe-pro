import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '@oshxona/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'oshxona-pos-access-secret-key-32chars-min-change-in-prod',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        discountLimit: true,
        isActive: true,
        branchId: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki hisob bloklangan');
    }

    return {
      ...user,
      deviceId: payload.deviceId,
    };
  }
}
