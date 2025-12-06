/**
 * Roles decorator for RBAC
 */

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Specifies required roles for accessing a route
 *
 * @example
 * @Roles('ADMIN', 'SUPERADMIN')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * async adminEndpoint() { ... }
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
