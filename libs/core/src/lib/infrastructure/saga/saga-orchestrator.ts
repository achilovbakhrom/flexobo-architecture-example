import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import {
  ISaga,
  ISagaRepository,
  SagaExecution,
  SagaStatus,
  SagaStep,
  SagaStepExecution,
  SagaStepStatus,
  SagaStartedEvent,
  SagaCompletedEvent,
  SagaFailedEvent,
  SagaCompensatedEvent,
  SagaStepStartedEvent,
  SagaStepCompletedEvent,
  SagaStepFailedEvent,
} from './saga.interface';

/**
 * Saga orchestrator for executing and managing sagas
 */
@Injectable()
export class SagaOrchestrator<TContext = unknown> implements ISaga<TContext> {
  private readonly logger = new Logger(SagaOrchestrator.name);

  constructor(
    public readonly type: string,
    public readonly steps: SagaStep<TContext>[],
    private readonly repository: ISagaRepository,
    private readonly eventEmitter: EventEmitter2
  ) {}

  /**
   * Execute the saga
   */
  async execute(context: TContext): Promise<SagaExecution<TContext>> {
    const sagaId = randomUUID();
    const execution: SagaExecution<TContext> = {
      sagaId,
      sagaType: this.type,
      status: SagaStatus.PENDING,
      context,
      steps: [],
      startedAt: new Date(),
    };

    try {
      await this.repository.save(execution);

      this.logger.log(`Starting saga ${this.type} with ID ${sagaId}`);
      await this.emitEvent('saga.started', {
        sagaId,
        sagaType: this.type,
        timestamp: new Date(),
      } as SagaStartedEvent);

      execution.status = SagaStatus.RUNNING;
      await this.repository.updateStatus(sagaId, SagaStatus.RUNNING);

      // Execute steps sequentially
      for (const step of this.steps) {
        const shouldExecute = await this.shouldExecuteStep(step, context);
        if (!shouldExecute) {
          this.logger.debug(`Skipping step ${step.name} for saga ${sagaId}`);
          execution.steps.push({
            stepName: step.name,
            status: SagaStepStatus.SKIPPED,
            startedAt: new Date(),
            completedAt: new Date(),
            attempt: 0,
          });
          continue;
        }

        const stepExecution = await this.executeStep(sagaId, step, context);
        execution.steps.push(stepExecution);

        if (stepExecution.status === SagaStepStatus.FAILED) {
          throw new Error(`Step ${step.name} failed: ${stepExecution.error}`);
        }
      }

      // All steps completed successfully
      execution.status = SagaStatus.COMPLETED;
      execution.completedAt = new Date();
      await this.repository.updateStatus(sagaId, SagaStatus.COMPLETED);

      this.logger.log(
        `Saga ${this.type} with ID ${sagaId} completed successfully`
      );
      await this.emitEvent('saga.completed', {
        sagaId,
        sagaType: this.type,
        timestamp: new Date(),
      } as SagaCompletedEvent);

      return execution;
    } catch (error) {
      this.logger.error(`Saga ${this.type} with ID ${sagaId} failed: ${error}`);
      execution.status = SagaStatus.FAILED;
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      await this.repository.updateStatus(sagaId, SagaStatus.FAILED);
      await this.emitEvent('saga.failed', {
        sagaId,
        sagaType: this.type,
        error: execution.error,
        timestamp: new Date(),
      } as SagaFailedEvent);

      // Compensate completed steps in reverse order
      await this.compensate(sagaId, execution);

      return execution;
    }
  }

