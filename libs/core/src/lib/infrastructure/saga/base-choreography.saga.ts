/**
 * Base Choreography Saga
 *
 * Abstract base class for choreography-based sagas that react to events.
 * Provides common state management functionality using Redis.
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class OrderFulfillmentSaga extends BaseChoreographySaga<OrderSagaState> {
 *   constructor(
 *     @Inject(SAGA_REPOSITORY) repository: ISagaRepository,
 *     private readonly commandBus: CommandBus
 *   ) {
 *     super(repository, 'OrderFulfillment', { cleanupTtl: 300 });
 *   }
 *
 *   @OnEvent(ORDER_EVENTS.CONFIRMED)
 *   async onOrderConfirmed(event: DomainEvent): Promise<void> {
 *     await this.startSaga(event.aggregateId, {
 *       orderId: event.aggregateId,
 *       status: 'STARTED',
 *       paymentCompleted: false,
 *     });
 *   }
 *
 *   @OnEvent(PAYMENT_EVENTS.COMPLETED)
 *   async onPaymentCompleted(event: DomainEvent): Promise<void> {
 *     await this.updateState(event.data.orderId, (state) => ({
 *       ...state,
 *       status: 'PAYMENT_COMPLETED',
 *       paymentCompleted: true,
 *     }));
 *   }
 * }
 * ```
 */

import { Logger } from '@nestjs/common';
import {
  ISagaRepository,
  SagaExecution,
  SagaStatus,
  SagaStepStatus,
} from './saga.interface';

export interface ChoreographySagaOptions {
  /**
   * TTL in seconds for cleanup after saga completes (default: 60)
   */
  cleanupTtl?: number;

  /**
   * Default TTL in seconds for saga state (default: 7 days)
   */
  defaultTtl?: number;
}

export abstract class BaseChoreographySaga<TState extends object = object> {
  protected readonly logger: Logger;
  private readonly options: Required<ChoreographySagaOptions>;

  constructor(
    protected readonly repository: ISagaRepository,
    protected readonly sagaType: string,
    options?: ChoreographySagaOptions
  ) {
    this.logger = new Logger(this.constructor.name);
    this.options = {
      cleanupTtl: options?.cleanupTtl ?? 60,
      defaultTtl: options?.defaultTtl ?? 86400 * 7,
    };
  }

  /**
   * Start a new saga instance
   */
  protected async startSaga(
    sagaId: string,
    initialState: TState,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    this.logger.log(`[SAGA] Starting ${this.sagaType} saga: ${sagaId}`);

    const execution: SagaExecution<TState> = {
      sagaId,
      sagaType: this.sagaType,
      status: SagaStatus.RUNNING,
      context: initialState,
      steps: [],
      startedAt: new Date(),
      metadata,
    };

    await this.repository.save(execution);
  }

  /**
   * Get saga state by ID
   */
  protected async getState(sagaId: string): Promise<TState | null> {
    const execution = await this.repository.findById(sagaId);
    return execution?.context as TState | null;
  }

  /**
   * Update saga state
   */
  protected async updateState(
    sagaId: string,
    updater: (state: TState) => TState | Promise<TState>
  ): Promise<TState | null> {
    const execution = await this.repository.findById(sagaId);

    if (!execution) {
      this.logger.warn(`[SAGA] No state found for saga ${sagaId}`);
      return null;
    }

    const currentState = execution.context as TState;
    const newState = await updater(currentState);

    execution.context = newState;
    await this.repository.save(execution as SagaExecution);

    return newState;
  }

  /**
   * Get or create saga state
   * Useful when events may arrive before the saga is started
   */
  protected async getOrCreateState(
    sagaId: string,
    defaultState: TState
  ): Promise<TState> {
    const existing = await this.getState(sagaId);

    if (existing) {
      return existing;
    }

    await this.startSaga(sagaId, defaultState);
    return defaultState;
  }

  /**
   * Record a step execution in the saga
   */
  protected async recordStep(
    sagaId: string,
    stepName: string,
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED',
    result?: unknown,
    error?: string
  ): Promise<void> {
    const stepStatus = {
      PENDING: SagaStepStatus.PENDING,
      RUNNING: SagaStepStatus.RUNNING,
      COMPLETED: SagaStepStatus.COMPLETED,
      FAILED: SagaStepStatus.FAILED,
    }[status];

    await this.repository.updateStepStatus(
      sagaId,
      stepName,
      stepStatus,
      result,
      error
    );
  }

  /**
   * Complete the saga successfully
   */
  protected async completeSaga(sagaId: string): Promise<void> {
    this.logger.log(`[SAGA] Completing ${this.sagaType} saga: ${sagaId}`);

    await this.repository.updateStatus(sagaId, SagaStatus.COMPLETED);

    // Schedule cleanup after TTL
    if ('setTtl' in this.repository) {
      await (this.repository as { setTtl: (id: string, ttl: number) => Promise<void> })
        .setTtl(sagaId, this.options.cleanupTtl);
    }
  }

  /**
   * Fail the saga
   */
  protected async failSaga(sagaId: string, reason?: string): Promise<void> {
    this.logger.warn(
      `[SAGA] Failing ${this.sagaType} saga: ${sagaId} - ${reason || 'Unknown reason'}`
    );

    const execution = await this.repository.findById(sagaId);
    if (execution) {
      execution.status = SagaStatus.FAILED;
      execution.error = reason;
      execution.completedAt = new Date();
      await this.repository.save(execution);
    }

    // Schedule cleanup after TTL
    if ('setTtl' in this.repository) {
      await (this.repository as { setTtl: (id: string, ttl: number) => Promise<void> })
        .setTtl(sagaId, this.options.cleanupTtl);
    }
  }

  /**
   * Start compensating (rolling back) the saga
   */
  protected async startCompensation(sagaId: string): Promise<void> {
    this.logger.log(`[SAGA] Starting compensation for saga: ${sagaId}`);
    await this.repository.updateStatus(sagaId, SagaStatus.COMPENSATING);
  }

  /**
   * Mark saga as compensated (rollback complete)
   */
  protected async markCompensated(sagaId: string): Promise<void> {
    this.logger.log(`[SAGA] Saga compensated: ${sagaId}`);

    await this.repository.updateStatus(sagaId, SagaStatus.COMPENSATED);

    // Schedule cleanup after TTL
    if ('setTtl' in this.repository) {
      await (this.repository as { setTtl: (id: string, ttl: number) => Promise<void> })
        .setTtl(sagaId, this.options.cleanupTtl);
    }
  }

  /**
   * Check if saga exists
   */
  protected async exists(sagaId: string): Promise<boolean> {
    if ('exists' in this.repository) {
      return await (this.repository as { exists: (id: string) => Promise<boolean> })
        .exists(sagaId);
    }

    const execution = await this.repository.findById(sagaId);
    return execution !== null;
  }

  /**
   * Get all active sagas of this type
   */
  async getActiveSagas(): Promise<SagaExecution<TState>[]> {
    if ('findAll' in this.repository) {
      const all = await (this.repository as { findAll: (limit?: number) => Promise<SagaExecution[]> })
        .findAll(100);
      return all.filter(
        (s) => s.sagaType === this.sagaType
      ) as SagaExecution<TState>[];
    }

    const running = await this.repository.findByStatus(SagaStatus.RUNNING);
    return running.filter(
      (s) => s.sagaType === this.sagaType
    ) as SagaExecution<TState>[];
  }

  /**
   * Get a specific saga execution
   */
  async getSaga(sagaId: string): Promise<SagaExecution<TState> | null> {
    return (await this.repository.findById(sagaId)) as SagaExecution<TState> | null;
  }
}
