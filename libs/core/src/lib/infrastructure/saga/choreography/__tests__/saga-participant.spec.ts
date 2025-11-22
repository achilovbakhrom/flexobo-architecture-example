import { Logger } from '@nestjs/common';
import { SagaParticipant } from '../saga-participant';
import { InMemoryEventBus } from '../in-memory-event-bus';
import { SagaEvent, IChoreographyRepository } from '../choreography.interface';

describe('SagaParticipant', () => {
  let eventBus: InMemoryEventBus;
  let participant: SagaParticipant;
  let mockRepository: jest.Mocked<IChoreographyRepository>;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      addEvent: jest.fn(),
    };
    participant = new SagaParticipant('TestService', eventBus, mockRepository);

    // Suppress logs in tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(async () => {
    await participant.stop();
    eventBus.clear();
  });

  describe('Event Handling', () => {
    it('should handle event and emit success event', async () => {
      const handler = jest.fn().mockResolvedValue({ result: 'success' });
      const successEvents: SagaEvent[] = [];

      // Register handler
      participant.on({
        eventType: 'OrderCreated',
        handler,
        successEventType: 'InventoryReserved',
      });

      // Listen for success event
      await eventBus.subscribe('InventoryReserved', async (event) => {
        successEvents.push(event);
      });

      await participant.start();

      // Emit event
      const event: SagaEvent = {
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalledWith(event);
      expect(successEvents).toHaveLength(1);
      expect(successEvents[0].eventType).toBe('InventoryReserved');
      expect(successEvents[0].sagaId).toBe('saga-1');
      expect(mockRepository.addEvent).toHaveBeenCalledWith('saga-1', {
        eventType: 'OrderCreated',
        timestamp: expect.any(Date),
        participantName: 'TestService',
        status: 'SUCCESS',
      });
    });

    it('should handle event failure and emit failure event', async () => {
      const handler = jest
        .fn()
        .mockRejectedValue(new Error('Inventory unavailable'));
      const failureEvents: SagaEvent[] = [];

      participant.on({
        eventType: 'OrderCreated',
        handler,
        failureEventType: 'OrderFailed',
      });

      await eventBus.subscribe('OrderFailed', async (event) => {
        failureEvents.push(event);
      });

      await participant.start();

      const event: SagaEvent = {
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(failureEvents).toHaveLength(1);
      expect(failureEvents[0].eventType).toBe('OrderFailed');
      expect(mockRepository.addEvent).toHaveBeenCalledWith('saga-1', {
        eventType: 'OrderCreated',
        timestamp: expect.any(Date),
        participantName: 'TestService',
        status: 'FAILED',
        error: 'Inventory unavailable',
      });
    });

    it('should skip event when filter returns false', async () => {
      const handler = jest.fn();

      participant.on({
        eventType: 'OrderCreated',
        handler,
        filter: (event) => (event.payload as { amount: number }).amount > 100,
      });

      await participant.start();

      // Event with amount < 100 (should be filtered)
      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { amount: 50 },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handler).not.toHaveBeenCalled();

      // Event with amount > 100 (should be processed)
      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { amount: 150 },
        sagaId: 'saga-2',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure with exponential backoff', async () => {
      let attempt = 0;
      const handler = jest.fn().mockImplementation(() => {
        attempt++;
        if (attempt < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve({ success: true });
      });

      participant.on({
        eventType: 'OrderCreated',
        handler,
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 10,
        },
      });

      await participant.start();

      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(handler).toHaveBeenCalledTimes(3);
      expect(mockRepository.addEvent).toHaveBeenCalledWith('saga-1', {
        eventType: 'OrderCreated',
        timestamp: expect.any(Date),
        participantName: 'TestService',
        status: 'SUCCESS',
      });
    });

    it('should fail after max retry attempts', async () => {
      const handler = jest
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      participant.on({
        eventType: 'OrderCreated',
        handler,
        failureEventType: 'OrderFailed',
        retry: {
          maxAttempts: 2,
          backoff: 'linear',
          initialDelay: 10,
        },
      });

      await participant.start();

      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler).toHaveBeenCalledTimes(2);
      expect(mockRepository.addEvent).toHaveBeenCalledWith('saga-1', {
        eventType: 'OrderCreated',
        timestamp: expect.any(Date),
        participantName: 'TestService',
        status: 'FAILED',
        error: 'Persistent failure',
      });
    });
  });

  describe('Compensation', () => {
    it('should execute compensation handler on compensate event', async () => {
      const handler = jest.fn().mockResolvedValue({ reserved: true });
      const compensationHandler = jest.fn().mockResolvedValue(undefined);

      participant.on({
        eventType: 'OrderCreated',
        handler,
        compensationHandler,
      });

      await participant.start();

      // First, handle the normal event
      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(handler).toHaveBeenCalled();

      // Now trigger compensation
      await eventBus.publish({
        eventType: 'OrderCreated.compensate',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(compensationHandler).toHaveBeenCalled();
    });
  });

  describe('Lifecycle', () => {
    it('should start and stop successfully', async () => {
      participant.on({
        eventType: 'TestEvent',
        handler: jest.fn(),
      });

      await participant.start();
      expect(eventBus.getSubscriberCount('TestEvent')).toBeGreaterThan(0);

      await participant.stop();
      // After stop, can still have subscribers from the in-memory implementation
    });

    it('should not start twice', async () => {
      await participant.start();
      await participant.start(); // Should warn but not fail

      expect(Logger.prototype.warn).toHaveBeenCalledWith(
        'Participant already listening'
      );
    });
  });

  describe('Multiple Handlers', () => {
    it('should execute multiple handlers for same event', async () => {
      const handler1 = jest.fn().mockResolvedValue({ result: '1' });
      const handler2 = jest.fn().mockResolvedValue({ result: '2' });

      participant.on({
        eventType: 'OrderCreated',
        handler: handler1,
      });

      participant.on({
        eventType: 'OrderCreated',
        handler: handler2,
      });

      await participant.start();

      await eventBus.publish({
        eventType: 'OrderCreated',
        payload: { orderId: '123' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });
});
