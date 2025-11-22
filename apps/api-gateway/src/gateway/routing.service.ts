/**
 * Routing Service
 * Determines which service should handle a request
 */

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { ServiceRoute } from './gateway.types';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private routes: ServiceRoute[] = [];

  /**
   * Register service routes
   */
  registerRoutes(routes: ServiceRoute[]): void {
    this.routes = routes.filter((r) => r.enabled !== false);
    this.logger.log(`Registered ${this.routes.length} service routes`);
    this.routes.forEach((route) => {
      this.logger.log(`  - ${route.prefix} -> ${route.baseUrl}`);
    });
  }

  /**
   * Find route for a given path
   */
  findRoute(path: string): ServiceRoute {
    // Find the most specific matching route (longest prefix)
    const matchingRoutes = this.routes.filter((route) =>
      path.startsWith(route.prefix)
    );

    if (matchingRoutes.length === 0) {
      throw new NotFoundException(`No service found for path: ${path}`);
    }

    // Sort by prefix length (descending) and return the first
    matchingRoutes.sort((a, b) => b.prefix.length - a.prefix.length);

    return matchingRoutes[0];
  }

  /**
   * Get all registered routes
   */
  getRoutes(): ServiceRoute[] {
    return [...this.routes];
  }

  /**
   * Check if a service is registered
   */
  hasRoute(prefix: string): boolean {
    return this.routes.some((r) => r.prefix === prefix);
  }

  /**
   * Get route by service name
   */
  getRouteByName(name: string): ServiceRoute | undefined {
    return this.routes.find((r) => r.name === name);
  }
}
