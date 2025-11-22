import { EventEmitter2 } from '@nestjs/event-emitter';
import { SagaOrchestrator } from '../saga-orchestrator';
import {
  ISagaRepository,
  SagaStatus,
  SagaStep,
  SagaStepStatus,
} from '../saga.interface';

describe('SagaOrchestrator', () => {
  let orchestrator: SagaOrchestrator<TestContext>;
  let mockRepository: jest.Mocked<ISagaRepository>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  interface TestContext {
    orderId: string;
    userId: string;
    amount: number;
    reservationId?: string;
    paymentId?: string;
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

  describe('successful execution', () => {
    it('should execute all steps and complete successfully', async () => {
      const reserveInventory = jest
        .fn()
        .mockResolvedValue({ reservationId: 'res-123' });
      const processPayment = jest
        .fn()
        .mockResolvedValue({ paymentId: 'pay-456' });
      const confirmOrder = jest
        .fn()
        .mockResolvedValue({ orderId: 'order-789' });

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'ReserveInventory',
          invoke: reserveInventory,
          compensate: jest.fn(),
        },
        {
          name: 'ProcessPayment',
          invoke: processPayment,
          compensate: jest.fn(),
        },
        {
          name: 'ConfirmOrder',
          invoke: confirmOrder,
          compensate: jest.fn(),
        },
      ];

      orchestrator = new SagaOrchestrator(
        'OrderSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPLETED);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].status).toBe(SagaStepStatus.COMPLETED);
      expect(result.steps[1].status).toBe(SagaStepStatus.COMPLETED);
      expect(result.steps[2].status).toBe(SagaStepStatus.COMPLETED);

      expect(reserveInventory).toHaveBeenCalledWith(context);
      expect(processPayment).toHaveBeenCalledWith(context);
      expect(confirmOrder).toHaveBeenCalledWith(context);

      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        SagaStatus.COMPLETED
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.started',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.completed',
        expect.any(Object)
      );
    });

    it('should skip steps with failing conditions', async () => {
      const step1 = jest.fn().mockResolvedValue('result1');
      const step2 = jest.fn().mockResolvedValue('result2');
      const step3 = jest.fn().mockResolvedValue('result3');

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'Step1',
          invoke: step1,
          compensate: jest.fn(),
        },
        {
          name: 'Step2',
          invoke: step2,
          compensate: jest.fn(),
          condition: () => false, // This step should be skipped
        },
        {
          name: 'Step3',
          invoke: step3,
          compensate: jest.fn(),
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPLETED);
      expect(result.steps).toHaveLength(3);
      expect(result.steps[0].status).toBe(SagaStepStatus.COMPLETED);
      expect(result.steps[1].status).toBe(SagaStepStatus.SKIPPED);
      expect(result.steps[2].status).toBe(SagaStepStatus.COMPLETED);

      expect(step1).toHaveBeenCalled();
      expect(step2).not.toHaveBeenCalled();
      expect(step3).toHaveBeenCalled();
    });
  });

  describe('failure and compensation', () => {
    it('should compensate completed steps when a step fails', async () => {
      const step1Invoke = jest.fn().mockResolvedValue({ id: '1' });
      const step1Compensate = jest.fn().mockResolvedValue(undefined);
      const step2Invoke = jest.fn().mockResolvedValue({ id: '2' });
      const step2Compensate = jest.fn().mockResolvedValue(undefined);
      const step3Invoke = jest
        .fn()
        .mockRejectedValue(new Error('Payment failed'));
      const step3Compensate = jest.fn().mockResolvedValue(undefined);

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'ReserveInventory',
          invoke: step1Invoke,
          compensate: step1Compensate,
        },
        {
          name: 'ReserveShipping',
          invoke: step2Invoke,
          compensate: step2Compensate,
        },
        {
          name: 'ProcessPayment',
          invoke: step3Invoke,
          compensate: step3Compensate,
        },
      ];

      orchestrator = new SagaOrchestrator(
        'OrderSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPENSATED);
      expect(result.error).toBe('Step ProcessPayment failed: Payment failed');

      // Steps 1 and 2 completed, step 3 failed
      expect(step1Invoke).toHaveBeenCalled();
      expect(step2Invoke).toHaveBeenCalled();
      expect(step3Invoke).toHaveBeenCalled();

      // Compensation should be called in reverse order for completed steps only
      expect(step2Compensate).toHaveBeenCalledWith(context, { id: '2' });
      expect(step1Compensate).toHaveBeenCalledWith(context, { id: '1' });
      expect(step3Compensate).not.toHaveBeenCalled();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.failed',
        expect.any(Object)
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.compensated',
        expect.any(Object)
      );
    });

    it('should handle compensation failure', async () => {
      const step1Invoke = jest.fn().mockResolvedValue({ id: '1' });
      const step1Compensate = jest
        .fn()
        .mockRejectedValue(new Error('Compensation failed'));
      const step2Invoke = jest.fn().mockRejectedValue(new Error('Step failed'));
      const step2Compensate = jest.fn();

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'Step1',
          invoke: step1Invoke,
          compensate: step1Compensate,
        },
        {
          name: 'Step2',
          invoke: step2Invoke,
          compensate: step2Compensate,
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPENSATION_FAILED);
      expect(step1Compensate).toHaveBeenCalled();
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        expect.any(String),
        SagaStatus.COMPENSATION_FAILED
      );
    });
  });

  describe('retry logic', () => {
    it('should retry failed step with exponential backoff', async () => {
      let attemptCount = 0;
      const step1Invoke = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new Error('Transient failure'));
        }
        return Promise.resolve({ success: true });
      });

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'RetryableStep',
          invoke: step1Invoke,
          compensate: jest.fn(),
          retry: {
            maxAttempts: 3,
            backoff: 'exponential',
            initialDelay: 10,
          },
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPLETED);
      expect(step1Invoke).toHaveBeenCalledTimes(3);
      expect(result.steps[0].attempt).toBe(3);
    });

    it('should fail after max retry attempts', async () => {
      const step1Invoke = jest
        .fn()
        .mockRejectedValue(new Error('Persistent failure'));

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'FailingStep',
          invoke: step1Invoke,
          compensate: jest.fn(),
          retry: {
            maxAttempts: 2,
            backoff: 'linear',
            initialDelay: 10,
          },
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPENSATED);
      expect(step1Invoke).toHaveBeenCalledTimes(2);
      expect(result.steps[0].status).toBe(SagaStepStatus.FAILED);
    });
  });

  describe('timeout handling', () => {
    it('should timeout step if it exceeds timeout', async () => {
      const slowStep = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve('done'), 200))
        );

      const steps: SagaStep<TestContext>[] = [
        {
          name: 'SlowStep',
          invoke: slowStep,
          compensate: jest.fn(),
          timeout: 50, // 50ms timeout
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      const result = await orchestrator.execute(context);

      expect(result.status).toBe(SagaStatus.COMPENSATED);
      expect(result.steps[0].status).toBe(SagaStepStatus.FAILED);
      expect(result.steps[0].error).toContain('Timeout');
    });
  });

  describe('step events', () => {
    it('should emit events for step lifecycle', async () => {
      const steps: SagaStep<TestContext>[] = [
        {
          name: 'TestStep',
          invoke: jest.fn().mockResolvedValue({ result: 'success' }),
          compensate: jest.fn(),
        },
      ];

      orchestrator = new SagaOrchestrator(
        'TestSaga',
        steps,
        mockRepository,
        mockEventEmitter
      );

      const context: TestContext = {
        orderId: 'order-1',
        userId: 'user-1',
        amount: 100,
      };

      await orchestrator.execute(context);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.step.started',
        expect.objectContaining({ stepName: 'TestStep' })
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'saga.step.completed',
        expect.objectContaining({
          stepName: 'TestStep',
          result: { result: 'success' },
        })
      );
    });
  });
});
