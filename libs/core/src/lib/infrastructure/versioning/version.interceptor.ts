/**
 * NestJS interceptor for API versioning
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { VersionManager } from './version.manager';
import { VersioningStrategy, Version } from './version.types';
import { parseVersion } from './version.utils';

/**
 * Interceptor to handle API versioning
 */
@Injectable()
export class VersionInterceptor implements NestInterceptor {
  constructor(
    private readonly versionManager: VersionManager,
    private readonly strategy: VersioningStrategy = VersioningStrategy.URI
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Extract requested version
    const requestedVersion = this.extractVersion(request);

    // Resolve version
    const compatibility = this.versionManager.resolveVersion(requestedVersion);

    // Handle sunset version
    if (!compatibility.compatible) {
      throw new GoneException(
        compatibility.warnings?.[0] || 'API version no longer available'
      );
    }

    // Add version headers to response
    response.setHeader(
      'API-Version',
      this.formatVersionForHeader(compatibility.resolvedVersion)
    );

    if (compatibility.warnings && compatibility.warnings.length > 0) {
      response.setHeader(
        'API-Deprecation-Warning',
        compatibility.warnings.join('; ')
      );
    }

    // Store resolved version in request for handlers to use
    request.apiVersion = compatibility.resolvedVersion;

    return next.handle().pipe(
      tap(() => {
        // Additional post-processing if needed
      })
    );
  }

  /**
   * Extract version from request based on strategy
   */
  private extractVersion(
    request: Request & {
      headers: Record<string, string>;
      query: Record<string, string>;
      url: string;
    }
  ): Version | undefined {
    switch (this.strategy) {
      case VersioningStrategy.URI:
        return this.extractVersionFromUri(request.url);

      case VersioningStrategy.HEADER:
        return this.extractVersionFromHeader(request.headers);

      case VersioningStrategy.MEDIA_TYPE:
        return this.extractVersionFromMediaType(request.headers);

      case VersioningStrategy.QUERY_PARAM:
        return this.extractVersionFromQuery(request.query);

      default:
        return undefined;
    }
  }

  /**
   * Extract version from URI path (e.g., /v1/users)
   */
  private extractVersionFromUri(url: string): Version | undefined {
    const match = url.match(/\/v(\d+)(?:\.(\d+)(?:\.(\d+))?)?/);
    if (!match) {
      return undefined;
    }

    return {
      major: parseInt(match[1], 10),
      minor: match[2] ? parseInt(match[2], 10) : 0,
      patch: match[3] ? parseInt(match[3], 10) : 0,
    };
  }

  /**
   * Extract version from header (e.g., Accept-Version: v1)
   */
  private extractVersionFromHeader(
    headers: Record<string, string>
  ): Version | undefined {
    const versionHeader = headers['accept-version'] || headers['api-version'];
    if (!versionHeader) {
      return undefined;
    }

    try {
      return parseVersion(versionHeader);
    } catch {
      throw new BadRequestException(`Invalid version format: ${versionHeader}`);
    }
  }

  /**
   * Extract version from media type (e.g., Accept: application/vnd.api.v1+json)
   */
  private extractVersionFromMediaType(
    headers: Record<string, string>
  ): Version | undefined {
    const acceptHeader = headers['accept'];
    if (!acceptHeader) {
      return undefined;
    }

    const match = acceptHeader.match(
      /vnd\.api\.v(\d+)(?:\.(\d+)(?:\.(\d+))?)?/
    );
    if (!match) {
      return undefined;
    }

    return {
      major: parseInt(match[1], 10),
      minor: match[2] ? parseInt(match[2], 10) : 0,
      patch: match[3] ? parseInt(match[3], 10) : 0,
    };
  }

  /**
   * Extract version from query parameter (e.g., ?version=1)
   */
  private extractVersionFromQuery(
    query: Record<string, string>
  ): Version | undefined {
    const versionParam = query['version'] || query['api-version'];
    if (!versionParam) {
      return undefined;
    }

    try {
      return parseVersion(versionParam);
    } catch {
      throw new BadRequestException(`Invalid version format: ${versionParam}`);
    }
  }

  /**
   * Format version for response header
   */
  private formatVersionForHeader(version: Version): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }
}
