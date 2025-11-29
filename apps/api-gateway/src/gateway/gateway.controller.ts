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
} from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { ProxyService } from './proxy.service';
import { RoutingService } from './routing.service';
import { Traced } from '@flexobo/core';

@Controller()
export class GatewayController {
  private readonly logger = new Logger(GatewayController.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly routingService: RoutingService
  ) {}

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
    try {
      const path = req.path;

      if (
        path.startsWith('/api/docs') ||
        path.startsWith('/api/discovery') ||
        path.startsWith('/health')
      ) {
        return next();
      }

      this.logger.debug(`Proxying: ${req.method} ${path}`);

      const route = this.routingService.findRoute(path);
      const response = await this.proxyService.forward(route, {
        method: req.method,
        url: path,
        headers: req.headers as Record<string, string>,
        body: req.body,
        query: req.query as Record<string, string>,
      });

      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
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
}
