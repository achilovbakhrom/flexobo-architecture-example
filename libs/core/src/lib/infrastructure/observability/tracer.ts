/**
 * Tracing utilities for distributed tracing with OpenTelemetry
 */

import {
  trace,
  context,
  SpanStatusCode,
  Span,
  Context,
  SpanKind,
} from '@opentelemetry/api';

/**
 * Tracer utility class for easy span management
 */
export class Tracer {
  private readonly tracer = trace.getTracer('flexobo-core');

  /**
   * Create and execute a span
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: {
      kind?: SpanKind;
      attributes?: Record<string, string | number | boolean>;
    }
  ): Promise<T> {
    const span = this.tracer.startSpan(name, {
      kind: options?.kind,
      attributes: options?.attributes,
    });

    try {
      const result = await context.with(
        trace.setSpan(context.active(), span),
        () => fn(span)
      );
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.recordException(
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Add event to current span
   */
  addEvent(
    name: string,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.addEvent(name, attributes);
    }
  }

  /**
   * Set attribute on current span
   */
  setAttribute(key: string, value: string | number | boolean): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttribute(key, value);
    }
  }

  /**
   * Set multiple attributes on current span
   */
  setAttributes(attributes: Record<string, string | number | boolean>): void {
    const currentSpan = trace.getActiveSpan();
    if (currentSpan) {
      currentSpan.setAttributes(attributes);
    }
  }

  /**
   * Get current span
   */
  getCurrentSpan(): Span | undefined {
    return trace.getActiveSpan();
  }

  /**
   * Get current trace context
   */
  getCurrentContext(): Context {
    return context.active();
  }
}

/**
 * Decorator for automatic tracing of class methods
 */
export function Traced(spanName?: string) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const tracer = new Tracer();

    descriptor.value = async function (...args: unknown[]) {
      const name = spanName || `${target.constructor.name}.${propertyKey}`;
      return tracer.withSpan(name, async () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}

/**
 * Global tracer instance
 */
export const tracer = new Tracer();