  /**
   * Check if step should be executed
   */
  private async shouldExecuteStep(
    step: SagaStep<TContext>,
    context: TContext
  ): Promise<boolean> {
    if (!step.condition) {
      return true;
    }

    try {
      return await step.condition(context);
    } catch (error) {
      this.logger.warn(
        `Step condition check failed for ${step.name}: ${error}`
      );
      return false;
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStep(
    sagaId: string,
    step: SagaStep<TContext>,
    context: TContext
  ): Promise<SagaStepExecution> {
    const stepExecution: SagaStepExecution = {
      stepName: step.name,
      status: SagaStepStatus.RUNNING,
      startedAt: new Date(),
      attempt: 0,
    };

    this.logger.debug(`Executing step ${step.name} for saga ${sagaId}`);
    await this.emitEvent('saga.step.started', {
      sagaId,
      stepName: step.name,
      timestamp: new Date(),
    } as SagaStepStartedEvent);

    const maxAttempts = step.retry?.maxAttempts ?? 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      stepExecution.attempt = attempt;

      try {
        const result = await this.executeWithTimeout(
          () => step.invoke(context),
          step.timeout ?? 30000
        );

        stepExecution.status = SagaStepStatus.COMPLETED;
        stepExecution.result = result;
        stepExecution.completedAt = new Date();

        await this.repository.updateStepStatus(
          sagaId,
          step.name,
          SagaStepStatus.COMPLETED,
          result
        );

        this.logger.debug(`Step ${step.name} completed for saga ${sagaId}`);
        await this.emitEvent('saga.step.completed', {
          sagaId,
          stepName: step.name,
          result,
          timestamp: new Date(),
        } as SagaStepCompletedEvent);

        return stepExecution;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn(
          `Step ${step.name} failed (attempt ${attempt}/${maxAttempts}): ${lastError.message}`
        );

        if (attempt < maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, step.retry);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    stepExecution.status = SagaStepStatus.FAILED;
    stepExecution.error = lastError?.message ?? 'Unknown error';
    stepExecution.completedAt = new Date();

    await this.repository.updateStepStatus(
      sagaId,
      step.name,
      SagaStepStatus.FAILED,
      undefined,
      stepExecution.error
    );

    await this.emitEvent('saga.step.failed', {
      sagaId,
      stepName: step.name,
      error: stepExecution.error,
      timestamp: new Date(),
    } as SagaStepFailedEvent);

    return stepExecution;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Timeout after ${timeout}ms`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Calculate retry delay based on backoff strategy
   */
  private calculateRetryDelay(
    attempt: number,
    retry?: SagaStep['retry']
  ): number {
    const initialDelay = retry?.initialDelay ?? 1000;
    const backoff = retry?.backoff ?? 'exponential';

    if (backoff === 'linear') {
      return initialDelay * attempt;
    } else {
      return initialDelay * Math.pow(2, attempt - 1);
    }
  }

  /**
   * Compensate completed steps in reverse order
   */
  private async compensate(
    sagaId: string,
    execution: SagaExecution<TContext>
  ): Promise<void> {
    this.logger.log(`Starting compensation for saga ${sagaId}`);
    execution.status = SagaStatus.COMPENSATING;
    await this.repository.updateStatus(sagaId, SagaStatus.COMPENSATING);

    // Get completed steps in reverse order
    const completedSteps = execution.steps
      .filter((s) => s.status === SagaStepStatus.COMPLETED)
      .reverse();

    for (const stepExecution of completedSteps) {
      const step = this.steps.find((s) => s.name === stepExecution.stepName);
      if (!step) {
        this.logger.warn(
          `Step ${stepExecution.stepName} not found for compensation`
        );
        continue;
      }

      try {
        this.logger.debug(`Compensating step ${step.name} for saga ${sagaId}`);
        await this.repository.updateStepStatus(
          sagaId,
          step.name,
          SagaStepStatus.COMPENSATING
        );

        await step.compensate(execution.context, stepExecution.result);

        await this.repository.updateStepStatus(
          sagaId,
          step.name,
          SagaStepStatus.COMPENSATED
        );
        this.logger.debug(`Step ${step.name} compensated for saga ${sagaId}`);
      } catch (error) {
        this.logger.error(
          `Compensation failed for step ${step.name} in saga ${sagaId}: ${error}`
        );
        execution.status = SagaStatus.COMPENSATION_FAILED;
        await this.repository.updateStatus(
          sagaId,
          SagaStatus.COMPENSATION_FAILED
        );
        return;
      }
    }

    execution.status = SagaStatus.COMPENSATED;
    execution.completedAt = new Date();
    await this.repository.updateStatus(sagaId, SagaStatus.COMPENSATED);

    this.logger.log(`Saga ${sagaId} compensated successfully`);
    await this.emitEvent('saga.compensated', {
      sagaId,
      sagaType: this.type,
      timestamp: new Date(),
    } as SagaCompensatedEvent);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Emit event helper
   */
  private async emitEvent(eventName: string, payload: unknown): Promise<void> {
    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      this.logger.error(`Failed to emit event ${eventName}: ${error}`);
    }
  }
}
