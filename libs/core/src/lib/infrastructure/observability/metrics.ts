/**
 * Metrics utilities for application monitoring with OpenTelemetry
 */

import {
  metrics,
  Counter,
  Histogram,
  UpDownCounter,
  ObservableGauge,
  MetricOptions,
} from '@opentelemetry/api';

/**
 * Metrics manager for easy metric creation and management
 */
export class MetricsManager {
  private readonly meter = metrics.getMeter('flexobo-core');
  private readonly counters = new Map<string, Counter>();
  private readonly histograms = new Map<string, Histogram>();
  private readonly upDownCounters = new Map<string, UpDownCounter>();

  /**
   * Get or create a counter metric
   */
  getCounter(name: string, options?: MetricOptions): Counter {
    const existing = this.counters.get(name);
    if (existing) {
      return existing;
    }
    const counter = this.meter.createCounter(name, options);
    this.counters.set(name, counter);
    return counter;
  }

  /**
   * Increment a counter
   */
  incrementCounter(
    name: string,
    value = 1,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const counter = this.getCounter(name);
    counter.add(value, attributes);
  }

  /**
   * Get or create a histogram metric
   */
  getHistogram(name: string, options?: MetricOptions): Histogram {
    const existing = this.histograms.get(name);
    if (existing) {
      return existing;
    }
    const histogram = this.meter.createHistogram(name, options);
    this.histograms.set(name, histogram);
    return histogram;
  }

  /**
   * Record a value in histogram
   */
  recordHistogram(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const histogram = this.getHistogram(name);
    histogram.record(value, attributes);
  }

  /**
   * Get or create an up-down counter
   */
  getUpDownCounter(name: string, options?: MetricOptions): UpDownCounter {
    const existing = this.upDownCounters.get(name);
    if (existing) {
      return existing;
    }
    const counter = this.meter.createUpDownCounter(name, options);
    this.upDownCounters.set(name, counter);
    return counter;
  }

  /**
   * Add value to up-down counter
   */
  addToUpDownCounter(
    name: string,
    value: number,
    attributes?: Record<string, string | number | boolean>
  ): void {
    const counter = this.getUpDownCounter(name);
    counter.add(value, attributes);
  }

  /**
   * Create an observable gauge
   */
  createObservableGauge(
    name: string,
    callback: () => number,
    options?: MetricOptions
  ): ObservableGauge {
    const gauge = this.meter.createObservableGauge(name, options);
    gauge.addCallback((result) => {
      result.observe(callback());
    });
    return gauge;
  }

  /**
   * Measure execution time and record in histogram
   */
  async measureTime<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, attributes);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.recordHistogram(name, duration, {
        ...attributes,
        error: 'true',
      });
      throw error;
    }
  }
}

/**
 * Pre-defined business metrics
 */
export class BusinessMetrics {
  private readonly metrics: MetricsManager;

  constructor(metrics?: MetricsManager) {
    this.metrics = metrics || new MetricsManager();
  }

  // Command/Query metrics
  recordCommandExecution(
    commandName: string,
    duration: number,
    success: boolean
  ): void {
    this.metrics.incrementCounter('commands.executed.total', 1, {
      command: commandName,
      success: String(success),
    });
    this.metrics.recordHistogram('commands.duration.ms', duration, {
      command: commandName,
    });
  }

  recordQueryExecution(
    queryName: string,
    duration: number,
    success: boolean
  ): void {
    this.metrics.incrementCounter('queries.executed.total', 1, {
      query: queryName,
      success: String(success),
    });
    this.metrics.recordHistogram('queries.duration.ms', duration, {
      query: queryName,
    });
  }

  // Event metrics
  recordEventPublished(eventType: string): void {
    this.metrics.incrementCounter('events.published.total', 1, {
      event_type: eventType,
    });
  }

  recordEventProcessed(eventType: string, success: boolean): void {
    this.metrics.incrementCounter('events.processed.total', 1, {
      event_type: eventType,
      success: String(success),
    });
  }

  // Saga metrics
  recordSagaStarted(sagaType: string): void {
    this.metrics.incrementCounter('sagas.started.total', 1, {
      saga_type: sagaType,
    });
  }

  recordSagaCompleted(
    sagaType: string,
    success: boolean,
    duration: number
  ): void {
    this.metrics.incrementCounter('sagas.completed.total', 1, {
      saga_type: sagaType,
      success: String(success),
    });
    this.metrics.recordHistogram('sagas.duration.ms', duration, {
      saga_type: sagaType,
    });
  }

  // Outbox metrics
  recordOutboxMessagePublished(eventType: string, success: boolean): void {
    this.metrics.incrementCounter('outbox.messages.published.total', 1, {
      event_type: eventType,
      success: String(success),
    });
  }

  recordOutboxBacklogSize(size: number): void {
    this.metrics.addToUpDownCounter('outbox.backlog.size', size);
  }

  // Cache metrics
  recordCacheHit(cacheKey: string): void {
    this.metrics.incrementCounter('cache.hits.total', 1, {
      cache_key: cacheKey,
    });
  }

  recordCacheMiss(cacheKey: string): void {
    this.metrics.incrementCounter('cache.misses.total', 1, {
      cache_key: cacheKey,
    });
  }

  // Circuit breaker metrics
  recordCircuitBreakerStateChange(
    circuitName: string,
    state: 'open' | 'closed' | 'half-open'
  ): void {
    this.metrics.incrementCounter('circuit_breaker.state_changes.total', 1, {
      circuit: circuitName,
      state,
    });
  }
}

/**
 * Global metrics instances
 */
export const metricsManager = new MetricsManager();
export const businessMetrics = new BusinessMetrics(metricsManager);
