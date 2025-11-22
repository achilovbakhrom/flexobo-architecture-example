/**
 * API versioning types and interfaces
 */

/**
 * Semantic version structure
 */
export interface Version {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Version range for compatibility checks
 */
export interface VersionRange {
  min: Version;
  max?: Version;
}

/**
 * Versioning strategy types
 */
export enum VersioningStrategy {
  URI = 'URI', // /v1/users, /v2/users
  HEADER = 'HEADER', // Accept-Version: v1
  MEDIA_TYPE = 'MEDIA_TYPE', // Accept: application/vnd.api.v1+json
  QUERY_PARAM = 'QUERY_PARAM', // /users?version=1
}

/**
 * Version metadata for APIs
 */
export interface VersionMetadata {
  version: Version;
  status: VersionStatus;
  deprecatedAt?: Date;
  sunsetAt?: Date;
  description?: string;
  breakingChanges?: string[];
  migrationGuide?: string;
}

/**
 * Version lifecycle status
 */
export enum VersionStatus {
  ALPHA = 'ALPHA', // Early testing
  BETA = 'BETA', // Feature complete, testing
  STABLE = 'STABLE', // Production ready
  DEPRECATED = 'DEPRECATED', // Still works but discouraged
  SUNSET = 'SUNSET', // Removed/disabled
}

/**
 * Version compatibility result
 */
export interface VersionCompatibility {
  compatible: boolean;
  requestedVersion: Version;
  resolvedVersion: Version;
  warnings?: string[];
}

/**
 * Versioned API endpoint metadata
 */
export interface VersionedEndpoint {
  path: string;
  method: string;
  version: Version;
  handler: string;
  deprecated?: boolean;
}

/**
 * Message schema version for events/commands
 */
export interface MessageSchemaVersion {
  messageType: string;
  version: Version;
  schema: Record<string, unknown>;
  compatibleWith?: VersionRange;
}
