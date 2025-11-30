/**
 * HTTP Proxy Service
 *
 * Forwards HTTP requests to backend services with:
 * - Circuit breaker protection
 * - Retry with exponential backoff
 * - Timeout handling
 * - Header forwarding
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { CircuitBreaker } from '@flexobo/core';
import {
  IProxyService,
  ServiceDefinition,
  RouteDefinition,
  ProxyRequest,
  ProxyResponse,
} from '../interfaces';

@Injectable()
export class HttpProxyService implements IProxyService {
  private readonly logger = new Logger(HttpProxyService.name);
  private readonly circuitBreakers = new Map<string, CircuitBreaker>();

  /** Headers to forward to downstream services */
  private readonly forwardHeaders = new Set([
    'authorization',
    'content-type',
    'accept',
    'accept-language',
    'user-agent',
    'x-request-id',
    'x-correlation-id',
    'x-forwarded-for',
    'x-real-ip',
  ]);

  /** Headers to exclude from forwarding */
  private readonly excludeHeaders = new Set([
    'host',
    'connection',
    'keep-alive',
    'transfer-encoding',
    'te',
    'upgrade',
    'proxy-authorization',
    'proxy-connection',
  ]);

  /**
   * Forward request to target service
   */
  async forward(
    service: ServiceDefinition,
    request: ProxyRequest,
    route?: RouteDefinition
  ): Promise<ProxyResponse> {
    const targetUrl = this.buildTargetUrl(service, request, route);
    const timeout = route?.timeout ?? service.timeout ?? 5000;

    this.logger.debug(`Proxying ${request.method} ${targetUrl}`);

    const circuitBreaker = this.getOrCreateCircuitBreaker(service);

    try {
      return await circuitBreaker.execute(async () => {
        return await this.executeWithRetry(service, targetUrl, request, timeout);
      });
    } catch (error) {
      this.logger.error(
        `Failed to proxy request to ${service.name}: ${(error as Error).message}`
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Service ${service.name} is unavailable`,
        HttpStatus.SERVICE_UNAVAILABLE
      );
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry(
    service: ServiceDefinition,
    url: string,
    request: ProxyRequest,
    timeout: number
  ): Promise<ProxyResponse> {
    const retryConfig = service.retry ?? { attempts: 3, delay: 1000 };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryConfig.attempts; attempt++) {
      try {
        return await this.makeHttpRequest(url, request, timeout);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx)
        if (error instanceof HttpException) {
          const status = error.getStatus();
          if (status >= 400 && status < 500) {
            throw error;
          }
        }

        // Don't retry on last attempt
        if (attempt === retryConfig.attempts) {
          break;
        }

        // Calculate backoff delay
        const backoff = retryConfig.backoffMultiplier ?? 1;
        const delay = retryConfig.delay * Math.pow(backoff, attempt - 1);

        this.logger.warn(
          `Request to ${service.name} failed (attempt ${attempt}/${retryConfig.attempts}), retrying in ${delay}ms`
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make HTTP request to downstream service
   */
  private async makeHttpRequest(
    url: string,
    request: ProxyRequest,
    timeout: number
  ): Promise<ProxyResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const headers = this.prepareHeaders(request.headers);
      const body = this.prepareBody(request.body, headers['content-type']);

      const response = await fetch(url, {
        method: request.method,
        headers,
        body,
        signal: controller.signal,
      });

      const responseBody = await this.parseResponseBody(response);
      const responseHeaders = this.extractHeaders(response.headers);

      // Handle non-success responses
      if (!response.ok) {
        throw new HttpException(
          responseBody as string | object,
          response.status
        );
      }

      return {
        statusCode: response.status,
        headers: responseHeaders,
        body: responseBody,
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new HttpException(
          'Request timeout',
          HttpStatus.GATEWAY_TIMEOUT
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build target URL
   */
  private buildTargetUrl(
    service: ServiceDefinition,
    request: ProxyRequest,
    route?: RouteDefinition
  ): string {
    const baseUrl = service.baseUrl;

    // Use transformed path if available, otherwise use original path
    let path = request.path;

    // Apply path rewrite if route has rules
    if (route?.pathRewrite) {
      for (const rule of route.pathRewrite) {
        if (typeof rule.match === 'string') {
          path = path.replace(rule.match, rule.replace);
        } else {
          path = path.replace(rule.match, rule.replace);
        }
      }
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    let targetUrl = `${baseUrl}${path}`;

    // Add query parameters
    if (request.query && Object.keys(request.query).length > 0) {
      const queryString = new URLSearchParams(request.query).toString();
      targetUrl += `?${queryString}`;
    }

    return targetUrl;
  }

  /**
   * Prepare headers for forwarding
   */
  private prepareHeaders(
    headers: Record<string, string>
  ): Record<string, string> {
    const forwardHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();

      // Skip excluded headers
      if (this.excludeHeaders.has(lowerKey)) {
        continue;
      }

      // Include if in forward list or is a custom header (x-*)
      if (
        this.forwardHeaders.has(lowerKey) ||
        lowerKey.startsWith('x-')
      ) {
        forwardHeaders[key] = value;
      }
    }

    return forwardHeaders;
  }

  /**
   * Prepare request body
   */
  private prepareBody(
    body: unknown,
    _contentType?: string
  ): string | undefined {
    if (!body) {
      return undefined;
    }

    if (typeof body === 'string') {
      return body;
    }

    // Default to JSON serialization
    return JSON.stringify(body);
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};

    headers.forEach((value, key) => {
      // Skip hop-by-hop headers
      if (!this.excludeHeaders.has(key.toLowerCase())) {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Parse response body based on content type
   */
  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        return await response.json();
      } catch {
        return await response.text();
      }
    }

    if (contentType.includes('text/')) {
      return await response.text();
    }

    // Return as buffer for binary data
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Get or create circuit breaker for service
   */
  private getOrCreateCircuitBreaker(service: ServiceDefinition): CircuitBreaker {
    let circuitBreaker = this.circuitBreakers.get(service.name);

    if (!circuitBreaker) {
      circuitBreaker = new CircuitBreaker({
        name: service.name,
        failureThreshold: 5,
        successThreshold: 2,
        timeout: service.timeout ?? 5000,
        resetTimeout: 30000,
      });

      this.circuitBreakers.set(service.name, circuitBreaker);
    }

    return circuitBreaker;
  }

  /**
   * Get circuit breaker state for a service
   */
  getCircuitBreakerState(serviceName: string): string | null {
    const cb = this.circuitBreakers.get(serviceName);
    return cb ? cb.getState() : null;
  }

  /**
   * Remove circuit breaker for a service (allows fresh start)
   */
  removeCircuitBreaker(serviceName: string): void {
    if (this.circuitBreakers.delete(serviceName)) {
      this.logger.log(`Circuit breaker removed for ${serviceName}`);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
