import { EventEmitter2 } from '@nestjs/event-emitter';
import { createSaga, SagaBuilder } from '../saga.builder';
import { ISagaRepository, SagaStep } from '../saga.interface';

describe('SagaBuilder', () => {
  let mockRepository: jest.Mocked<ISagaRepository>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  interface TestContext {
    value: number;
  }

  beforeEach(() => {
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByStatus: jest.fn(),
      updateStatus: jest.fn(),
      updateStepStatus: jest.fn(),
      delete: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
  });

  describe('builder pattern', () => {
    it('should build saga with type and steps', () => {
      const builder = new SagaBuilder<TestContext>(
        mockRepository,
        mockEventEmitter
      );

      const step: SagaStep<TestContext> = {
        name: 'TestStep',
        invoke: jest.fn(),
        compensate: jest.fn(),
      };

      const saga = builder.type('TestSaga').step(step).build();

      expect(saga.type).toBe('TestSaga');
      expect(saga.steps).toHaveLength(1);
      expect(saga.steps[0]).toBe(step);
    });

    it('should add step with inline definitions', () => {
      const builder = new SagaBuilder<TestContext>(
        mockRepository,
        mockEventEmitter
      );

      const invoke = jest.fn();
      const compensate = jest.fn();

      const saga = builder
        .type('TestSaga')
        .addStep('Step1', invoke, compensate, {
          timeout: 5000,
          retry: { maxAttempts: 3 },
        })
        .build();

      expect(saga.steps).toHaveLength(1);
      expect(saga.steps[0].name).toBe('Step1');
      expect(saga.steps[0].timeout).toBe(5000);
      expect(saga.steps[0].retry?.maxAttempts).toBe(3);
    });

    it('should throw error if saga type is not set', () => {
      const builder = new SagaBuilder<TestContext>(
        mockRepository,
        mockEventEmitter
      );

      const step: SagaStep<TestContext> = {
        name: 'TestStep',
        invoke: jest.fn(),
        compensate: jest.fn(),
      };

      expect(() => builder.step(step).build()).toThrow('Saga type must be set');
    });

    it('should throw error if no steps are added', () => {
      const builder = new SagaBuilder<TestContext>(
        mockRepository,
        mockEventEmitter
      );

      expect(() => builder.type('TestSaga').build()).toThrow(
        'Saga must have at least one step'
      );
    });
  });

  describe('createSaga helper', () => {
    it('should create saga builder instance', () => {
      const builder = createSaga<TestContext>(mockRepository, mockEventEmitter);

      expect(builder).toBeInstanceOf(SagaBuilder);
    });

    it('should build complete saga with fluent API', () => {
      const saga = createSaga<TestContext>(mockRepository, mockEventEmitter)
        .type('OrderSaga')
        .addStep(
          'ReserveInventory',
          async () => ({ reservationId: 'res-1' }),
          async () => undefined
        )
        .addStep(
          'ProcessPayment',
          async () => ({ paymentId: 'pay-1' }),
          async () => undefined
        )
        .build();

      expect(saga.type).toBe('OrderSaga');
      expect(saga.steps).toHaveLength(2);
      expect(saga.steps[0].name).toBe('ReserveInventory');
      expect(saga.steps[1].name).toBe('ProcessPayment');
    });
  });
});
