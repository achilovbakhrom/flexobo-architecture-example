/**
 * Route Matching Strategies (Strategy Pattern)
 *
 * Each strategy handles a specific route matching type.
 * Follows Interface Segregation and Liskov Substitution principles.
 */

import { Injectable } from '@nestjs/common';
import {
  IRouteMatchStrategy,
  RouteMatchType,
  RouteMatchResult,
} from '../interfaces';

/**
 * Prefix Matching Strategy
 * Matches paths that start with the given prefix
 */
@Injectable()
export class PrefixMatchStrategy implements IRouteMatchStrategy {
  canHandle(matchType: RouteMatchType): boolean {
    return matchType === 'prefix';
  }

  match(path: string, pattern: string): RouteMatchResult | null {
    if (!path.startsWith(pattern)) {
      return null;
    }

    // Get the remaining path after the prefix
    let remainingPath = path.substring(pattern.length);

    // Ensure remaining path starts with / or is empty
    if (remainingPath && !remainingPath.startsWith('/')) {
      // Pattern didn't match on word boundary
      // e.g., /api/v1/orders should not match /api/v1/order
      return null;
    }

    // If remaining path is empty, set to /
    if (!remainingPath) {
      remainingPath = '/';
    }

    return {
      matched: true,
      params: {},
      remainingPath,
    };
  }
}

/**
 * Exact Matching Strategy
 * Matches paths that exactly equal the pattern
 */
@Injectable()
export class ExactMatchStrategy implements IRouteMatchStrategy {
  canHandle(matchType: RouteMatchType): boolean {
    return matchType === 'exact';
  }

  match(path: string, pattern: string): RouteMatchResult | null {
    // Normalize paths for comparison
    const normalizedPath = this.normalizePath(path);
    const normalizedPattern = this.normalizePath(pattern);

    if (normalizedPath !== normalizedPattern) {
      return null;
    }

    return {
      matched: true,
      params: {},
      remainingPath: '/',
    };
  }

  private normalizePath(path: string): string {
    // Remove trailing slash for comparison (except for root)
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }
}

/**
 * Regex Matching Strategy
 * Matches paths against a regular expression pattern
 * Supports named capture groups for extracting parameters
 */
@Injectable()
export class RegexMatchStrategy implements IRouteMatchStrategy {
  private readonly regexCache = new Map<string, RegExp>();

  canHandle(matchType: RouteMatchType): boolean {
    return matchType === 'regex';
  }

  match(path: string, pattern: string): RouteMatchResult | null {
    try {
      const regex = this.getOrCreateRegex(pattern);
      const match = path.match(regex);

      if (!match) {
        return null;
      }

      // Extract named groups or indexed groups
      const params: Record<string, string> = {};

      if (match.groups) {
        Object.assign(params, match.groups);
      } else {
        // Use indexed groups
        for (let i = 1; i < match.length; i++) {
          if (match[i] !== undefined) {
            params[`$${i}`] = match[i];
          }
        }
      }

      // Calculate remaining path (everything after the match)
      const matchedLength = match[0].length;
      let remainingPath = path.substring(matchedLength);

      if (!remainingPath || !remainingPath.startsWith('/')) {
        remainingPath = '/' + (remainingPath || '');
      }

      return {
        matched: true,
        params,
        remainingPath,
      };
    } catch {
      // Invalid regex pattern
      return null;
    }
  }

  private getOrCreateRegex(pattern: string): RegExp {
    let regex = this.regexCache.get(pattern);

    if (!regex) {
      regex = new RegExp(pattern);
      this.regexCache.set(pattern, regex);
    }

    return regex;
  }
}

/**
 * Path Parameter Matching Strategy
 * Matches paths with dynamic segments like /users/:id/orders/:orderId
 */
@Injectable()
export class PathParamMatchStrategy implements IRouteMatchStrategy {
  private readonly patternCache = new Map<string, RegExp>();
  private readonly paramNamesCache = new Map<string, string[]>();

  canHandle(matchType: RouteMatchType): boolean {
    // This strategy extends prefix matching with path parameters
    return matchType === 'prefix';
  }

  match(path: string, pattern: string): RouteMatchResult | null {
    // Check if pattern has path parameters
    if (!pattern.includes(':')) {
      return null; // Delegate to regular prefix matching
    }

    const { regex, paramNames } = this.getOrCreatePattern(pattern);
    const match = path.match(regex);

    if (!match) {
      return null;
    }

    // Extract parameters
    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
      if (match[i + 1] !== undefined) {
        params[paramNames[i]] = match[i + 1];
      }
    }

    // Calculate remaining path
    const matchedLength = match[0].length;
    let remainingPath = path.substring(matchedLength);

    if (!remainingPath) {
      remainingPath = '/';
    } else if (!remainingPath.startsWith('/')) {
      remainingPath = '/' + remainingPath;
    }

    return {
      matched: true,
      params,
      remainingPath,
    };
  }

  private getOrCreatePattern(
    pattern: string
  ): { regex: RegExp; paramNames: string[] } {
    let regex = this.patternCache.get(pattern);
    let paramNames = this.paramNamesCache.get(pattern);

    if (!regex || !paramNames) {
      paramNames = [];

      // Convert :param to named capture groups
      const regexPattern = pattern.replace(
        /:([a-zA-Z_][a-zA-Z0-9_]*)/g,
        (_, name) => {
          paramNames!.push(name);
          return '([^/]+)';
        }
      );

      // Escape special regex characters (except the groups we created)
      const escaped = regexPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\(\[\^\/\]\+\\\)/g, '([^/]+)'); // Restore our capture groups

      regex = new RegExp(`^${escaped}`);

      this.patternCache.set(pattern, regex);
      this.paramNamesCache.set(pattern, paramNames);
    }

    return { regex, paramNames };
  }
}

/**
 * Factory function to create all default strategies
 */
export function createDefaultStrategies(): IRouteMatchStrategy[] {
  return [
    new ExactMatchStrategy(),
    new RegexMatchStrategy(),
    new PathParamMatchStrategy(),
    new PrefixMatchStrategy(), // Should be last as it's least specific
  ];
}
