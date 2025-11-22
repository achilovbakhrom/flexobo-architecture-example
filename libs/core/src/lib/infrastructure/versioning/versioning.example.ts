/**
 * API Versioning usage examples
 *
 * Demonstrates URI versioning, header versioning, message schema versioning,
 * deprecation handling, and version compatibility
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Module,
  UseInterceptors,
} from '@nestjs/common';
import {
  VersioningModule,
  VersionManager,
  VersionInterceptor,
  MessageVersionRegistry,
  VersioningStrategy,
  VersionStatus,
  ApiVersion,
  VersionedApi,
  parseVersion,
  formatVersion,
} from './index';

// ============================================================
// 1. URI Versioning (Recommended for REST APIs)
// ============================================================

/**
 * Version 1 Users Controller
 */
@ApiVersion('1.0.0')
@Controller('v1/users')
@UseInterceptors(VersionInterceptor)
class UsersV1Controller {
  @Get()
  findAll() {
    return {
      version: '1.0.0',
      users: [
        { id: 1, name: 'Alice' }, // Simple format
      ],
    };
  }

  @Post()
  create(@Body() createUserDto: { name: string }) {
    return { id: 1, ...createUserDto };
  }
}

/**
 * Version 2 Users Controller (Enhanced with email)
 */
@ApiVersion('2.0.0')
@Controller('v2/users')
@UseInterceptors(VersionInterceptor)
class UsersV2Controller {
  @Get()
  findAll() {
    return {
      version: '2.0.0',
      users: [
        { id: 1, name: 'Alice', email: 'alice@example.com' }, // Enhanced format
      ],
    };
  }

  @Post()
  create(@Body() createUserDto: { name: string; email: string }) {
    return { id: 1, ...createUserDto };
  }
}

/**
 * Version 1 with deprecation warning
 */
@VersionedApi('1.0.0', {
  deprecated: true,
  reason: 'Please migrate to v2 which includes email support',
  sunsetDate: new Date('2026-12-31'),
})
@Controller('v1/orders')
@UseInterceptors(VersionInterceptor)
class OrdersV1Controller {
  @Get()
  findAll() {
    // Response headers will include:
    // API-Version: 1.0.0
    // API-Deprecation-Warning: Version v1.0.0 is deprecated...
    return { version: '1.0.0', orders: [] };
  }
}

// ============================================================
// 2. Header-Based Versioning
// ============================================================

/**
 * Example with header versioning
 * Client sends: Accept-Version: v2.1.0
 */
@ApiVersion('2.1.0')
@Controller('users')
@UseInterceptors(VersionInterceptor)
class UsersHeaderVersionController {
  @Get()
  findAll() {
    // Accessed via: GET /users with header Accept-Version: v2.1.0
    return { version: '2.1.0', users: [] };
  }
}

// ============================================================
// 3. Version Manager Configuration
// ============================================================

function setupVersionManager() {
  const versionManager = new VersionManager();

  // Register v1.0.0 (stable)
  versionManager.registerVersion({
    version: { major: 1, minor: 0, patch: 0 },
    status: VersionStatus.STABLE,
    description: 'Initial release',
  });

  // Register v1.1.0 (stable with enhancements)
  versionManager.registerVersion({
    version: { major: 1, minor: 1, patch: 0 },
    status: VersionStatus.STABLE,
    description: 'Added pagination support',
  });

  // Register v2.0.0 (stable, breaking changes)
  versionManager.registerVersion({
    version: { major: 2, minor: 0, patch: 0 },
    status: VersionStatus.STABLE,
    description: 'Major redesign with new response format',
    breakingChanges: [
      'Response structure changed from array to paginated object',
      'Date fields now use ISO 8601 format',
    ],
    migrationGuide: 'https://docs.example.com/migration/v1-to-v2',
  });

  // Register v3.0.0 (beta)
  versionManager.registerVersion({
    version: { major: 3, minor: 0, patch: 0 },
    status: VersionStatus.BETA,
    description: 'GraphQL support (beta)',
  });

  // Set default version
  versionManager.setDefaultVersion('2.0.0');

  // Deprecate v1.0.0
  versionManager.deprecateVersion(
    '1.0.0',
    new Date('2026-06-30') // Sunset date
  );

  return versionManager;
}

// ============================================================
// 4. Message Schema Versioning (Events/Commands)
// ============================================================

/**
 * Event versioning example
 */
function setupMessageVersioning() {
  const registry = new MessageVersionRegistry();

  // Register OrderCreated v1.0.0
  registry.registerSchema({
    messageType: 'OrderCreated',
    version: { major: 1, minor: 0, patch: 0 },
    schema: {
      orderId: 'string',
      userId: 'string',
      amount: 'number',
      createdAt: 'string',
    },
  });

  // Register OrderCreated v2.0.0 (with line items)
  registry.registerSchema({
    messageType: 'OrderCreated',
    version: { major: 2, minor: 0, patch: 0 },
    schema: {
      orderId: 'string',
      userId: 'string',
      items: 'array',
      totalAmount: 'number',
      currency: 'string',
      createdAt: 'string',
    },
    compatibleWith: {
      min: { major: 1, minor: 0, patch: 0 },
      max: { major: 2, minor: 0, patch: 0 },
    },
  });

  // Get latest schema
  const latest = registry.getLatestSchema('OrderCreated');
  if (latest) {
    console.log('Latest version:', formatVersion(latest.version));
  }

  // Validate message
  const message = {
    orderId: 'order-123',
    userId: 'user-456',
    items: [{ productId: 'prod-1', quantity: 2 }],
    totalAmount: 99.99,
    currency: 'USD',
    createdAt: new Date().toISOString(),
  };

  const validation = registry.validateMessage('OrderCreated', '2.0.0', message);
  console.log('Valid:', validation.valid);

  // Check compatibility
  const compatible = registry.areVersionsCompatible(
    'OrderCreated',
    '1.0.0',
    '2.0.0'
  );
  console.log('v1 and v2 compatible:', compatible);

  return registry;
}

