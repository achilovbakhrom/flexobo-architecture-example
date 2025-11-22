import { Test, TestingModule } from '@nestjs/testing';
import { EventUpcasterRegistry } from '../event-upcaster.registry';
import { IEventUpcaster } from '../event-upcaster.interface';
import { EventUpcaster } from '../event-upcaster.decorator';
import { Injectable } from '@nestjs/common';

// Test upcasters
@EventUpcaster('TestEvent', 1, 2)
@Injectable()
class TestEventV1ToV2Upcaster implements IEventUpcaster {
  readonly eventType = 'TestEvent';
  readonly fromVersion = 1;
  readonly toVersion = 2;

  upcast(event: { eventVersion: number; data: { oldField: string } }): {
    eventVersion: number;
    data: { newField: string };
  } {
    return {
      eventVersion: 2,
      data: {
        newField: event.data.oldField.toUpperCase(),
      },
    };
  }
}

@EventUpcaster('TestEvent', 2, 3)
@Injectable()
class TestEventV2ToV3Upcaster implements IEventUpcaster {
  readonly eventType = 'TestEvent';
  readonly fromVersion = 2;
  readonly toVersion = 3;

  upcast(event: { eventVersion: number; data: { newField: string } }): {
    eventVersion: number;
    data: { newField: string; addedField: boolean };
  } {
    return {
      eventVersion: 3,
      data: {
        ...event.data,
        addedField: true,
      },
    };
  }
}

@EventUpcaster('AnotherEvent', 1, 2)
@Injectable()
class AnotherEventV1ToV2Upcaster implements IEventUpcaster {
  readonly eventType = 'AnotherEvent';
  readonly fromVersion = 1;
  readonly toVersion = 2;

  upcast(): { eventVersion: number } {
    return { eventVersion: 2 };
  }
}

describe('EventUpcasterRegistry', () => {
  let registry: EventUpcasterRegistry;
  let module: TestingModule;
  let v1ToV2Upcaster: TestEventV1ToV2Upcaster;
  let v2ToV3Upcaster: TestEventV2ToV3Upcaster;
  let anotherUpcaster: AnotherEventV1ToV2Upcaster;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        EventUpcasterRegistry,
        TestEventV1ToV2Upcaster,
        TestEventV2ToV3Upcaster,
        AnotherEventV1ToV2Upcaster,
      ],
    }).compile();

    registry = module.get<EventUpcasterRegistry>(EventUpcasterRegistry);
    v1ToV2Upcaster = module.get<TestEventV1ToV2Upcaster>(
      TestEventV1ToV2Upcaster
    );
    v2ToV3Upcaster = module.get<TestEventV2ToV3Upcaster>(
      TestEventV2ToV3Upcaster
    );
    anotherUpcaster = module.get<AnotherEventV1ToV2Upcaster>(
      AnotherEventV1ToV2Upcaster
    );

    // Manually register upcasters since auto-discovery is disabled
    registry.register(v1ToV2Upcaster);
    registry.register(v2ToV3Upcaster);
    registry.register(anotherUpcaster);
  });

  afterEach(() => {
    registry.clear();
  });

  describe('register', () => {
    it('should register an upcaster', () => {
      const upcaster = new TestEventV1ToV2Upcaster();
      registry.clear(); // Clear auto-registered upcasters
      registry.register(upcaster);

      const allUpcasters = registry.getAllUpcasters();
      expect(allUpcasters.has('TestEvent')).toBe(true);
      expect(allUpcasters.get('TestEvent')?.has(1)).toBe(true);
    });

    it('should warn when overwriting an existing upcaster', () => {
      const upcaster = new TestEventV1ToV2Upcaster();
      const loggerSpy = jest.spyOn(registry['logger'], 'warn');

      registry.register(upcaster);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Overwriting upcaster')
      );
    });
  });

  describe('upcast', () => {
    it('should upcast an event to the next version', () => {
      const event = {
        eventVersion: 1,
        data: { oldField: 'test' },
      };

      const result = registry.upcast('TestEvent', event, 2);

      expect(result).toEqual({
        eventVersion: 2,
        data: { newField: 'TEST' },
      });
    });

    it('should chain multiple upcasters', () => {
      const event = {
        eventVersion: 1,
        data: { oldField: 'test' },
      };

      const result = registry.upcast('TestEvent', event, 3);

      expect(result).toEqual({
        eventVersion: 3,
        data: {
          newField: 'TEST',
          addedField: true,
        },
      });
    });

    it('should return the same event if already at target version', () => {
      const event = {
        eventVersion: 2,
        data: { newField: 'TEST' },
      };

      const result = registry.upcast('TestEvent', event, 2);

      expect(result).toBe(event);
    });

    it('should throw error if no upcasters registered for event type', () => {
      const event = { eventVersion: 1 };

      expect(() => registry.upcast('UnknownEvent', event, 2)).toThrow(
        'No upcasters registered for event type UnknownEvent'
      );
    });

    it('should throw error if trying to downcast', () => {
      const event = { eventVersion: 3 };

      expect(() => registry.upcast('TestEvent', event, 1)).toThrow(
        'Cannot downcast event'
      );
    });

    it('should throw error if no upcasting path exists', () => {
      const event = { eventVersion: 1 };

      expect(() => registry.upcast('TestEvent', event, 10)).toThrow(
        'No upcasting path found'
      );
    });
  });

  describe('upcastMany', () => {
    it('should upcast multiple events', () => {
      const events = [
        { eventVersion: 1, data: { oldField: 'test1' } },
        { eventVersion: 1, data: { oldField: 'test2' } },
        { eventVersion: 2, data: { newField: 'TEST3' } },
      ];

      const results = registry.upcastMany('TestEvent', events, 3);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        eventVersion: 3,
        data: { newField: 'TEST1', addedField: true },
      });
      expect(results[1]).toEqual({
        eventVersion: 3,
        data: { newField: 'TEST2', addedField: true },
      });
      expect(results[2]).toEqual({
        eventVersion: 3,
        data: { newField: 'TEST3', addedField: true },
      });
    });
  });

  describe('getLatestVersion', () => {
    it('should return the highest version available', () => {
      const latestVersion = registry.getLatestVersion('TestEvent');
      expect(latestVersion).toBe(3);
    });

    it('should return 1 if no upcasters registered', () => {
      const latestVersion = registry.getLatestVersion('UnknownEvent');
      expect(latestVersion).toBe(1);
    });
  });

  describe('hasUpcastPath', () => {
    it('should return true if path exists', () => {
      expect(registry.hasUpcastPath('TestEvent', 1, 3)).toBe(true);
      expect(registry.hasUpcastPath('TestEvent', 2, 3)).toBe(true);
    });

    it('should return true if source equals target', () => {
      expect(registry.hasUpcastPath('TestEvent', 2, 2)).toBe(true);
    });

    it('should return false if no path exists', () => {
      expect(registry.hasUpcastPath('TestEvent', 1, 10)).toBe(false);
    });

    it('should return false if no upcasters registered', () => {
      expect(registry.hasUpcastPath('UnknownEvent', 1, 2)).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize successfully', async () => {
      const loggerSpy = jest.spyOn(registry['logger'], 'log');
      await registry.onModuleInit();
      expect(loggerSpy).toHaveBeenCalledWith(
        'EventUpcasterRegistry initialized'
      );
    });
  });

  describe('clear', () => {
    it('should remove all registered upcasters', () => {
      registry.clear();
      const allUpcasters = registry.getAllUpcasters();
      expect(allUpcasters.size).toBe(0);
    });
  });
});
