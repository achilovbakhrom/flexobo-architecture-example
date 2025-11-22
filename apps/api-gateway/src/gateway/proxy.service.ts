/**
 * HTTP Proxy Service
 * Forwards requests to downstream services with resilience patterns
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CircuitBreaker } from '@flexobo/core';
import { ProxyRequest, ProxyResponse, ServiceRoute } from './gateway.types';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Forward request to downstream service
   */
  async forward(
    route: ServiceRoute,
    request: ProxyRequest
  ): Promise<ProxyResponse> {
    const serviceName = route.name;
    const targetUrl = this.buildTargetUrl(route, request);

    this.logger.debug(`Proxying ${request.method} ${targetUrl}`);

    try {
      // Get or create circuit breaker for this service
      if (!this.circuitBreakers.has(serviceName)) {
        this.circuitBreakers.set(
          serviceName,
          new CircuitBreaker({
            failureThreshold: 5,
            successThreshold: 2,
            timeout: 60000,
            resetTimeout: 30000,
            name: serviceName,
          })
        );
      }

      const circuitBreaker = this.circuitBreakers.get(serviceName);

      if (!circuitBreaker) {
        throw new Error(`Circuit breaker not found for ${serviceName}`);
      }

      // Execute with circuit breaker protection
      const response = await circuitBreaker.execute(async () => {
        return await this.makeHttpRequest(targetUrl, request, route.timeout);
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to proxy request to ${serviceName}: ${error}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Service ${serviceName} is unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Build target URL
   */
  private buildTargetUrl(route: ServiceRoute, request: ProxyRequest): string {
    // Remove route prefix from request URL
    let path = request.url;
    if (path.startsWith(route.prefix)) {
      path = path.substring(route.prefix.length);
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    // Build full URL
    const baseUrl = route.baseUrl.endsWith('/')
      ? route.baseUrl.slice(0, -1)
      : route.baseUrl;

    let targetUrl = `${baseUrl}${path}`;

    // Add query parameters
    if (request.query && Object.keys(request.query).length > 0) {
      const queryString = new URLSearchParams(
        request.query as Record<string, string>
      ).toString();
      targetUrl += `?${queryString}`;
    }

    return targetUrl;
  }

  /**
   * Make HTTP request to downstream service
   */
  private async makeHttpRequest(
    url: string,
    request: ProxyRequest,
    timeout = 5000
  ): Promise<ProxyResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: request.method,
        headers: this.prepareHeaders(request.headers),
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      const responseBody = await this.parseResponseBody(response);

      return {
        statusCode: response.status,
        headers: this.extractHeaders(response.headers),
        body: responseBody,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new HttpException('Request timeout', HttpStatus.GATEWAY_TIMEOUT);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Prepare headers for forwarding
   */
  private prepareHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const forwardHeaders: Record<string, string> = {};

    // Forward important headers
    const headersToForward = [
      'authorization',
      'content-type',
      'accept',
      'user-agent',
      'x-request-id',
      'x-correlation-id',
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (headersToForward.includes(key.toLowerCase())) {
        forwardHeaders[key] = value;
      }
    }

    return forwardHeaders;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Parse response body
   */
  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return await response.json();
    }

    if (contentType?.includes('text/')) {
      return await response.text();
    }

    // Return as buffer for binary data
    return await response.arrayBuffer();
  }
}
