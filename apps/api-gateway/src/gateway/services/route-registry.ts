/**
 * Route Registry Implementation
 *
 * Manages route registration and provides route matching using Strategy Pattern.
 * Follows Open/Closed Principle - new matching strategies can be added without modification.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IRouteRegistry,
  IRouteMatchStrategy,
  IServiceRegistry,
  RouteDefinition,
  RouteMatch,
  SERVICE_REGISTRY,
  ROUTE_MATCH_STRATEGIES,
} from '../interfaces';

@Injectable()
export class RouteRegistry implements IRouteRegistry {
  private readonly logger = new Logger(RouteRegistry.name);
  private readonly routes: RouteDefinition[] = [];

  constructor(
    @Inject(SERVICE_REGISTRY)
    private readonly serviceRegistry: IServiceRegistry,
    @Inject(ROUTE_MATCH_STRATEGIES)
    private readonly matchStrategies: IRouteMatchStrategy[]
  ) {}

  /**
   * Register a new route
   */
  registerRoute(route: RouteDefinition): void {
    // Validate service exists
    if (!this.serviceRegistry.hasService(route.serviceName)) {
      this.logger.warn(
        `Registering route for non-existent service: ${route.serviceName}`
      );
    }

    // Check for duplicate patterns
    const existing = this.routes.find(
      (r) => r.pattern === route.pattern && r.matchType === route.matchType
    );

    if (existing) {
      this.logger.warn(`Route pattern '${route.pattern}' already registered`);
      // Update existing route
      Object.assign(existing, route);
    } else {
      this.routes.push(route);
      this.logger.log(
        `Registered route: [${route.matchType}] ${route.pattern} -> ${route.serviceName}`
      );
    }

    // Sort routes by specificity (exact > regex > prefix, then by pattern length)
    this.sortRoutes();
  }

  /**
   * Register multiple routes at once
   */
  registerRoutes(routes: RouteDefinition[]): void {
    for (const route of routes) {
      this.registerRoute(route);
    }
  }

  /**
   * Unregister all routes for a service
   */
  unregisterServiceRoutes(serviceName: string): void {
    const initialLength = this.routes.length;
    const indicesToRemove: number[] = [];

    for (let i = 0; i < this.routes.length; i++) {
      if (this.routes[i].serviceName === serviceName) {
        indicesToRemove.push(i);
      }
    }

    // Remove in reverse order to maintain indices
    for (let i = indicesToRemove.length - 1; i >= 0; i--) {
      this.routes.splice(indicesToRemove[i], 1);
    }

    const removed = initialLength - this.routes.length;
    if (removed > 0) {
      this.logger.log(
        `Unregistered ${removed} routes for service: ${serviceName}`
      );
    }
  }

  /**
   * Get all registered routes
   */
  getAllRoutes(): RouteDefinition[] {
    return [...this.routes];
  }

  /**
   * Find matching route for a path
   */
  findRoute(path: string): RouteMatch | null {
    for (const route of this.routes) {
      const strategy = this.matchStrategies.find((s) =>
        s.canHandle(route.matchType)
      );

      if (!strategy) {
        this.logger.warn(`No strategy found for match type: ${route.matchType}`);
        continue;
      }

      const result = strategy.match(path, route.pattern);

      if (result?.matched) {
        const service = this.serviceRegistry.getService(route.serviceName);

        if (!service) {
          this.logger.warn(
            `Service '${route.serviceName}' not found for matched route`
          );
          continue;
        }

        if (service.enabled === false) {
          this.logger.debug(
            `Service '${route.serviceName}' is disabled, skipping`
          );
          continue;
        }

        // Apply path rewrite rules
        let transformedPath = result.remainingPath;
        if (route.pathRewrite) {
          transformedPath = this.applyPathRewrite(
            transformedPath,
            route.pathRewrite
          );
        }

        return {
          route,
          service,
          params: result.params,
          transformedPath,
        };
      }
    }

    return null;
  }

  /**
   * Sort routes by specificity
   */
  private sortRoutes(): void {
    const priority: Record<string, number> = {
      exact: 3,
      regex: 2,
      prefix: 1,
    };

    this.routes.sort((a, b) => {
      // First by match type priority
      const priorityDiff =
        (priority[b.matchType] || 0) - (priority[a.matchType] || 0);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by pattern length (longer = more specific)
      return b.pattern.length - a.pattern.length;
    });
  }

  /**
   * Apply path rewrite rules
   */
  private applyPathRewrite(
    path: string,
    rules: { match: string | RegExp; replace: string }[]
  ): string {
    let result = path;

    for (const rule of rules) {
      if (typeof rule.match === 'string') {
        result = result.replace(rule.match, rule.replace);
      } else {
        result = result.replace(rule.match, rule.replace);
      }
    }

    return result;
  }
}
