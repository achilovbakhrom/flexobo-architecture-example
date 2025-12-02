/**
 * Registry for message schema versions (events, commands)
 */

import { MessageSchemaVersion, Version, VersionRange } from './version.types';
import { isVersionInRange, parseVersion, formatVersion } from './version.utils';

/**
 * Registry for managing message schema versions
 */
export class MessageVersionRegistry {
  private schemas = new Map<string, MessageSchemaVersion[]>();

  /**
   * Register a message schema version
   */
  registerSchema(schema: MessageSchemaVersion): void {
    const existing = this.schemas.get(schema.messageType) || [];
    existing.push(schema);

    // Sort by version (newest first)
    existing.sort((a, b) => {
      if (a.version.major !== b.version.major) {
        return b.version.major - a.version.major;
      }
      if (a.version.minor !== b.version.minor) {
        return b.version.minor - a.version.minor;
      }
      return b.version.patch - a.version.patch;
    });

    this.schemas.set(schema.messageType, existing);
  }

  /**
   * Get schema for specific message type and version
   */
  getSchema(
    messageType: string,
    version: Version | string
  ): MessageSchemaVersion | undefined {
    const v = typeof version === 'string' ? parseVersion(version) : version;
    const schemas = this.schemas.get(messageType);

    if (!schemas) {
      return undefined;
    }

    return schemas.find(
      (s) =>
        s.version.major === v.major &&
        s.version.minor === v.minor &&
        s.version.patch === v.patch
    );
  }

  /**
   * Get latest schema version for message type
   */
  getLatestSchema(messageType: string): MessageSchemaVersion | undefined {
    const schemas = this.schemas.get(messageType);
    return schemas?.[0]; // Already sorted newest first
  }

  /**
   * Get all versions for message type
   */
  getAllVersions(messageType: string): MessageSchemaVersion[] {
    return this.schemas.get(messageType) || [];
  }

  /**
   * Check if schema version exists
   */
  hasSchema(messageType: string, version: Version | string): boolean {
    return this.getSchema(messageType, version) !== undefined;
  }

  /**
   * Find compatible schema version
   */
  findCompatibleSchema(
    messageType: string,
    version: Version | string
  ): MessageSchemaVersion | undefined {
    const v = typeof version === 'string' ? parseVersion(version) : version;
    const schemas = this.schemas.get(messageType);

    if (!schemas) {
      return undefined;
    }

    // Try exact match first
    const exact = this.getSchema(messageType, v);
    if (exact) {
      return exact;
    }

    // Try to find compatible version within range
    return schemas.find((schema) => {
      if (!schema.compatibleWith) {
        return false;
      }
      return isVersionInRange(v, schema.compatibleWith);
    });
  }

  /**
   * Get compatibility range for message schema
   */
  getCompatibilityRange(
    messageType: string,
    version: Version | string
  ): VersionRange | undefined {
    const schema = this.getSchema(messageType, version);
    return schema?.compatibleWith;
  }

  /**
   * Check if two message versions are compatible
   */
  areVersionsCompatible(
    messageType: string,
    v1: Version | string,
    v2: Version | string
  ): boolean {
    const schema1 = this.getSchema(messageType, v1);
    const schema2 = this.getSchema(messageType, v2);

    if (!schema1 || !schema2) {
      return false;
    }

    // Same version is always compatible
    const version1 = typeof v1 === 'string' ? parseVersion(v1) : v1;
    const version2 = typeof v2 === 'string' ? parseVersion(v2) : v2;

    if (
      version1.major === version2.major &&
      version1.minor === version2.minor &&
      version1.patch === version2.patch
    ) {
      return true;
    }

    // Check if v2 is within v1's compatibility range
    if (
      schema1.compatibleWith &&
      isVersionInRange(version2, schema1.compatibleWith)
    ) {
      return true;
    }

    // Check if v1 is within v2's compatibility range
    if (
      schema2.compatibleWith &&
      isVersionInRange(version1, schema2.compatibleWith)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Validate message against schema version
   */
  validateMessage(
    messageType: string,
    version: Version | string,
    message: Record<string, unknown>
  ): { valid: boolean; errors?: string[] } {
    const schema = this.getSchema(messageType, version);

    if (!schema) {
      return {
        valid: false,
        errors: [
          `Schema not found for ${messageType} version ${
            typeof version === 'string' ? version : formatVersion(version)
          }`,
        ],
      };
    }

    // Basic validation: check if all required schema fields are present
    const errors: string[] = [];
    const schemaKeys = Object.keys(schema.schema);

    for (const key of schemaKeys) {
      if (!(key in message)) {
        errors.push(`Missing required field: ${key}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Get migration path between versions
   */
  getMigrationPath(
    messageType: string,
    fromVersion: Version | string,
    toVersion: Version | string
  ): MessageSchemaVersion[] {
    const from =
      typeof fromVersion === 'string' ? parseVersion(fromVersion) : fromVersion;
    const to =
      typeof toVersion === 'string' ? parseVersion(toVersion) : toVersion;
    const allVersions = this.getAllVersions(messageType);

    // Filter versions between from and to
    const path = allVersions.filter((schema) => {
      const v = schema.version;

      // Check if version is between from and to
      if (from.major < to.major) {
        // Forward migration
        return (
          (v.major > from.major ||
            (v.major === from.major && v.minor > from.minor)) &&
          (v.major < to.major || (v.major === to.major && v.minor <= to.minor))
        );
      } else if (from.major > to.major) {
        // Backward migration (downgrade)
        return (
          (v.major < from.major ||
            (v.major === from.major && v.minor < from.minor)) &&
          (v.major > to.major || (v.major === to.major && v.minor >= to.minor))
        );
      }

      return false;
    });

    // Sort path
    if (from.major < to.major) {
      // Forward: ascending order
      path.reverse();
    }

    return path;
  }
}
