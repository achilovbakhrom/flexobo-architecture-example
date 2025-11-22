import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  ISagaParticipant,
  IEventBus,
  EventHandlerRegistration,
  SagaEvent,
  SagaEventHandler,
  IChoreographyRepository,
} from './choreography.interface';

/**
 * Saga participant implementation for choreography pattern
 */
@Injectable()
export class SagaParticipant
  implements ISagaParticipant, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(SagaParticipant.name);
  private readonly handlers = new Map<string, EventHandlerRegistration[]>();
  private readonly compensationHandlers = new Map<
    string,
    EventHandlerRegistration[]
  >();
  private isListening = false;

  constructor(
    public readonly name: string,
    private readonly eventBus: IEventBus,
    private readonly repository?: IChoreographyRepository
  ) {}

  /**
   * Register event handler
   */
  on<TPayload = unknown>(
    registration: EventHandlerRegistration<TPayload>
  ): void {
    const { eventType, compensationHandler } = registration;

    // Register forward handler
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers
      .get(eventType)!
      .push(registration as EventHandlerRegistration);

    // Register compensation handler if provided
    if (compensationHandler) {
      const compensationEventType = `${eventType}.compensate`;
      if (!this.compensationHandlers.has(compensationEventType)) {
        this.compensationHandlers.set(compensationEventType, []);
      }
      this.compensationHandlers
        .get(compensationEventType)!
        .push(registration as EventHandlerRegistration);
    }

    this.logger.debug(`Registered handler for event: ${eventType}`);
  }

  /**
   * Start listening for events
   */
  async start(): Promise<void> {
    if (this.isListening) {
      this.logger.warn('Participant already listening');
      return;
    }

    this.logger.log(`Starting participant: ${this.name}`);

    // Subscribe to all registered event types
    for (const eventType of this.handlers.keys()) {
      await this.eventBus.subscribe(eventType, (event) =>
        this.handleEvent(event, false)
      );
    }

    // Subscribe to all compensation event types
    for (const eventType of this.compensationHandlers.keys()) {
      await this.eventBus.subscribe(eventType, (event) =>
        this.handleEvent(event, true)
      );
    }

    this.isListening = true;
    this.logger.log(`Participant ${this.name} started successfully`);
  }

  /**
   * Stop listening for events
   */
  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    this.logger.log(`Stopping participant: ${this.name}`);

    // Unsubscribe from all event types
    for (const eventType of this.handlers.keys()) {
      await this.eventBus.unsubscribe(eventType);
    }

    for (const eventType of this.compensationHandlers.keys()) {
      await this.eventBus.unsubscribe(eventType);
    }

    this.isListening = false;
    this.logger.log(`Participant ${this.name} stopped`);
  }

  /**
   * Emit an event
   */
  async emit<TPayload = unknown>(event: SagaEvent<TPayload>): Promise<void> {
    this.logger.debug(
      `Participant ${this.name} emitting event: ${event.eventType}`
    );
    await this.eventBus.publish(event);
  }

  /**
   * Handle incoming event
   */
  private async handleEvent(
    event: SagaEvent,
    isCompensation: boolean
  ): Promise<void> {
    const eventType = event.eventType;
    const handlers = isCompensation
      ? this.compensationHandlers.get(eventType)
      : this.handlers.get(eventType);

    if (!handlers || handlers.length === 0) {
      return;
    }

    for (const registration of handlers) {
      // Check filter
      if (registration.filter) {
        const shouldProcess = await registration.filter(event);
        if (!shouldProcess) {
          this.logger.debug(
            `Event ${eventType} filtered out for handler in ${this.name}`
          );
          continue;
        }
      }

      // Execute handler with retry
      try {
        const handler = isCompensation
          ? registration.compensationHandler
          : registration.handler;

        if (!handler) {
          continue;
        }

        const result = await this.executeWithRetry(
          handler,
          event,
          registration.retry
        );

        // Track success in repository
        if (this.repository) {
          await this.repository.addEvent(event.sagaId, {
            eventType,
            timestamp: new Date(),
            participantName: this.name,
            status: 'SUCCESS',
          });
        }

        // Emit success event if configured
        if (!isCompensation && registration.successEventType) {
          await this.emit({
            eventType: registration.successEventType,
            payload: result,
            sagaId: event.sagaId,
            timestamp: new Date(),
            metadata: {
              ...event.metadata,
              previousEvent: eventType,
              participantName: this.name,
            },
          });
        }

        this.logger.debug(
          `Successfully handled event ${eventType} in ${this.name}`
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to handle event ${eventType} in ${this.name}: ${errorMessage}`
        );

        // Track failure in repository
        if (this.repository) {
          await this.repository.addEvent(event.sagaId, {
            eventType,
            timestamp: new Date(),
            participantName: this.name,
            status: 'FAILED',
            error: errorMessage,
          });
        }

        // Emit failure event if configured
        if (!isCompensation && registration.failureEventType) {
          await this.emit({
            eventType: registration.failureEventType,
            payload: { error: errorMessage, originalEvent: event },
            sagaId: event.sagaId,
            timestamp: new Date(),
            metadata: {
              ...event.metadata,
              previousEvent: eventType,
              participantName: this.name,
              error: errorMessage,
            },
          });
        }
      }
    }
  }

  /**
   * Execute handler with retry logic
   */
  private async executeWithRetry<TPayload, TResult>(
    handler: SagaEventHandler<TPayload, TResult>,
    event: SagaEvent<TPayload>,
    retryConfig?: EventHandlerRegistration['retry']
  ): Promise<TResult> {
    const maxAttempts = retryConfig?.maxAttempts ?? 1;
    const backoff = retryConfig?.backoff ?? 'exponential';
    const initialDelay = retryConfig?.initialDelay ?? 1000;

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await handler(event);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Handler attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`
        );

        if (attempt < maxAttempts) {
          const delay =
            backoff === 'linear'
              ? initialDelay * attempt
              : initialDelay * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }
      }
    }

    throw lastError ?? new Error('Handler failed');
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Module initialization
   */
  async onModuleInit(): Promise<void> {
    await this.start();
  }

  /**
   * Module destruction
   */
  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }
}
