/**
 * Version manager for API version resolution and validation
 */

import {
  Version,
  VersionMetadata,
  VersionStatus,
  VersionCompatibility,
} from './version.types';
import { compareVersions, formatVersion, parseVersion } from './version.utils';

/**
 * Manages API versions and compatibility
 */
export class VersionManager {
  private versions = new Map<string, VersionMetadata>();
  private defaultVersion?: Version;

  /**
   * Register a new API version
   */
  registerVersion(metadata: VersionMetadata): void {
    const key = this.getVersionKey(metadata.version);
    this.versions.set(key, metadata);
  }

  /**
   * Set default version
   */
  setDefaultVersion(version: Version | string): void {
    this.defaultVersion =
      typeof version === 'string' ? parseVersion(version) : version;
  }

  /**
   * Get default version
   */
  getDefaultVersion(): Version | undefined {
    return this.defaultVersion;
  }

  /**
   * Get version metadata
   */
  getVersionMetadata(version: Version | string): VersionMetadata | undefined {
    const v = typeof version === 'string' ? parseVersion(version) : version;
    return this.versions.get(this.getVersionKey(v));
  }

  /**
   * Get all registered versions
   */
  getAllVersions(): VersionMetadata[] {
    return Array.from(this.versions.values()).sort((a, b) =>
      compareVersions(b.version, a.version)
    );
  }

  /**
   * Get all stable versions
   */
  getStableVersions(): VersionMetadata[] {
    return this.getAllVersions().filter(
      (v) => v.status === VersionStatus.STABLE
    );
  }

  /**
   * Get latest stable version
   */
  getLatestStableVersion(): VersionMetadata | undefined {
    const stable = this.getStableVersions();
    return stable.length > 0 ? stable[0] : undefined;
  }

  /**
   * Check if version exists
   */
  hasVersion(version: Version | string): boolean {
    const v = typeof version === 'string' ? parseVersion(version) : version;
    return this.versions.has(this.getVersionKey(v));
  }

  /**
   * Check if version is deprecated
   */
  isVersionDeprecated(version: Version | string): boolean {
    const metadata = this.getVersionMetadata(version);
    return (
      metadata?.status === VersionStatus.DEPRECATED ||
      metadata?.status === VersionStatus.SUNSET
    );
  }

  /**
   * Check if version is sunset (removed)
   */
  isVersionSunset(version: Version | string): boolean {
    const metadata = this.getVersionMetadata(version);
    return metadata?.status === VersionStatus.SUNSET;
  }

  /**
   * Resolve requested version to actual version
   */
  resolveVersion(requestedVersion?: Version | string): VersionCompatibility {
    let requested: Version;

    // Use requested version or default
    if (requestedVersion) {
      requested =
        typeof requestedVersion === 'string'
          ? parseVersion(requestedVersion)
          : requestedVersion;
    } else if (this.defaultVersion) {
      requested = this.defaultVersion;
    } else {
      const latest = this.getLatestStableVersion();
      if (!latest) {
        throw new Error('No versions registered');
      }
      requested = latest.version;
    }

    // Check if version exists
    if (!this.hasVersion(requested)) {
      // Try to find compatible version (same major)
      const compatible = this.findCompatibleVersion(requested);
      if (compatible) {
        return {
          compatible: true,
          requestedVersion: requested,
          resolvedVersion: compatible.version,
          warnings: [
            `Requested version ${formatVersion(
              requested
            )} not found, using ${formatVersion(compatible.version)}`,
          ],
        };
      }

      return {
        compatible: false,
        requestedVersion: requested,
        resolvedVersion: requested,
        warnings: [`Version ${formatVersion(requested)} not found`],
      };
    }

    const metadata = this.getVersionMetadata(requested);
    const warnings: string[] = [];

    // Check if sunset
    if (metadata?.status === VersionStatus.SUNSET) {
      return {
        compatible: false,
        requestedVersion: requested,
        resolvedVersion: requested,
        warnings: [
          `Version ${formatVersion(
            requested
          )} has been sunset and is no longer available`,
        ],
      };
    }

    // Add deprecation warning
    if (metadata?.status === VersionStatus.DEPRECATED) {
      warnings.push(
        `Version ${formatVersion(requested)} is deprecated${
          metadata.sunsetAt
            ? ` and will be sunset on ${metadata.sunsetAt.toISOString()}`
            : ''
        }`
      );
    }

    return {
      compatible: true,
      requestedVersion: requested,
      resolvedVersion: requested,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Find compatible version (same major version)
   */
  private findCompatibleVersion(version: Version): VersionMetadata | undefined {
    const stableVersions = this.getStableVersions();

    // Find latest stable version with same major
    return stableVersions.find((v) => v.version.major === version.major);
  }

  /**
   * Deprecate a version
   */
  deprecateVersion(version: Version | string, sunsetDate?: Date): void {
    const metadata = this.getVersionMetadata(version);
    if (!metadata) {
      throw new Error(
        `Version ${
          typeof version === 'string' ? version : formatVersion(version)
        } not found`
      );
    }

    metadata.status = VersionStatus.DEPRECATED;
    metadata.deprecatedAt = new Date();
    metadata.sunsetAt = sunsetDate;
  }

  /**
   * Sunset (remove) a version
   */
  sunsetVersion(version: Version | string): void {
    const metadata = this.getVersionMetadata(version);
    if (!metadata) {
      throw new Error(
        `Version ${
          typeof version === 'string' ? version : formatVersion(version)
        } not found`
      );
    }

    metadata.status = VersionStatus.SUNSET;
  }

  /**
   * Get version key for storage
   */
  private getVersionKey(version: Version): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }
}
