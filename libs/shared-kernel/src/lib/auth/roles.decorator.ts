/**
 * Roles decorator for RBAC
 */

import { SetMetadata } from '@nestjs/common';
import { UserRole } from './auth.types';

export const ROLES_KEY = 'roles';

/**
 * Specifies required roles for accessing a route
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
