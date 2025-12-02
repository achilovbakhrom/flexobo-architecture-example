/**
 * Version utility functions
 */

import { Version, VersionRange } from './version.types';

/**
 * Parse semantic version string (e.g., "1.2.3" or "v1.2.3")
 */
export function parseVersion(versionString: string): Version {
  const cleaned = versionString.replace(/^v/, '');
  const parts = cleaned.split('.').map((p) => parseInt(p, 10));

  if (parts.length < 1 || parts.length > 3) {
    throw new Error(`Invalid version format: ${versionString}`);
  }

  if (parts.some((p) => isNaN(p) || p < 0)) {
    throw new Error(`Invalid version numbers: ${versionString}`);
  }

  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * Format version as string
 */
export function formatVersion(version: Version, includeV = true): string {
  const formatted = `${version.major}.${version.minor}.${version.patch}`;
  return includeV ? `v${formatted}` : formatted;
}

/**
 * Compare two versions
 * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: Version, v2: Version): number {
  if (v1.major !== v2.major) {
    return v1.major > v2.major ? 1 : -1;
  }

  if (v1.minor !== v2.minor) {
    return v1.minor > v2.minor ? 1 : -1;
  }

  if (v1.patch !== v2.patch) {
    return v1.patch > v2.patch ? 1 : -1;
  }

  return 0;
}

/**
 * Check if version is greater than or equal to another
 */
export function isVersionGreaterOrEqual(v1: Version, v2: Version): boolean {
  return compareVersions(v1, v2) >= 0;
}

/**
 * Check if version is less than or equal to another
 */
export function isVersionLessOrEqual(v1: Version, v2: Version): boolean {
  return compareVersions(v1, v2) <= 0;
}

/**
 * Check if version is within range
 */
export function isVersionInRange(
  version: Version,
  range: VersionRange
): boolean {
  const aboveMin = isVersionGreaterOrEqual(version, range.min);

  if (!range.max) {
    return aboveMin;
  }

  const belowMax = isVersionLessOrEqual(version, range.max);
  return aboveMin && belowMax;
}

/**
 * Check if versions are compatible (same major version)
 */
export function areVersionsCompatible(v1: Version, v2: Version): boolean {
  return v1.major === v2.major;
}

/**
 * Get next major version
 */
export function nextMajor(version: Version): Version {
  return {
    major: version.major + 1,
    minor: 0,
    patch: 0,
  };
}

/**
 * Get next minor version
 */
export function nextMinor(version: Version): Version {
  return {
    major: version.major,
    minor: version.minor + 1,
    patch: 0,
  };
}

/**
 * Get next patch version
 */
export function nextPatch(version: Version): Version {
  return {
    major: version.major,
    minor: version.minor,
    patch: version.patch + 1,
  };
}

/**
 * Extract major version number from version string
 */
export function extractMajorVersion(versionString: string): number {
  const version = parseVersion(versionString);
  return version.major;
}

/**
 * Create version range from strings
 */
export function createVersionRange(min: string, max?: string): VersionRange {
  return {
    min: parseVersion(min),
    max: max ? parseVersion(max) : undefined,
  };
}
