import { CircuitBreaker, CircuitBreakerConfig } from './circuit-breaker';

const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Decorator to apply circuit breaker pattern to methods
 *
 * @example
 * ```typescript
 * class ExternalApiClient {
 *   @UseCircuitBreaker({ failureThreshold: 3, resetTimeout: 10000 })
 *   async fetchData(): Promise<Data> {
 *     return await this.httpClient.get('/api/data');
 *   }
 * }
 * ```
 */
export function UseCircuitBreaker(config?: CircuitBreakerConfig) {
  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const circuitBreakerKey = `${target.constructor.name}.${propertyKey}`;

    // Create or reuse circuit breaker
    if (!circuitBreakers.has(circuitBreakerKey)) {
      circuitBreakers.set(
        circuitBreakerKey,
        new CircuitBreaker({
          ...config,
          name: config?.name || circuitBreakerKey,
        })
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      const circuitBreaker = circuitBreakers.get(circuitBreakerKey);
      if (!circuitBreaker) {
        throw new Error(`Circuit breaker not found: ${circuitBreakerKey}`);
      }
      return circuitBreaker.execute(() => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Get circuit breaker instance by key
 */
export function getCircuitBreaker(key: string): CircuitBreaker | undefined {
  return circuitBreakers.get(key);
}

/**
 * Clear all circuit breakers (useful for testing)
 */
export function clearCircuitBreakers(): void {
  circuitBreakers.clear();
}
