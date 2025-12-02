import { RateLimiter, RateLimiterConfig } from './rate-limiter';

const rateLimiters = new Map<string, RateLimiter>();

/**
 * Decorator to apply rate limiting to methods
 *
 * @example
 * ```typescript
 * class ApiController {
 *   @UseRateLimiter({ maxRequests: 100, windowMs: 60000 })
 *   async handleRequest(): Promise<Response> {
 *     return await this.processRequest();
 *   }
 *
 *   // Per-tenant rate limiting
 *   @UseRateLimiter({
 *     maxRequests: 50,
 *     keyGenerator: (tenantId) => `tenant:${tenantId}`
 *   })
 *   async handleTenantRequest(tenantId: string): Promise<Response> {
 *     return await this.processRequest();
 *   }
 * }
 * ```
 */
export function UseRateLimiter(config: RateLimiterConfig) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const rateLimiterKey = `${target.constructor.name}.${propertyKey}`;

    // Create or reuse rate limiter
    if (!rateLimiters.has(rateLimiterKey)) {
      rateLimiters.set(
        rateLimiterKey,
        new RateLimiter({
          ...config,
          name: config.name || rateLimiterKey,
        })
      );
    }

    descriptor.value = async function (...args: any[]) {
      const rateLimiter = rateLimiters.get(rateLimiterKey)!;
      return rateLimiter.execute(
        () => originalMethod.apply(this, args),
        ...args
      );
    };

    return descriptor;
  };
}

/**
 * Get rate limiter instance by key
 */
export function getRateLimiter(key: string): RateLimiter | undefined {
  return rateLimiters.get(key);
}

/**
 * Clear all rate limiters (useful for testing)
 */
export function clearRateLimiters(): void {
  rateLimiters.forEach((limiter) => limiter.destroy());
  rateLimiters.clear();
}
