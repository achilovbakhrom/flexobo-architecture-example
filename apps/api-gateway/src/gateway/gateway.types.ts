/**
 * API Gateway types and interfaces
 */

export interface ServiceRoute {
  /**
   * Service name
   */
  name: string;

  /**
   * Base URL of the service
   */
  baseUrl: string;

  /**
   * Path prefix for routing (e.g., /orders, /inventory)
   */
  prefix: string;

  /**
   * Health check endpoint
   */
  healthCheckPath?: string;

  /**
   * Whether the service is enabled
   */
  enabled?: boolean;

  /**
   * Timeout in milliseconds
   */
  timeout?: number;

  /**
   * Retry configuration
   */
  retry?: {
    attempts: number;
    delay: number;
  };
}

export interface GatewayConfig {
  /**
   * Port to run the gateway on
   */
  port: number;

  /**
   * Global timeout for all requests (ms)
   */
  globalTimeout?: number;

  /**
   * Enable request logging
   */
  enableLogging?: boolean;

  /**
   * Enable distributed tracing
   */
  enableTracing?: boolean;

  /**
   * Rate limiting configuration
   */
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };

  /**
   * CORS configuration
   */
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };

  /**
   * Service routes
   */
  services: ServiceRoute[];
}

export interface ProxyRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface RequestAggregationConfig {
  /**
   * Endpoints to call in parallel
   */
  endpoints: {
    name: string;
    url: string;
    method?: string;
  }[];

  /**
   * Whether to fail fast if any request fails
   */
  failFast?: boolean;

  /**
   * Timeout for aggregated requests
   */
  timeout?: number;
}
