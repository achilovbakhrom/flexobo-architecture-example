/**
 * Choreography saga interfaces for event-driven distributed transactions
 *
 * Unlike orchestration (centralized), choreography uses events to coordinate
 * between services without a central coordinator.
 */

/**
 * Saga event that triggers actions in choreography
 */
export interface SagaEvent<TPayload = unknown> {
  /**
   * Event type identifier
   */
  eventType: string;

  /**
   * Event payload
   */
  payload: TPayload;

  /**
   * Saga correlation ID for tracking related events
   */
  sagaId: string;

  /**
   * Timestamp when event occurred
   */
  timestamp: Date;

  /**
   * Metadata for additional context
   */
  metadata?: Record<string, unknown>;
}

/**
 * Saga event handler function
 */
export type SagaEventHandler<TPayload = unknown, TResult = unknown> = (
  event: SagaEvent<TPayload>
) => Promise<TResult>;

/**
 * Compensation handler for rollback
 */
export type CompensationHandler<TPayload = unknown> = (
  event: SagaEvent<TPayload>
) => Promise<void>;

/**
 * Event handler registration
 */
export interface EventHandlerRegistration<TPayload = unknown> {
  /**
   * Event type to listen for
   */
  eventType: string;

  /**
   * Handler function
   */
  handler: SagaEventHandler<TPayload>;

  /**
   * Compensation handler for rollback
   */
  compensationHandler?: CompensationHandler<TPayload>;

  /**
   * Event type to emit on success
   */
  successEventType?: string;

  /**
   * Event type to emit on failure
   */
  failureEventType?: string;

  /**
   * Filter to determine if event should be processed
   */
  filter?: (event: SagaEvent<TPayload>) => boolean | Promise<boolean>;

  /**
   * Retry configuration
   */
  retry?: {
    maxAttempts: number;
    backoff?: 'linear' | 'exponential';
    initialDelay?: number;
  };
}

/**
 * Choreography saga participant
 * Each microservice implements this to participate in saga
 */
export interface ISagaParticipant {
  /**
   * Participant name
   */
  readonly name: string;

  /**
   * Register event handler
   */
  on<TPayload = unknown>(
    registration: EventHandlerRegistration<TPayload>
  ): void;

  /**
   * Start listening for events
   */
  start(): Promise<void>;

  /**
   * Stop listening for events
   */
  stop(): Promise<void>;

  /**
   * Emit an event
   */
  emit<TPayload = unknown>(event: SagaEvent<TPayload>): Promise<void>;
}

/**
 * Event bus for choreography
 */
export interface IEventBus {
  /**
   * Publish event to bus
   */
  publish<TPayload = unknown>(event: SagaEvent<TPayload>): Promise<void>;

  /**
   * Subscribe to event type
   */
  subscribe<TPayload = unknown>(
    eventType: string,
    handler: SagaEventHandler<TPayload>
  ): Promise<void>;

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: string): Promise<void>;
}

/**
 * Saga choreography state for tracking
 */
export interface ChoreographyState {
  sagaId: string;
  startedAt: Date;
  completedAt?: Date;
  events: Array<{
    eventType: string;
    timestamp: Date;
    participantName: string;
    status: 'SUCCESS' | 'FAILED';
    error?: string;
  }>;
  status:
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'COMPENSATING'
    | 'COMPENSATED'
    | 'FAILED';
}

/**
 * Repository for tracking choreography state
 */
export interface IChoreographyRepository {
  /**
   * Save choreography state
   */
  save(state: ChoreographyState): Promise<void>;

  /**
   * Find choreography state by saga ID
   */
  findById(sagaId: string): Promise<ChoreographyState | null>;

  /**
   * Update choreography status
   */
  updateStatus(
    sagaId: string,
    status: ChoreographyState['status']
  ): Promise<void>;

  /**
   * Add event to choreography history
   */
  addEvent(
    sagaId: string,
    event: ChoreographyState['events'][0]
  ): Promise<void>;
}
