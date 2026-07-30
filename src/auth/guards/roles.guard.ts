import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithContext } from '../../common/types/request-with-context';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../roles.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const userRole = request.user?.role as Role | undefined;

    if (userRole && roles.includes(userRole)) {
      return true;
    }

    throw new ForbiddenException();
  }
}
