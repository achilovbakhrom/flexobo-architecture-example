import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';

export const SENTRY_CLIENT = Symbol('SENTRY_CLIENT');

/**
 * Interface for Sentry client
 */
export interface ISentryClient {
  captureException(exception: unknown, context?: Record<string, unknown>): string;
  captureMessage(message: string, level?: 'error' | 'warning' | 'info'): string;
  setUser(user: { id: string; email?: string } | null): void;
  setContext(name: string, context: Record<string, unknown>): void;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
  };
  timestamp: string;
  path: string;
}

/**
 * Global HTTP exception filter with Sentry integration
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(
    @Optional()
    @Inject(SENTRY_CLIENT)
    private readonly sentry?: ISentryClient
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, errorCode, message, details } = this.extractErrorInfo(exception);

    // Generate trace ID
    const traceId = (request as unknown as { requestId?: string }).requestId ||
      this.generateTraceId();

    // Log the error
    if (status >= 500) {
      this.logger.error(
        `[${traceId}] ${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined
      );

      // Report to Sentry for 5xx errors
      if (this.sentry) {
        const user = (request as unknown as { user?: { id: string; email?: string } }).user;
        if (user) {
          this.sentry.setUser(user);
        }

        this.sentry.setContext('request', {
          url: request.url,
          method: request.method,
          headers: this.sanitizeHeaders(request.headers),
          query: request.query,
          body: this.sanitizeBody(request.body),
        });

        this.sentry.captureException(exception, { traceId });
      }
    } else {
      this.logger.warn(
        `[${traceId}] ${request.method} ${request.url} - ${status} - ${message}`
      );
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: {
        code: errorCode,
        message,
        details: status < 500 ? details : undefined, // Don't expose internal details for 5xx
        traceId,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(errorResponse);
  }

  private extractErrorInfo(exception: unknown): {
    status: number;
    errorCode: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'object' && response !== null) {
        const resp = response as Record<string, unknown>;
        return {
          status,
          errorCode: (resp['error'] as string) || this.getErrorCodeFromStatus(status),
          message: (resp['message'] as string) || exception.message,
          details: resp['details'],
        };
      }

      return {
        status,
        errorCode: this.getErrorCodeFromStatus(status),
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // Handle validation errors from class-validator
    if (
      exception &&
      typeof exception === 'object' &&
      'message' in exception &&
      Array.isArray((exception as { message?: unknown }).message)
    ) {
      return {
        status: HttpStatus.BAD_REQUEST,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: (exception as { message: unknown[] }).message,
      };
    }

    // Handle database/Prisma errors
    if (exception instanceof Error && exception.constructor.name.includes('Prisma')) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'DATABASE_ERROR',
        message: 'A database error occurred',
      };
    }

    // Default internal server error
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  private getErrorCodeFromStatus(status: number): string {
    const statusCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      409: 'CONFLICT',
      410: 'GONE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
    };

    return statusCodes[status] || 'UNKNOWN_ERROR';
  }

  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }

  private sanitizeHeaders(
    headers: Record<string, unknown>
  ): Record<string, unknown> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    for (const header of sensitiveHeaders) {
      if (header in sanitized) {
        sanitized[header] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body } as Record<string, unknown>;
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Exception filter specifically for HTTP exceptions (lighter weight)
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    const errorResponse = exception.getResponse();
    const message =
      typeof errorResponse === 'object' && errorResponse !== null
        ? (errorResponse as Record<string, unknown>)['message'] || exception.message
        : errorResponse;

    this.logger.warn(`${request.method} ${request.url} - ${status} - ${message}`);

    response.status(status).json({
      success: false,
      error: {
        code: this.getErrorCode(status),
        message,
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  private getErrorCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
    };
    return codes[status] || 'ERROR';
  }
}
