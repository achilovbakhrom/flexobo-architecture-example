/**
 * Saga execution status
 */
export enum SagaStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  COMPENSATION_FAILED = 'COMPENSATION_FAILED',
}

/**
 * Saga step status
 */
export enum SagaStepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  COMPENSATING = 'COMPENSATING',
  COMPENSATED = 'COMPENSATED',
  SKIPPED = 'SKIPPED',
}

/**
 * Saga step definition
 */
export interface SagaStep<TContext = unknown, TStepResult = unknown> {
  /**
   * Step name
   */
  name: string;

  /**
   * Execute the step
   */
  invoke: (context: TContext) => Promise<TStepResult>;

  /**
   * Compensate/rollback the step
   */
  compensate: (context: TContext, result?: TStepResult) => Promise<void>;

  /**
   * Optional condition to determine if step should be executed
   */
  condition?: (context: TContext) => boolean | Promise<boolean>;

  /**
   * Optional timeout in milliseconds
   */
  timeout?: number;

  /**
   * Optional retry configuration
   */
  retry?: {
    maxAttempts: number;
    backoff?: 'linear' | 'exponential';
    initialDelay?: number;
  };
}

/**
 * Saga step execution result
 */
export interface SagaStepExecution {
  stepName: string;
  status: SagaStepStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: unknown;
  error?: string;
  attempt: number;
}

/**
 * Saga execution state
 */
export interface SagaExecution<TContext = unknown> {
  sagaId: string;
  sagaType: string;
  status: SagaStatus;
  context: TContext;
  steps: SagaStepExecution[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Saga definition
 */
export interface ISaga<TContext = unknown> {
  /**
   * Saga type identifier
   */
  readonly type: string;

  /**
   * Saga steps
   */
  readonly steps: SagaStep<TContext>[];

  /**
   * Execute the saga
   */
  execute(context: TContext): Promise<SagaExecution<TContext>>;
}

/**
 * Saga repository for persisting saga state
 */
export interface ISagaRepository {
  /**
   * Save saga execution state
   */
  save(execution: SagaExecution): Promise<void>;

  /**
   * Find saga execution by ID
   */
  findById(sagaId: string): Promise<SagaExecution | null>;

  /**
   * Find saga executions by status
   */
  findByStatus(status: SagaStatus, limit?: number): Promise<SagaExecution[]>;

  /**
   * Update saga execution status
   */
  updateStatus(sagaId: string, status: SagaStatus): Promise<void>;

  /**
   * Update saga step status
   */
  updateStepStatus(
    sagaId: string,
    stepName: string,
    status: SagaStepStatus,
    result?: unknown,
    error?: string
  ): Promise<void>;

  /**
   * Delete saga execution (after completion/compensation)
   */
  delete(sagaId: string): Promise<void>;
}

/**
 * Saga orchestrator events
 */
export interface SagaStartedEvent {
  sagaId: string;
  sagaType: string;
  timestamp: Date;
}

export interface SagaCompletedEvent {
  sagaId: string;
  sagaType: string;
  timestamp: Date;
}

export interface SagaFailedEvent {
  sagaId: string;
  sagaType: string;
  error: string;
  timestamp: Date;
}

export interface SagaCompensatedEvent {
  sagaId: string;
  sagaType: string;
  timestamp: Date;
}

export interface SagaStepStartedEvent {
  sagaId: string;
  stepName: string;
  timestamp: Date;
}

export interface SagaStepCompletedEvent {
  sagaId: string;
  stepName: string;
  result: unknown;
  timestamp: Date;
}

export interface SagaStepFailedEvent {
  sagaId: string;
  stepName: string;
  error: string;
  timestamp: Date;
}
