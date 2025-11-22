/**
 * Swagger Aggregator Service
 * Fetches and combines Swagger specs from all microservices
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SwaggerServer {
  name: string;
  url: string;
  enabled: boolean;
}

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers?: Array<{ url: string; description: string }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    schemas: Record<string, unknown>;
    securitySchemes: Record<string, unknown>;
  };
  tags: Array<{ name: string; description?: string }>;
}

@Injectable()
export class SwaggerAggregatorService {
  private readonly logger = new Logger(SwaggerAggregatorService.name);
  private readonly servers: SwaggerServer[] = [];

  constructor(private readonly configService: ConfigService) {
    this.initializeServers();
  }

  private initializeServers() {
    this.servers.push(
      {
        name: 'Order Service',
        url:
          this.configService.get('ORDER_SERVICE_URL') ||
          'http://localhost:3000',
        enabled: true,
      },
      {
        name: 'Admin Panel',
        url:
          this.configService.get('ADMIN_PANEL_URL') || 'http://localhost:3002',
        enabled: true,
      }
    );
  }

  async fetchSwaggerSpec(
    serviceUrl: string
  ): Promise<Partial<OpenAPISpec> | null> {
    try {
      this.logger.log(
        `Fetching Swagger spec from: ${serviceUrl}/api/docs-json`
      );
      const response = await axios.get(`${serviceUrl}/api/docs-json`, {
        timeout: 5000,
      });
      this.logger.log(`Successfully fetched spec from ${serviceUrl}`);
      return response.data as Partial<OpenAPISpec>;
    } catch (error) {
      this.logger.error(
        `Failed to fetch Swagger spec from ${serviceUrl}:`,
        error instanceof Error ? error.message : error
      );
      return null;
    }
  }

  async aggregateSpecs(): Promise<OpenAPISpec> {
    this.logger.log(`Starting aggregation from ${this.servers.length} servers`);
    const specs = await Promise.all(
      this.servers
        .filter((s) => s.enabled)
        .map((server) =>
          this.fetchSwaggerSpec(server.url).then((spec) => {
            this.logger.log(
              `Fetched spec from ${server.url}: ${spec ? 'SUCCESS' : 'FAILED'}`
            );
            return { server, spec };
          })
        )
    );

    // Base aggregated spec
    const aggregated: OpenAPISpec = {
      openapi: '3.0.0',
      info: {
        title: 'Microservices API',
        description: 'Unified API documentation for all microservices',
        version: '1.0.0',
      },
      servers: specs
        .filter((s) => s.spec)
        .map((s) => ({
          url: s.server.url,
          description: s.server.name,
        })),
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
      },
      tags: [],
    };

    // Merge all specs
    const seenTags = new Set<string>();

    for (const { server, spec } of specs) {
      if (!spec) continue;

      // Merge paths with service prefix
      if (spec.paths) {
        for (const [path, methods] of Object.entries(spec.paths)) {
          const fullPath = path;
          if (!aggregated.paths[fullPath]) {
            aggregated.paths[fullPath] = {};
          }

          // Add server context to each operation
          for (const [method, operation] of Object.entries(methods)) {
            if (typeof operation === 'object' && operation !== null) {
              aggregated.paths[fullPath][method] = {
                ...operation,
                servers: [{ url: server.url, description: server.name }],
              };
            }
          }
        }
      }

      // Merge components
      if (spec.components) {
        if (spec.components.schemas) {
          Object.assign(aggregated.components.schemas, spec.components.schemas);
        }
        if (spec.components.securitySchemes) {
          Object.assign(
            aggregated.components.securitySchemes,
            spec.components.securitySchemes
          );
        }
      }

      // Merge tags (deduplicate)
      if (spec.tags) {
        for (const tag of spec.tags) {
          if (!seenTags.has(tag.name)) {
            seenTags.add(tag.name);
            aggregated.tags.push(tag);
          }
        }
      }
    }

    return aggregated;
  }

  getServers(): SwaggerServer[] {
    return this.servers;
  }
}
