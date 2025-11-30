/**
 * Service Discovery Controller
 *
 * Provides service endpoints to clients for direct access.
 * Uses the Service Registry for dynamic service discovery.
 * Also proxies Swagger JSON for cross-service documentation.
 */

import {
  Controller,
  Get,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
  ApiParam,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  IServiceRegistry,
  IHealthChecker,
  SERVICE_REGISTRY,
  HEALTH_CHECKER,
} from './interfaces';

export interface ServiceEndpoint {
  http: string;
  ws?: string;
  docs: string;
  description: string;
  status?: string;
}

export interface ServiceDiscoveryResponse {
  gateway: {
    version: string;
    docs: string;
    ws: string;
  };
  services: {
    [key: string]: ServiceEndpoint;
  };
}

@ApiTags('Service Discovery')
@Controller('api/discovery')
export class DiscoveryController {
  private readonly logger = new Logger(DiscoveryController.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(SERVICE_REGISTRY)
    private readonly serviceRegistry: IServiceRegistry,
    @Inject(HEALTH_CHECKER)
    private readonly healthChecker: IHealthChecker
  ) {}

  private get gatewayUrl(): string {
    const port = this.configService.get<number>('gateway.port', 3001);
    return (
      this.configService.get<string>('gateway.gatewayUrl') ||
      `http://localhost:${port}`
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Get all available service endpoints',
    description:
      'Returns URLs for all registered microservices with their health status. Services are dynamically discovered from the service registry.',
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
            ws: { type: 'string' },
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
              status: { type: 'string' },
            },
          },
        },
      },
    },
  })
  getServices(): ServiceDiscoveryResponse {
    const services = this.serviceRegistry.getAllServices();
    const healthStatuses = this.healthChecker.getAllHealthStatuses();

    const serviceEndpoints: { [key: string]: ServiceEndpoint } = {};

    for (const service of services) {
      const healthStatus = healthStatuses.get(service.name);
      const description =
        (service.metadata?.description as string) ||
        `${service.name} microservice`;

      serviceEndpoints[service.name] = {
        http: `${service.baseUrl}/api`,
        docs: `${service.baseUrl}/api/docs`,
        description,
        status: healthStatus?.status || 'unknown',
      };

      // Add WebSocket URL if service supports it
      if (service.wsPath) {
        serviceEndpoints[service.name].ws =
          service.baseUrl.replace('http', 'ws') + service.wsPath;
      }
    }

    return {
      gateway: {
        version: '1.0.0',
        docs: `${this.gatewayUrl}/api/docs`,
        ws: this.gatewayUrl.replace('http', 'ws') + '/ws',
      },
      services: serviceEndpoints,
    };
  }

  /**
   * Proxy swagger-json from any registered service
   */
  @Get('swagger/:serviceName')
  @ApiOperation({
    summary: 'Get Swagger JSON for a service',
    description: 'Proxies Swagger JSON from a registered service',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Name of the service (e.g., order-service, admin-panel)',
  })
  @ApiResponse({
    status: 200,
    description: 'Swagger JSON document',
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  async getServiceSwagger(
    @Param('serviceName') serviceName: string
  ): Promise<object> {
    const service = this.serviceRegistry.getService(serviceName);

    if (!service) {
      throw new HttpException(
        `Service '${serviceName}' not found`,
        HttpStatus.NOT_FOUND
      );
    }

    return this.fetchSwaggerJson(service.baseUrl, serviceName);
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
    const healthStatuses = this.healthChecker.getAllHealthStatuses();
    const services: Record<string, unknown> = {};

    healthStatuses.forEach((status, name) => {
      services[name] = {
        status: status.status,
        latency: status.latency,
        lastChecked: status.lastChecked.toISOString(),
        error: status.error,
      };
    });

    const summary = this.healthChecker.getHealthSummary();

    return {
      status: summary.unhealthy > 0 ? 'degraded' : 'ok',
      summary,
      services,
      timestamp: new Date().toISOString(),
    };
  }
}
