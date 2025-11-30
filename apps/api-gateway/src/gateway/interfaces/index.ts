/**
 * Gateway Interfaces - SOLID Architecture
 *
 * These interfaces define contracts for the gateway components,
 * enabling easy extension and service swapping.
 */

// Service Definition
export interface ServiceDefinition {
  /** Unique service identifier */
  name: string;
  /** Base URL of the service */
  baseUrl: string;
  /** Health check endpoint path */
  healthCheckPath?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Retry configuration */
  retry?: RetryConfig;
  /** Whether the service is enabled */
  enabled?: boolean;
  /** WebSocket endpoint path (if supported) */
  wsPath?: string;
  /** Service metadata */
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  backoffMultiplier?: number;
}

// Route Definition
export interface RouteDefinition {
  /** Route pattern (prefix, exact, or regex) */
  pattern: string;
  /** Route matching strategy */
  matchType: RouteMatchType;
  /** Target service name */
  serviceName: string;
  /** Path transformation (optional) */
  pathRewrite?: PathRewriteRule[];
  /** Route-specific timeout override */
  timeout?: number;
  /** Required headers for this route */
  requiredHeaders?: string[];
  /** Route metadata */
  metadata?: Record<string, unknown>;
}

export type RouteMatchType = 'prefix' | 'exact' | 'regex';

export interface PathRewriteRule {
  match: string | RegExp;
  replace: string;
}

// Service Registry Interface (Dependency Inversion)
export interface IServiceRegistry {
  /** Register a new service */
  register(service: ServiceDefinition): void;
  /** Unregister a service by name */
  unregister(name: string): boolean;
  /** Get service by name */
  getService(name: string): ServiceDefinition | undefined;
  /** Get all registered services */
  getAllServices(): ServiceDefinition[];
  /** Check if service exists */
  hasService(name: string): boolean;
  /** Update service configuration */
  updateService(name: string, updates: Partial<ServiceDefinition>): boolean;
}

// Route Registry Interface
export interface IRouteRegistry {
  /** Register a new route */
  registerRoute(route: RouteDefinition): void;
  /** Register multiple routes */
  registerRoutes(routes: RouteDefinition[]): void;
  /** Unregister routes for a service */
  unregisterServiceRoutes(serviceName: string): void;
  /** Get all routes */
  getAllRoutes(): RouteDefinition[];
  /** Find matching route for a path */
  findRoute(path: string): RouteMatch | null;
}

export interface RouteMatch {
  route: RouteDefinition;
  service: ServiceDefinition;
  params: Record<string, string>;
  transformedPath: string;
}

// Route Matching Strategy Interface (Strategy Pattern)
export interface IRouteMatchStrategy {
  /** Check if this strategy can handle the route type */
  canHandle(matchType: RouteMatchType): boolean;
  /** Match a path against a pattern */
  match(path: string, pattern: string): RouteMatchResult | null;
}

export interface RouteMatchResult {
  matched: boolean;
  params: Record<string, string>;
  remainingPath: string;
}

// Proxy Interface
export interface IProxyService {
  /** Forward HTTP request to target service */
  forward(
    service: ServiceDefinition,
    request: ProxyRequest,
    route?: RouteDefinition
  ): Promise<ProxyResponse>;
}

export interface ProxyRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

export interface ProxyResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
}

// Health Check Interface
export interface IHealthChecker {
  /** Check health of a specific service */
  checkService(service: ServiceDefinition): Promise<ServiceHealthStatus>;
  /** Check health of all services */
  checkAllServices(): Promise<Map<string, ServiceHealthStatus>>;
  /** Get all cached health statuses */
  getAllHealthStatuses(): Map<string, ServiceHealthStatus>;
  /** Check if a service is healthy */
  isServiceHealthy(serviceName: string): boolean;
  /** Get health summary */
  getHealthSummary(): {
    total: number;
    healthy: number;
    unhealthy: number;
    unknown: number;
  };
}

export interface ServiceHealthStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  latency?: number;
  lastChecked: Date;
  error?: string;
}

// WebSocket Proxy Interface
export interface IWebSocketProxy {
  /** Handle WebSocket upgrade request */
  handleUpgrade(
    service: ServiceDefinition,
    request: WebSocketUpgradeRequest
  ): Promise<void>;
}

export interface WebSocketUpgradeRequest {
  socket: unknown;
  request: unknown;
  head: Buffer;
  path: string;
}

// Event Types for Service Registry Events
export type ServiceRegistryEvent =
  | { type: 'SERVICE_REGISTERED'; service: ServiceDefinition }
  | { type: 'SERVICE_UNREGISTERED'; serviceName: string }
  | { type: 'SERVICE_UPDATED'; service: ServiceDefinition }
  | { type: 'SERVICE_HEALTH_CHANGED'; name: string; status: ServiceHealthStatus };

// Service Registry Event Listener
export interface IServiceRegistryEventListener {
  onServiceEvent(event: ServiceRegistryEvent): void;
}

// Gateway Configuration Interface
export interface IGatewayConfig {
  /** Gateway port */
  port: number;
  /** Global request timeout */
  globalTimeout: number;
  /** CORS configuration */
  cors: CorsConfig;
  /** WebSocket configuration */
  webSocket: WebSocketConfig;
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;
}

export interface CorsConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  methods?: string[];
  allowedHeaders?: string[];
}

export interface WebSocketConfig {
  enabled: boolean;
  path: string;
  pingInterval?: number;
  pingTimeout?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

// Injection Tokens
export const SERVICE_REGISTRY = Symbol('SERVICE_REGISTRY');
export const ROUTE_REGISTRY = Symbol('ROUTE_REGISTRY');
export const PROXY_SERVICE = Symbol('PROXY_SERVICE');
export const HEALTH_CHECKER = Symbol('HEALTH_CHECKER');
export const WEBSOCKET_PROXY = Symbol('WEBSOCKET_PROXY');
export const GATEWAY_CONFIG = Symbol('GATEWAY_CONFIG');
export const ROUTE_MATCH_STRATEGIES = Symbol('ROUTE_MATCH_STRATEGIES');
