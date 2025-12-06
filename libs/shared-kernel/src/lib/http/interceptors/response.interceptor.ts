import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardResponse<T> {
  success: boolean;
  data: T;
  meta?: ResponseMeta;
  timestamp: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface PaginatedData<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Interceptor to wrap all successful responses in a standard format
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, StandardResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<StandardResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Skip if already formatted or is a streaming response
        if (this.isAlreadyFormatted(data)) {
          return data;
        }

        // Handle paginated responses
        if (this.isPaginatedResponse(data)) {
          return {
            success: true,
            data: data.items,
            meta: data.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };
      })
    );
  }

  private isAlreadyFormatted(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return 'success' in obj && 'data' in obj && 'timestamp' in obj;
  }

  private isPaginatedResponse(data: unknown): data is PaginatedData<unknown> {
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

/**
 * Interceptor to add request timing information
 */
@Injectable()
export class TimingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    // Store start time on request for other uses
    request.startTime = startTime;

    return next.handle().pipe(
      map((data) => {
        const duration = Date.now() - startTime;
        response.setHeader('X-Response-Time', `${duration}ms`);
        return data;
      })
    );
  }
}

/**
 * Interceptor to add request ID for tracing
 */
@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get existing request ID or generate new one
    let requestId = request.headers['x-request-id'];
    if (!requestId) {
      requestId = this.generateRequestId();
    }

    request.requestId = requestId;
    response.setHeader('X-Request-Id', requestId);

    return next.handle();
  }

  private generateRequestId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }
}
