import { Logger } from '@nestjs/common';

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retry attempts
   * Default: 3
   */
  maxAttempts?: number;

  /**
   * Initial delay between retries (milliseconds)
   * Default: 1000 (1 second)
   */
  initialDelay?: number;

  /**
   * Maximum delay between retries (milliseconds)
   * Default: 30000 (30 seconds)
   */
  maxDelay?: number;

  /**
   * Backoff multiplier for exponential backoff
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Whether to use exponential backoff
   * Default: true
   */
  exponentialBackoff?: boolean;

  /**
   * Filter function to determine if error should trigger retry
   * Default: retry all errors
   */
  retryFilter?: (error: Error) => boolean;

  /**
   * Callback before each retry attempt
   */
  onRetry?: (attempt: number, error: Error) => void;
}

const logger = new Logger('RetryDecorator');

/**
 * Decorator to add retry logic with exponential backoff
 *
 * @example
 * ```typescript
 * class DatabaseClient {
 *   @Retry({ maxAttempts: 3, exponentialBackoff: true })
 *   async query(sql: string): Promise<Result> {
 *     return await this.pool.query(sql);
 *   }
 * }
 * ```
 */
export function Retry(config: RetryConfig = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    exponentialBackoff = true,
    retryFilter = () => true,
    onRetry,
  } = config;

  return function (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const methodName = `${target.constructor.name}.${propertyKey}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      let lastError: Error | undefined;
      let attempt = 0;

      while (attempt < maxAttempts) {
        try {
          return await originalMethod.apply(this, args);
        } catch (error) {
          lastError = error as Error;
          attempt++;

          // Check if we should retry this error
          if (!retryFilter(lastError)) {
            throw lastError;
          }

          // Check if we've exhausted retries
          if (attempt >= maxAttempts) {
            logger.error(
              `${methodName} failed after ${attempt} attempts: ${lastError.message}`
            );
            throw lastError;
          }

          // Calculate delay
          const delay = exponentialBackoff
            ? Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt - 1),
                maxDelay
              )
            : initialDelay;

          logger.warn(
            `${methodName} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms: ${lastError.message}`
          );

          // Callback before retry
          if (onRetry) {
            onRetry(attempt, lastError);
          }

          // Wait before retrying
          await sleep(delay);
        }
      }

      throw lastError || new Error('Retry failed: unknown error');
    };

    return descriptor;
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    exponentialBackoff = true,
    retryFilter = () => true,
    onRetry,
  } = config;

  let lastError: Error | undefined;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      attempt++;

      if (!retryFilter(lastError) || attempt >= maxAttempts) {
        throw lastError;
      }

      const delay = exponentialBackoff
        ? Math.min(
            initialDelay * Math.pow(backoffMultiplier, attempt - 1),
            maxDelay
          )
        : initialDelay;

      if (onRetry) {
        onRetry(attempt, lastError);
      }

      await sleep(delay);
    }
  }

  throw lastError || new Error('Retry failed: unknown error');
}
