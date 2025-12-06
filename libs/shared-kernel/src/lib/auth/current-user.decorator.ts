/**
 * Current user decorator
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from './auth.types';

/**
 * Extracts current user from request
 *
 * Usage:
 * - @CurrentUser() user: AuthenticatedUser - gets entire user object
 * - @CurrentUser('sub') userId: string - gets specific property
 * - @CurrentUser('userId') userId: string - gets userId (alias for sub)
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    return data ? user?.[data] : user;
  }
);
