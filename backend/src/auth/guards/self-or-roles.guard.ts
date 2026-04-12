import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SELF_OR_ROLES_KEY } from '../decorators/self-or-roles.decorator';
import { Role } from '../roles/role.enum';

@Injectable()
export class SelfOrRolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>(SELF_OR_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user?.id) return false;
    if (user.role === Role.SUPERACCESS) return true;

    const paramId = request.params?.id;
    if (paramId && user.id === paramId) return true;

    if (!roles?.length) return false;
    return roles.includes(user.role);
  }
}

