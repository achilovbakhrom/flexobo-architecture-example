import { Logger } from '@nestjs/common';
import { InMemoryEventBus } from '../in-memory-event-bus';
import { SagaEvent } from '../choreography.interface';

describe('InMemoryEventBus', () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();

    // Suppress logs in tests
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    eventBus.clear();
  });

  describe('Publish/Subscribe', () => {
    it('should publish event to subscribed handlers', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('TestEvent', handler);

      const event: SagaEvent = {
        eventType: 'TestEvent',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);

      expect(handler).toHaveBeenCalledWith(event);
    });

    it('should publish to multiple subscribers', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);
      const handler3 = jest.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('TestEvent', handler1);
      await eventBus.subscribe('TestEvent', handler2);
      await eventBus.subscribe('TestEvent', handler3);

      const event: SagaEvent = {
        eventType: 'TestEvent',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(handler3).toHaveBeenCalledWith(event);
    });

    it('should not fail when publishing to no subscribers', async () => {
      const event: SagaEvent = {
        eventType: 'NonExistentEvent',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await expect(eventBus.publish(event)).resolves.not.toThrow();
      expect(Logger.prototype.debug).toHaveBeenCalledWith(
        'No subscribers for event: NonExistentEvent'
      );
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest
        .fn()
        .mockRejectedValue(new Error('Handler error'));
      const successHandler = jest.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('TestEvent', errorHandler);
      await eventBus.subscribe('TestEvent', successHandler);

      const event: SagaEvent = {
        eventType: 'TestEvent',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
      expect(Logger.prototype.error).toHaveBeenCalled();
    });
  });

  describe('Unsubscribe', () => {
    it('should unsubscribe from event', async () => {
      const handler = jest.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('TestEvent', handler);
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(1);

      await eventBus.unsubscribe('TestEvent');
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(0);

      const event: SagaEvent = {
        eventType: 'TestEvent',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      };

      await eventBus.publish(event);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Clear', () => {
    it('should clear all subscriptions', async () => {
      await eventBus.subscribe('Event1', jest.fn());
      await eventBus.subscribe('Event2', jest.fn());
      await eventBus.subscribe('Event3', jest.fn());

      expect(eventBus.getSubscriberCount('Event1')).toBe(1);
      expect(eventBus.getSubscriberCount('Event2')).toBe(1);
      expect(eventBus.getSubscriberCount('Event3')).toBe(1);

      eventBus.clear();

      expect(eventBus.getSubscriberCount('Event1')).toBe(0);
      expect(eventBus.getSubscriberCount('Event2')).toBe(0);
      expect(eventBus.getSubscriberCount('Event3')).toBe(0);
    });
  });

  describe('Subscriber Count', () => {
    it('should return correct subscriber count', async () => {
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(0);

      await eventBus.subscribe('TestEvent', jest.fn());
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(1);

      await eventBus.subscribe('TestEvent', jest.fn());
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(2);

      await eventBus.subscribe('TestEvent', jest.fn());
      expect(eventBus.getSubscriberCount('TestEvent')).toBe(3);
    });
  });

  describe('Event Isolation', () => {
    it('should not trigger handlers for different event types', async () => {
      const handler1 = jest.fn().mockResolvedValue(undefined);
      const handler2 = jest.fn().mockResolvedValue(undefined);

      await eventBus.subscribe('Event1', handler1);
      await eventBus.subscribe('Event2', handler2);

      await eventBus.publish({
        eventType: 'Event1',
        payload: { data: 'test' },
        sagaId: 'saga-1',
        timestamp: new Date(),
      });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });
});
