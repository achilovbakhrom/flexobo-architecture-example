import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

export const PERMISSION_CHECKER = Symbol('PERMISSION_CHECKER');

/**
 * Interface for permission checking service
 * Services should implement this interface to provide permission checking logic
 */
export interface IPermissionChecker {
  hasPermissions(
    userId: string,
    permissions: string[],
    companyId?: string
  ): Promise<boolean>;
  getUserPermissions(userId: string, companyId?: string): Promise<string[]>;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(PERMISSION_CHECKER)
    private readonly permissionChecker?: IPermissionChecker
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // If no permission checker is injected, check user.permissions directly
    if (!this.permissionChecker) {
      const userPermissions = user.permissions || [];
      const hasAllPermissions = requiredPermissions.every((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Missing required permissions: ${requiredPermissions.filter((p) => !userPermissions.includes(p)).join(', ')}`
        );
      }

      return true;
    }

    // Use the permission checker service
    const companyId = request.headers['x-company-id'] || user.companyId;

    const hasPermissions = await this.permissionChecker.hasPermissions(
      user.id || user.user,
      requiredPermissions,
      companyId
    );

    if (!hasPermissions) {
      throw new ForbiddenException(
        `Missing required permissions: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
