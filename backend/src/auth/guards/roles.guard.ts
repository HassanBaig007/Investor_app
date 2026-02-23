import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.role) return false;

    // specialized logic: super_admin triggers all
    if (user.role === 'super_admin') return true;

    const hasRole = roles.some((role) => {
      if (role === 'admin') {
        return user.role === 'admin' || user.role === 'project_admin';
      }
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
