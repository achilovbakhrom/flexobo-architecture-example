/**
 * API Gateway Controller
 * Main entry point for all incoming requests
 */

import {
  All,
  Controller,
  Req,
  Res,
  Next,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Body,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { RoutingService } from './routing.service';
import { AggregationService } from './aggregation.service';
import { RequestAggregationConfig } from './gateway.types';
import { Traced } from '@flexobo/core';

@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly routingService: RoutingService,
    private readonly aggregationService: AggregationService
  ) {}

  /**
   * Handle all requests and proxy to appropriate service
   */
  @All('*')
  @Traced('GatewayController.proxyRequest')
  async proxyRequest(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction
  ): Promise<void> {
    try {
      const path = req.path;

      // Skip internal gateway endpoints - pass to next handler
      if (
        path === '/api/aggregate' ||
        path.startsWith('/api/docs') ||
        path === '/api/docs-json' ||
        path.startsWith('/health')
      ) {
        return next();
      }

      this.logger.debug(`Incoming request: ${req.method} ${path}`);

      // Find the route
      const route = this.routingService.findRoute(path);

      // Forward the request
      const response = await this.proxyService.forward(route, {
        method: req.method,
        url: path,
        headers: req.headers as Record<string, string>,
        body: req.body,
        query: req.query as Record<string, string>,
      });

      // Set response headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      // Send response
      res.status(response.statusCode).send(response.body);
    } catch (error) {
      this.logger.error(`Proxy error: ${error}`);

      if (error instanceof HttpException) {
        res.status(error.getStatus()).json({
          statusCode: error.getStatus(),
          message: error.message,
          error: error.name,
        });
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'InternalServerError',
        });
      }
    }
  }

  /**
   * Aggregate multiple requests
   */
  @Post('api/aggregate')
  @Traced('GatewayController.aggregate')
  async aggregate(
    @Req() req: Request,
    @Body() config: RequestAggregationConfig
  ) {
    try {
      const headers = req.headers as Record<string, string>;
      const result = await this.aggregationService.aggregate(config, headers);
      return result;
    } catch (error) {
      this.logger.error(`Aggregation error: ${error}`);
      throw new HttpException(
        'Aggregation failed',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Get gateway routes
   */
  @All('api/gateway/routes')
  getRoutes() {
    return this.routingService.getRoutes();
  }
}
