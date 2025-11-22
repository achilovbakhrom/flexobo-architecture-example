import { EventEmitter2 } from '@nestjs/event-emitter';
import { ISagaRepository, SagaStep } from './saga.interface';
import { SagaOrchestrator } from './saga-orchestrator';

/**
 * Fluent builder for creating saga orchestrators
 */
export class SagaBuilder<TContext = unknown> {
  private sagaType?: string;
  private readonly sagaSteps: SagaStep<TContext>[] = [];

  constructor(
    private readonly repository: ISagaRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Set saga type
   */
  type(type: string): this {
    this.sagaType = type;
    return this;
  }

  /**
   * Add a step to the saga
   */
  step(step: SagaStep<TContext>): this {
    this.sagaSteps.push(step);
    return this;
  }

  /**
   * Add a step with inline definitions
   */
  addStep(
    name: string,
    invoke: (context: TContext) => Promise<unknown>,
    compensate: (context: TContext, result?: unknown) => Promise<void>,
    options?: {
      condition?: (context: TContext) => boolean | Promise<boolean>;
      timeout?: number;
      retry?: {
        maxAttempts: number;
        backoff?: 'linear' | 'exponential';
        initialDelay?: number;
      };
    }
  ): this {
    this.sagaSteps.push({
      name,
      invoke,
      compensate,
      condition: options?.condition,
      timeout: options?.timeout,
      retry: options?.retry,
    });
    return this;
  }

  /**
   * Build the saga orchestrator
   */
  build(): SagaOrchestrator<TContext> {
    if (!this.sagaType) {
      throw new Error('Saga type must be set');
    }

    if (this.sagaSteps.length === 0) {
      throw new Error('Saga must have at least one step');
    }

    return new SagaOrchestrator(
      this.sagaType,
      this.sagaSteps,
      this.repository,
      this.eventEmitter
    );
  }
}

/**
 * Create a new saga builder
 */
export function createSaga<TContext = unknown>(
  repository: ISagaRepository,
  eventEmitter: EventEmitter2
): SagaBuilder<TContext> {
  return new SagaBuilder<TContext>(repository, eventEmitter);
}
