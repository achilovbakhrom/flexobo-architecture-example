import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ENTITY_PERMISSION_KEY = 'entity_permission';

export type EntityAction = 'read' | 'update' | 'delete' | 'manage';

export interface EntityPermissionMetadata {
  entityType: string;
  action: EntityAction;
  getEntityId: (request: unknown) => string;
  getOwnerId?: (entity: unknown) => string;
}

export const ENTITY_PERMISSION_CHECKER = Symbol('ENTITY_PERMISSION_CHECKER');

/**
 * Interface for checking entity-level permissions
 */
export interface IEntityPermissionChecker {
  canAccess(
    userId: string,
    entityType: string,
    entityId: string,
    action: EntityAction
  ): Promise<boolean>;
  isOwner(userId: string, entityType: string, entityId: string): Promise<boolean>;
}

/**
 * Decorator to require entity-level permission
 */
export const RequireEntityPermission = (
  entityType: string,
  action: EntityAction,
  getEntityId: (request: unknown) => string,
  getOwnerId?: (entity: unknown) => string
) =>
  SetMetadata(ENTITY_PERMISSION_KEY, {
    entityType,
    action,
    getEntityId,
    getOwnerId,
  });

/**
 * Guard that checks entity-level permissions
 */
@Injectable()
export class EntityPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(ENTITY_PERMISSION_CHECKER)
    private readonly permissionChecker?: IEntityPermissionChecker
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<EntityPermissionMetadata>(
      ENTITY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const entityId = metadata.getEntityId(request);

    if (!entityId) {
      throw new ForbiddenException('Entity ID required');
    }

    const userId = user.id || user.user;

    // If no permission checker is injected, check ownership from request context
    if (!this.permissionChecker) {
      // For 'manage' action, user must be owner
      if (metadata.action === 'manage') {
        const entity = request.entity;
        if (!entity) {
          // Can't check ownership without entity, deny by default
          throw new ForbiddenException('Cannot verify ownership');
        }
        const ownerId = metadata.getOwnerId
          ? metadata.getOwnerId(entity)
          : (entity as { ownerId?: string; userId?: string }).ownerId ||
            (entity as { userId?: string }).userId;
        if (ownerId !== userId) {
          throw new ForbiddenException('You do not have permission to manage this entity');
        }
      }
      return true;
    }

    // Use the permission checker service
    const canAccess = await this.permissionChecker.canAccess(
      userId,
      metadata.entityType,
      entityId,
      metadata.action
    );

    if (!canAccess) {
      throw new ForbiddenException(
        `You do not have permission to ${metadata.action} this ${metadata.entityType}`
      );
    }

    return true;
  }
}

/**
 * Decorator for owner-only actions
 * Shorthand for RequireEntityPermission with 'manage' action
 */
export const OwnerOnly = (
  entityType: string,
  getEntityId: (request: unknown) => string
) => RequireEntityPermission(entityType, 'manage', getEntityId);
