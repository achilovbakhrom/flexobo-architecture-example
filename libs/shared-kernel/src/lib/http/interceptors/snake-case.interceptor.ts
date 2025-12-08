import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Converts a camelCase string to snake_case
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Recursively transforms all object keys from camelCase to snake_case
 */
function transformToSnakeCase(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase);
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const snakeKey = toSnakeCase(key);
      result[snakeKey] = transformToSnakeCase(value);
    }
    return result;
  }

  return obj;
}

/**
 * Interceptor to transform all response object keys from camelCase to snake_case
 *
 * This interceptor should be applied globally or on specific controllers/routes
 * to ensure consistent snake_case API responses.
 *
 * Example:
 * - Input:  { userId: "123", createdAt: "2024-01-01", userData: { firstName: "John" } }
 * - Output: { user_id: "123", created_at: "2024-01-01", user_data: { first_name: "John" } }
 */
@Injectable()
export class SnakeCaseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return data;
        }
        return transformToSnakeCase(data);
      })
    );
  }
}

/**
 * Combined interceptor that wraps responses in standard format AND converts keys to snake_case
 */
@Injectable()
export class SnakeCaseResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return {
            success: true,
            data: null,
            timestamp: new Date().toISOString(),
          };
        }

        // Check if already formatted
        if (this.isAlreadyFormatted(data)) {
          // Transform existing formatted response to snake_case
          return transformToSnakeCase(data);
        }

        // Handle paginated responses
        if (this.isPaginatedResponse(data)) {
          return transformToSnakeCase({
            success: true,
            data: data.items,
            meta: data.meta,
            timestamp: new Date().toISOString(),
          });
        }

        // Wrap and transform to snake_case
        return transformToSnakeCase({
          success: true,
          data,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }

  private isAlreadyFormatted(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'success' in obj && 'data' in obj && 'timestamp' in obj;
  }

  private isPaginatedResponse(
    data: unknown
  ): data is { items: unknown[]; meta: Record<string, unknown> } {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
      'items' in obj &&
      'meta' in obj &&
      Array.isArray(obj['items']) &&
      typeof obj['meta'] === 'object'
    );
  }
}

// Export the utility functions for use elsewhere
export { toSnakeCase, transformToSnakeCase };
