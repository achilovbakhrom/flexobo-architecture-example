/**
 * Service Discovery Controller
 * Provides service endpoints to clients for direct access
 */

import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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
  constructor(private configService: ConfigService) {}

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
    const orderServiceUrl =
      this.configService.get<string>('ORDER_SERVICE_URL') ||
      'http://localhost:3000';
    const adminPanelUrl =
      this.configService.get<string>('ADMIN_PANEL_URL') ||
      'http://localhost:3002';
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
          http: `${orderServiceUrl}/api`,
          ws: orderServiceUrl.replace('http', 'ws') + '/ws',
          docs: `${orderServiceUrl}/api/docs`,
          description:
            'Order management service with event sourcing and CQRS',
        },
        'admin-panel': {
          http: `${adminPanelUrl}/api`,
          docs: `${adminPanelUrl}/api/docs`,
          description: 'Administrative operations and system monitoring',
        },
      },
    };
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
