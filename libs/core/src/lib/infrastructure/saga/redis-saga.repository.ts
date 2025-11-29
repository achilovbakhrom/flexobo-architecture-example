/**
 * Redis Saga Repository
 *
 * Redis-based implementation of ISagaRepository for choreography-based sagas.
 * Provides fast, distributed saga state storage with TTL-based cleanup.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_SERVICE } from '../cache/cache.module';
import { RedisCache } from '../cache/redis-cache';
import {
  ISagaRepository,
  SagaExecution,
  SagaStatus,
  SagaStepStatus,
  SagaStepExecution,
} from './saga.interface';

const SAGA_KEY_PREFIX = 'saga:';
const SAGA_INDEX_KEY = 'saga:active';
const DEFAULT_TTL_SECONDS = 86400 * 7; // 7 days

export const REDIS_SAGA_REPOSITORY = Symbol('RedisSagaRepository');

@Injectable()
export class RedisSagaRepository implements ISagaRepository {
  private readonly logger = new Logger(RedisSagaRepository.name);

  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cache: RedisCache
  ) {}

  private buildKey(sagaId: string): string {
    return `${SAGA_KEY_PREFIX}${sagaId}`;
  }

  async save(execution: SagaExecution): Promise<void> {
    const key = this.buildKey(execution.sagaId);

    try {
      await this.cache.set(key, execution, DEFAULT_TTL_SECONDS);

      // Add to active sagas index
      const client = this.cache.getClient();
      await client.sadd(SAGA_INDEX_KEY, execution.sagaId);

      this.logger.debug(`[REDIS SAGA] Saved saga ${execution.sagaId}`);
    } catch (error) {
      this.logger.error(`Failed to save saga ${execution.sagaId}: ${error}`);
      throw error;
    }
  }

  async findById(sagaId: string): Promise<SagaExecution | null> {
    const key = this.buildKey(sagaId);

    try {
      const data = await this.cache.get<SagaExecution>(key);

      if (!data) {
        return null;
      }

      // Restore Date objects from JSON
      return {
        ...data,
        startedAt: new Date(data.startedAt),
        completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
        steps: data.steps.map((step) => ({
          ...step,
          startedAt: new Date(step.startedAt),
          completedAt: step.completedAt
            ? new Date(step.completedAt)
            : undefined,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to find saga ${sagaId}: ${error}`);
      throw error;
    }
  }

  async findByStatus(
    status: SagaStatus,
    limit = 100
  ): Promise<SagaExecution[]> {
    const client = this.cache.getClient();

    try {
      const sagaIds = await client.smembers(SAGA_INDEX_KEY);
      const executions: SagaExecution[] = [];

      for (const sagaId of sagaIds) {
        if (executions.length >= limit) break;

        const execution = await this.findById(sagaId);
        if (execution && execution.status === status) {
          executions.push(execution);
        }
      }

      return executions;
    } catch (error) {
      this.logger.error(`Failed to find sagas by status ${status}: ${error}`);
      throw error;
    }
  }

  async findAll(limit = 100): Promise<SagaExecution[]> {
    const client = this.cache.getClient();

    try {
      const sagaIds = await client.smembers(SAGA_INDEX_KEY);
      const executions: SagaExecution[] = [];

      for (const sagaId of sagaIds) {
        if (executions.length >= limit) break;

        const execution = await this.findById(sagaId);
        if (execution) {
          executions.push(execution);
        } else {
          // Clean up stale index entry
          await client.srem(SAGA_INDEX_KEY, sagaId);
        }
      }

      return executions;
    } catch (error) {
      this.logger.error(`Failed to find all sagas: ${error}`);
      throw error;
    }
  }

  async updateStatus(sagaId: string, status: SagaStatus): Promise<void> {
    try {
      const execution = await this.findById(sagaId);

      if (!execution) {
        throw new Error(`Saga ${sagaId} not found`);
      }

      execution.status = status;

      if (
        status === SagaStatus.COMPLETED ||
        status === SagaStatus.COMPENSATED ||
        status === SagaStatus.COMPENSATION_FAILED
      ) {
        execution.completedAt = new Date();
      }

      await this.save(execution);
    } catch (error) {
      this.logger.error(
        `Failed to update saga ${sagaId} status to ${status}: ${error}`
      );
      throw error;
    }
  }

  async updateStepStatus(
    sagaId: string,
    stepName: string,
    status: SagaStepStatus,
    result?: unknown,
    error?: string
  ): Promise<void> {
    try {
      const execution = await this.findById(sagaId);

      if (!execution) {
        throw new Error(`Saga ${sagaId} not found`);
      }

      const stepIndex = execution.steps.findIndex(
        (s) => s.stepName === stepName
      );

      const isCompleted =
        status === SagaStepStatus.COMPLETED ||
        status === SagaStepStatus.FAILED ||
        status === SagaStepStatus.COMPENSATED;

      const stepData: SagaStepExecution = {
        stepName,
        status,
        startedAt:
          stepIndex >= 0 ? execution.steps[stepIndex].startedAt : new Date(),
        completedAt: isCompleted ? new Date() : undefined,
        result,
        error,
        attempt: stepIndex >= 0 ? execution.steps[stepIndex].attempt + 1 : 1,
      };

      if (stepIndex === -1) {
        execution.steps.push(stepData);
      } else {
        execution.steps[stepIndex] = stepData;
      }

      await this.save(execution);
    } catch (error) {
      this.logger.error(
        `Failed to update step ${stepName} in saga ${sagaId}: ${error}`
      );
      throw error;
    }
  }

  async delete(sagaId: string): Promise<void> {
    const key = this.buildKey(sagaId);
    const client = this.cache.getClient();

    try {
      await this.cache.del(key);
      await client.srem(SAGA_INDEX_KEY, sagaId);

      this.logger.debug(`[REDIS SAGA] Deleted saga ${sagaId}`);
    } catch (error) {
      this.logger.error(`Failed to delete saga ${sagaId}: ${error}`);
      throw error;
    }
  }

  async setTtl(sagaId: string, ttlSeconds: number): Promise<void> {
    const key = this.buildKey(sagaId);

    try {
      await this.cache.expire(key, ttlSeconds);
    } catch (error) {
      this.logger.error(`Failed to set TTL for saga ${sagaId}: ${error}`);
      throw error;
    }
  }

  async exists(sagaId: string): Promise<boolean> {
    const key = this.buildKey(sagaId);
    return await this.cache.exists(key);
  }
}
