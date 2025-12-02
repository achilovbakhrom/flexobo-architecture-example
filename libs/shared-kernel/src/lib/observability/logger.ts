/**
 * Structured logging utilities with OpenTelemetry context
 */

import { Logger as NestLogger, LogLevel } from '@nestjs/common';
import { trace } from '@opentelemetry/api';

/**
 * Log entry with OpenTelemetry context
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  traceId?: string;
  spanId?: string;
  context?: Record<string, unknown>;
  error?: Error;
}

/**
 * Enhanced logger with OpenTelemetry integration
 * Uses composition to avoid signature conflicts with NestJS Logger
 */
export class ObservabilityLogger {
  private readonly logger: NestLogger;

  constructor(context = 'Application') {
    this.logger = new NestLogger(context);
  }

  /**
   * Log with trace context
   */
  private logWithContext(
    level: LogLevel,
    message: string,
    contextData?: Record<string, unknown>,
    error?: Error
  ): void {
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      traceId: spanContext?.traceId,
      spanId: spanContext?.spanId,
      context: contextData,
      error,
    };

    // Format log message with trace IDs
    const formattedMessage = this.formatLogMessage(logEntry);

    // Call logger method
    switch (level) {
      case 'log':
        this.logger.log(formattedMessage);
        break;
      case 'error':
        this.logger.error(formattedMessage, error?.stack);
        break;
      case 'warn':
        this.logger.warn(formattedMessage);
        break;
      case 'debug':
        this.logger.debug(formattedMessage);
        break;
      case 'verbose':
        this.logger.verbose(formattedMessage);
        break;
    }

    // Add log event to span
    if (span) {
      span.addEvent('log', {
        'log.level': level,
        'log.message': message,
        ...contextData,
      });
    }
  }

  /**
   * Format log message with trace context
   */
  private formatLogMessage(entry: LogEntry): string {
    const parts: string[] = [entry.message];

    if (entry.traceId) {
      parts.push(`[trace_id=${entry.traceId}]`);
    }

    if (entry.spanId) {
      parts.push(`[span_id=${entry.spanId}]`);
    }

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context));
    }

    return parts.join(' ');
  }

  /**
   * Standard NestJS-compatible methods (delegate to internal logger)
   */
  log(message: string, context?: string): void {
    this.logger.log(message, context);
  }

  error(message: string, stack?: string, context?: string): void {
    this.logger.error(message, stack, context);
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, context);
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, context);
  }

  /**
   * Enhanced methods with structured data and tracing
   */
  logWithData(message: string, contextData?: Record<string, unknown>): void {
    this.logWithContext('log', message, contextData);
  }

  errorWithData(
    message: string,
    error?: Error,
    contextData?: Record<string, unknown>
  ): void {
    this.logWithContext('error', message, contextData, error);
  }

  warnWithData(message: string, contextData?: Record<string, unknown>): void {
    this.logWithContext('warn', message, contextData);
  }

  debugWithData(message: string, contextData?: Record<string, unknown>): void {
    this.logWithContext('debug', message, contextData);
  }

  verboseWithData(
    message: string,
    contextData?: Record<string, unknown>
  ): void {
    this.logWithContext('verbose', message, contextData);
  }

  /**
   * Log with custom level
   */
  logWithLevel(
    level: LogLevel,
    message: string,
    contextData?: Record<string, unknown>
  ): void {
    this.logWithContext(level, message, contextData);
  }
}

/**
 * Create logger with context name
 */
export function createLogger(context: string): ObservabilityLogger {
  return new ObservabilityLogger(context);
}
