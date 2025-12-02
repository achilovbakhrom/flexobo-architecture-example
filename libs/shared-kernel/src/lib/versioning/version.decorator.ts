/**
 * Decorators for API versioning
 */

import { SetMetadata, applyDecorators } from '@nestjs/common';
import { Version } from './version.types';
import { parseVersion } from './version.utils';

/**
 * Metadata key for version
 */
export const VERSION_METADATA_KEY = 'api_version';

/**
 * Metadata key for version range
 */
export const VERSION_RANGE_METADATA_KEY = 'api_version_range';

/**
 * Metadata key for deprecated flag
 */
export const DEPRECATED_METADATA_KEY = 'api_deprecated';

/**
 * Mark controller or route with specific version
 *
 * @example
 * ```typescript
 * @ApiVersion('1.0.0')
 * @Controller('users')
 * export class UsersV1Controller {
 *   @Get()
 *   findAll() { ... }
 * }
 * ```
 */
export function ApiVersion(
  version: string | Version
): MethodDecorator & ClassDecorator {
  const v = typeof version === 'string' ? parseVersion(version) : version;
  return SetMetadata(VERSION_METADATA_KEY, v);
}

/**
 * Mark controller or route as supporting multiple versions
 *
 * @example
 * ```typescript
 * @ApiVersionRange('1.0.0', '2.0.0')
 * @Controller('users')
 * export class UsersController {
 *   @Get()
 *   findAll() { ... }
 * }
 * ```
 */
export function ApiVersionRange(
  min: string | Version,
  max?: string | Version
): MethodDecorator & ClassDecorator {
  const range = {
    min: typeof min === 'string' ? parseVersion(min) : min,
    max: max ? (typeof max === 'string' ? parseVersion(max) : max) : undefined,
  };
  return SetMetadata(VERSION_RANGE_METADATA_KEY, range);
}

/**
 * Mark controller or route as deprecated
 *
 * @example
 * ```typescript
 * @ApiDeprecated('Use v2 API instead', new Date('2025-12-31'))
 * @ApiVersion('1.0.0')
 * @Controller('users')
 * export class UsersV1Controller {
 *   @Get()
 *   findAll() { ... }
 * }
 * ```
 */
export function ApiDeprecated(
  reason?: string,
  sunsetDate?: Date
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(DEPRECATED_METADATA_KEY, {
      deprecated: true,
      reason,
      sunsetDate,
    })
  );
}

/**
 * Combine version and deprecated decorators
 *
 * @example
 * ```typescript
 * @VersionedApi('1.0.0', { deprecated: true, reason: 'Use v2' })
 * @Controller('users')
 * export class UsersV1Controller { ... }
 * ```
 */
export function VersionedApi(
  version: string | Version,
  options?: {
    deprecated?: boolean;
    reason?: string;
    sunsetDate?: Date;
  }
): MethodDecorator & ClassDecorator {
  const decorators = [ApiVersion(version)];

  if (options?.deprecated) {
    decorators.push(ApiDeprecated(options.reason, options.sunsetDate));
  }

  return applyDecorators(...decorators);
}
