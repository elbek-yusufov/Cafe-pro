import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@oshxona/db';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { effectiveRoles } from '../roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('Ruxsat berilmagan: foydalanuvchi aniqlanmadi');
    }

    // Ierarxiya: OWNER ADMIN huquqiga, MANAGER CASHIER huquqiga ega va h.k. (auth/roles.ts)
    const granted = effectiveRoles(user.role);
    const hasRole = requiredRoles.some((r) => granted.includes(r as any));
    if (!hasRole) {
      throw new ForbiddenException(
        `Ruxsat yo'q: bu amalni faqat [${requiredRoles.join(', ')}] rollari bajara oladi`,
      );
    }

    return true;
  }
}
