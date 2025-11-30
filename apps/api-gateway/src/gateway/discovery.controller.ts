/**
 * Service Discovery Controller
 * Provides service endpoints to clients for direct access
 * Also proxies Swagger JSON for cross-service documentation
 */

import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export interface ServiceEndpoint {
  http: string;
  ws?: string;
  docs: string;
  description: string;
}

export interface ServiceDiscoveryResponse {
  gateway: {
    version: string;
    docs: string;
  };
  services: {
    [key: string]: ServiceEndpoint;
  };
}

@ApiTags('Service Discovery')
@Controller('api/discovery')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(private configService: ConfigService) {}

  private get orderServiceUrl(): string {
    return (
      this.configService.get<string>('gateway.orderServiceUrl') ||
      this.configService.get<string>('ORDER_SERVICE_URL') ||
      'http://localhost:3002'
    );
  }

  private get adminPanelUrl(): string {
    return (
      this.configService.get<string>('gateway.adminPanelUrl') ||
      this.configService.get<string>('ADMIN_PANEL_URL') ||
      'http://localhost:3000'
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all available service endpoints',
    description:
      'Returns URLs for all microservices. Clients should connect directly to services using these URLs for best performance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service discovery information',
    schema: {
      type: 'object',
      properties: {
        gateway: {
          type: 'object',
          properties: {
            version: { type: 'string' },
            docs: { type: 'string' },
          },
        },
        services: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              http: { type: 'string' },
              ws: { type: 'string' },
              docs: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  getServices(): ServiceDiscoveryResponse {
    const gatewayUrl =
      this.configService.get<string>('API_GATEWAY_URL') ||
      'http://localhost:3001';

    return {
      gateway: {
        version: '1.0.0',
        docs: `${gatewayUrl}/api/docs`,
      },
      services: {
        'order-service': {
          http: `${this.orderServiceUrl}/api`,
          ws: this.orderServiceUrl.replace('http', 'ws') + '/ws',
          docs: `${this.orderServiceUrl}/api/docs`,
          description:
            'Order management service with event sourcing and CQRS',
        },
        'admin-panel': {
          http: `${this.adminPanelUrl}/api`,
          docs: `${this.adminPanelUrl}/api/docs`,
          description: 'Administrative operations and system monitoring',
        },
      },
    };
  }

  /**
   * Proxy swagger-json from Order Service
   * This allows the Swagger UI dropdown to work from the browser
   */
  @Get('swagger/order-service')
  @ApiExcludeEndpoint()
  async getOrderServiceSwagger(): Promise<object> {
    return this.fetchSwaggerJson(this.orderServiceUrl, 'order-service');
  }

  /**
   * Proxy swagger-json from Admin Panel
   * This allows the Swagger UI dropdown to work from the browser
   */
  @Get('swagger/admin-panel')
  @ApiExcludeEndpoint()
  async getAdminPanelSwagger(): Promise<object> {
    return this.fetchSwaggerJson(this.adminPanelUrl, 'admin-panel');
  }

  /**
   * Fetch Swagger JSON from a service
   */
  private async fetchSwaggerJson(
    serviceUrl: string,
    serviceName: string
  ): Promise<object> {
    try {
      this.logger.debug(`Fetching swagger from ${serviceUrl}/api/docs-json`);
      const response = await fetch(`${serviceUrl}/api/docs-json`, {
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new HttpException(
          `Failed to fetch swagger from ${serviceName}: ${response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      return await response.json();
    } catch (error) {
      this.logger.error(`Error fetching swagger from ${serviceName}: ${error}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `${serviceName} swagger unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check health of all services',
    description: 'Returns health status of all registered microservices',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check results',
  })
  async getServicesHealth() {
    // TODO: Implement actual health checks to each service
    return {
      status: 'ok',
      services: {
        'order-service': { status: 'unknown' },
        'admin-panel': { status: 'unknown' },
      },
      timestamp: new Date().toISOString(),
    };
  }
}