// ============================================================
// 5. Version Resolution Examples
// ============================================================

function demonstrateVersionResolution() {
  const versionManager = setupVersionManager();

  // Resolve requested version
  const resolution1 = versionManager.resolveVersion('2.0.0');
  console.log('Resolved:', formatVersion(resolution1.resolvedVersion));
  console.log('Compatible:', resolution1.compatible);

  // Resolve with no version (uses default)
  const resolution2 = versionManager.resolveVersion();
  console.log('Default version:', formatVersion(resolution2.resolvedVersion));

  // Try deprecated version
  const resolution3 = versionManager.resolveVersion('1.0.0');
  console.log('Warnings:', resolution3.warnings);
  // Output: ["Version v1.0.0 is deprecated and will be sunset on 2026-06-30..."]

  // Try non-existent version (finds compatible)
  const resolution4 = versionManager.resolveVersion('1.5.0');
  console.log(
    'Resolved to compatible:',
    formatVersion(resolution4.resolvedVersion)
  );
  // Output: Finds latest v1.x version

  // Get all stable versions
  const stableVersions = versionManager.getStableVersions();
  console.log(
    'Stable versions:',
    stableVersions.map((v) => formatVersion(v.version))
  );
}

// ============================================================
// 6. Module Configuration
// ============================================================

@Module({
  imports: [
    // URI versioning (default)
    VersioningModule.forRoot({
      strategy: VersioningStrategy.URI,
      defaultVersion: '2.0.0',
      versions: [
        {
          version: { major: 1, minor: 0, patch: 0 },
          status: VersionStatus.DEPRECATED,
          deprecatedAt: new Date('2025-01-01'),
          sunsetAt: new Date('2026-06-30'),
        },
        {
          version: { major: 2, minor: 0, patch: 0 },
          status: VersionStatus.STABLE,
        },
        {
          version: { major: 3, minor: 0, patch: 0 },
          status: VersionStatus.BETA,
        },
      ],
      global: true,
    }),
  ],
  controllers: [UsersV1Controller, UsersV2Controller, OrdersV1Controller],
})
class AppModuleUriVersioning {}

@Module({
  imports: [
    // Header versioning
    VersioningModule.forRoot({
      strategy: VersioningStrategy.HEADER,
      defaultVersion: '2.0.0',
      global: true,
    }),
  ],
  controllers: [UsersHeaderVersionController],
})
class AppModuleHeaderVersioning {}

@Module({
  imports: [
    // Media type versioning
    VersioningModule.forRoot({
      strategy: VersioningStrategy.MEDIA_TYPE,
      defaultVersion: '1.0.0',
      global: true,
    }),
  ],
})
class AppModuleMediaTypeVersioning {}

// ============================================================
// 7. Version Utility Examples
// ============================================================

function demonstrateVersionUtils() {
  // Parse version strings
  const v1 = parseVersion('1.2.3');
  const v2 = parseVersion('v2.0.0');
  console.log('Parsed:', v1, v2);

  // Format versions
  console.log('With v:', formatVersion(v1, true)); // "v1.2.3"
  console.log('Without v:', formatVersion(v1, false)); // "1.2.3"

  // Compare versions
  const comparison = v1.major - v2.major;
  console.log('v1 < v2:', comparison < 0);

  // Generate next versions
  const nextMajor = { major: v1.major + 1, minor: 0, patch: 0 };
  const nextMinor = { major: v1.major, minor: v1.minor + 1, patch: 0 };
  const nextPatch = { major: v1.major, minor: v1.minor, patch: v1.patch + 1 };

  console.log('Next major:', formatVersion(nextMajor)); // "v2.0.0"
  console.log('Next minor:', formatVersion(nextMinor)); // "v1.3.0"
  console.log('Next patch:', formatVersion(nextPatch)); // "v1.2.4"
}

// ============================================================
// 8. Client Usage Examples
// ============================================================

/**
 * HTTP Client Examples:
 *
 * URI Versioning:
 * GET /v1/users
 * GET /v2/users
 *
 * Header Versioning:
 * GET /users
 * Accept-Version: v2.0.0
 *
 * Media Type Versioning:
 * GET /users
 * Accept: application/vnd.api.v2+json
 *
 * Query Parameter Versioning:
 * GET /users?version=2.0.0
 */

/**
 * Response Headers:
 *
 * API-Version: 2.0.0
 * API-Deprecation-Warning: Version v1.0.0 is deprecated and will be sunset on 2026-06-30
 */

/**
 * Migration Path Example:
 *
 * 1. Release v2.0.0 as stable
 * 2. Mark v1.0.0 as deprecated with sunset date
 * 3. Both versions run in parallel
 * 4. Clients gradually migrate to v2
 * 5. After sunset date, remove v1 endpoints
 */

export {
  UsersV1Controller,
  UsersV2Controller,
  OrdersV1Controller,
  UsersHeaderVersionController,
  AppModuleUriVersioning,
  AppModuleHeaderVersioning,
  AppModuleMediaTypeVersioning,
  setupVersionManager,
  setupMessageVersioning,
  demonstrateVersionResolution,
  demonstrateVersionUtils,
};
