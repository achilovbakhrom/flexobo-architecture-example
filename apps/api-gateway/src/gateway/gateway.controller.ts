/**
 * API Gateway Controller
 *
 * Main entry point for all incoming HTTP requests.
 * Uses SOLID principles with dependency injection.
 */

import {
  All,
  Controller,
  Req,
  Res,
  Next,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { Traced } from '@flexobo/core';
import {
  IRouteRegistry,
  IProxyService,
  IHealthChecker,
  ROUTE_REGISTRY,
  PROXY_SERVICE,
  HEALTH_CHECKER,
} from './interfaces';

@ApiTags('Gateway')
@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  /** Paths that should be handled by the gateway itself, not proxied */
  private readonly internalPaths = [
    '/api/docs',
    '/api/discovery',
    '/health',
    '/api/health',
    '/api/gateway',
  ];

  constructor(
    @Inject(ROUTE_REGISTRY)
    private readonly routeRegistry: IRouteRegistry,
    @Inject(PROXY_SERVICE)
    private readonly proxyService: IProxyService,
    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: IHealthChecker
  ) {}

  /**
   * Gateway status endpoint
   */
  @Get('api/gateway/status')
  @ApiOperation({ summary: 'Get gateway status and service health' })
  @ApiResponse({
    status: 200,
    description: 'Gateway status with service health information',
  })
  getStatus() {
    const healthSummary = this.healthChecker.getHealthSummary();
    const routes = this.routeRegistry.getAllRoutes();

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: healthSummary,
      routes: routes.map((r) => ({
        pattern: r.pattern,
        matchType: r.matchType,
        service: r.serviceName,
      })),
    };
  }

  /**
   * Get health status of all services
   */
  @Get('api/gateway/health')
  @ApiOperation({ summary: 'Get health status of all registered services' })
  @ApiResponse({
    status: 200,
    description: 'Health status of all services',
  })
  async getServicesHealth() {
    const statuses = this.healthChecker.getAllHealthStatuses();
    const services: Record<string, unknown> = {};

    statuses.forEach((status, name) => {
      services[name] = {
        status: status.status,
        latency: status.latency,
        lastChecked: status.lastChecked.toISOString(),
        error: status.error,
      };
    });

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  /**
   * Handle all requests and proxy to appropriate service
   */
  @All('*')
  @ApiExcludeEndpoint()
  @Traced('GatewayController.proxyRequest')
  async proxyRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    const path = req.path;
    const method = req.method;

    // Skip internal paths - let other controllers handle them
    if (this.isInternalPath(path)) {
      return next();
    }

    this.logger.debug(`Proxying: ${method} ${path}`);

    try {
      // Find matching route
      const routeMatch = this.routeRegistry.findRoute(path);

      if (!routeMatch) {
        this.logger.warn(`No route found for path: ${path}`);
        res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: `No service found for path: ${path}`,
          error: 'Not Found',
        });
        return;
      }

      const { service, route, transformedPath, params } = routeMatch;

      // Check service health (optional - can be disabled for performance)
      const isHealthy = this.healthChecker.isServiceHealthy(service.name);
      if (!isHealthy) {
        this.logger.warn(`Service ${service.name} is unhealthy, attempting request anyway`);
      }

      // Build proxy request
      const proxyRequest = {
        method,
        path: transformedPath || path,
        headers: this.extractHeaders(req),
        body: req.body,
        query: req.query as Record<string, string>,
      };

      // Add route params to request (useful for logging/tracing)
      if (Object.keys(params).length > 0) {
        this.logger.debug(`Route params: ${JSON.stringify(params)}`);
      }

      // Forward request to service
      const response = await this.proxyService.forward(
        service,
        proxyRequest,
        route
      );

      // Set response headers
      this.setResponseHeaders(res, response.headers);

      // Send response
      res.status(response.statusCode).send(response.body);
    } catch (error) {
      this.handleProxyError(res, error as Error);
    }
  }

  /**
   * Check if path is internal (handled by gateway)
   */
  private isInternalPath(path: string): boolean {
    return this.internalPaths.some((p) => path.startsWith(p));
  }

  /**
   * Extract headers from request
   */
  private extractHeaders(req: Request): Record<string, string> {
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      } else if (Array.isArray(value)) {
        headers[key] = value[0];
      }
    }

    // Add gateway-specific headers
    headers['x-forwarded-for'] =
      req.ip || req.socket.remoteAddress || 'unknown';
    headers['x-forwarded-host'] = req.get('host') || '';
    headers['x-forwarded-proto'] = req.protocol;

    // Generate request ID if not present
    if (!headers['x-request-id']) {
      headers['x-request-id'] = this.generateRequestId();
    }

    return headers;
  }

  /**
   * Set response headers
   */
  private setResponseHeaders(
    res: Response,
    headers: Record<string, string>
  ): void {
    // Headers to exclude from response
    const excludeHeaders = new Set([
      'transfer-encoding',
      'connection',
      'keep-alive',
    ]);

    for (const [key, value] of Object.entries(headers)) {
      if (!excludeHeaders.has(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // Add gateway headers
    res.setHeader('x-gateway', 'flexobo-api-gateway');
  }

  /**
   * Handle proxy errors
   */
  private handleProxyError(res: Response, error: Error): void {
    this.logger.error(`Proxy error: ${error.message}`, error.stack);

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();

      res.status(status).json(
        typeof response === 'string'
          ? {
              statusCode: status,
              message: response,
              error: error.name,
            }
          : response
      );
    } else {
      res.status(HttpStatus.BAD_GATEWAY).json({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Service temporarily unavailable',
        error: 'Bad Gateway',
      });
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
