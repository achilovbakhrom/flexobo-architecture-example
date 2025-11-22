/**
 * Request Aggregation Service
 * Combines multiple service calls into a single response
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ProxyService } from './proxy.service';
import { RoutingService } from './routing.service';
import { RequestAggregationConfig } from './gateway.types';

interface AggregationResult {
  [key: string]: {
    success: boolean;
    data?: unknown;
    error?: string;
    statusCode: number;
  };
}

@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    private readonly proxyService: ProxyService,
    private readonly routingService: RoutingService
  ) {}

  /**
   * Aggregate multiple requests into a single response
   */
  async aggregate(
    config: RequestAggregationConfig,
    headers: Record<string, string>
  ): Promise<AggregationResult> {
    this.logger.debug(
      `Aggregating ${config.endpoints.length} requests in parallel`
    );

    const promises = config.endpoints.map(async (endpoint) => {
      try {
        const route = this.routingService.findRoute(endpoint.url);

        const response = await this.proxyService.forward(route, {
          method: endpoint.method || 'GET',
          url: endpoint.url,
          headers,
        });

        return {
          name: endpoint.name,
          result: {
            success: true,
            data: response.body,
            statusCode: response.statusCode,
          },
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        if (config.failFast) {
          throw new HttpException(
            `Aggregation failed for ${endpoint.name}: ${errorMessage}`,
            HttpStatus.INTERNAL_SERVER_ERROR
          );
        }

        return {
          name: endpoint.name,
          result: {
            success: false,
            error: errorMessage,
            statusCode:
              error instanceof HttpException
                ? error.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR,
          },
        };
      }
    });

    // Execute all requests in parallel with timeout
    const timeout = config.timeout || 10000;
    const results = await Promise.race([
      Promise.all(promises),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Aggregation timeout')), timeout)
      ),
    ]);

    // Convert array to object
    const aggregatedResult: AggregationResult = {};
    results.forEach(({ name, result }) => {
      aggregatedResult[name] = result;
    });

    return aggregatedResult;
  }

  /**
   * Aggregate requests with custom logic
   */
  async aggregateWithLogic<T>(
    requests: Array<{
      name: string;
      execute: () => Promise<unknown>;
    }>,
    combiner: (results: Record<string, unknown>) => T
  ): Promise<T> {
    const results: Record<string, unknown> = {};

    const promises = requests.map(async (req) => {
      try {
        const data = await req.execute();
        return { name: req.name, data };
      } catch (error) {
        this.logger.error(`Request ${req.name} failed: ${error}`);
        return { name: req.name, data: null };
      }
    });

    const settled = await Promise.all(promises);

    settled.forEach(({ name, data }) => {
      results[name] = data;
    });

    return combiner(results);
  }
}
