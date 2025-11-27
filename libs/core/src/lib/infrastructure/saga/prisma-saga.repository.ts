import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ISagaRepository,
  SagaExecution,
  SagaStatus,
  SagaStepStatus,
  SagaStepExecution,
} from './saga.interface';

interface SagaRecord {
  id: string;
  sagaType: string;
  status: string;
  context: unknown;
  steps: unknown[];
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
  metadata: unknown;
}

interface SagaPrismaClient {
  saga: {
    create: (args: {
      data: {
        id: string;
        sagaType: string;
        status: string;
        context: object;
        steps: object[];
        startedAt: Date;
        completedAt?: Date;
        error?: string;
        metadata: object;
      };
    }) => Promise<SagaRecord>;
    findUnique: (args: {
      where: { id: string };
    }) => Promise<SagaRecord | null>;
    findMany: (args: {
      where: { status: string };
      take: number;
      orderBy: { startedAt: 'asc' | 'desc' };
    }) => Promise<SagaRecord[]>;
    update: (args: {
      where: { id: string };
      data: {
        status?: string;
        completedAt?: Date;
        steps?: object[];
      };
    }) => Promise<SagaRecord>;
    delete: (args: { where: { id: string } }) => Promise<SagaRecord>;
    deleteMany: (args: {
      where: {
        AND: Array<{
          OR?: Array<{ status: string }>;
          completedAt?: { lt: Date };
        }>;
      };
    }) => Promise<{ count: number }>;
  };
}

export const SAGA_PRISMA_CLIENT = Symbol('SAGA_PRISMA_CLIENT');

@Injectable()
export class PrismaSagaRepository implements ISagaRepository {
  private readonly logger = new Logger(PrismaSagaRepository.name);

  constructor(
    @Inject(SAGA_PRISMA_CLIENT)
    private readonly prisma: SagaPrismaClient
  ) {}

  async save(execution: SagaExecution): Promise<void> {
    try {
      await this.prisma.saga.create({
        data: {
          id: execution.sagaId,
          sagaType: execution.sagaType,
          status: execution.status,
          context: execution.context as object,
          steps: execution.steps as object[],
          startedAt: execution.startedAt,
          completedAt: execution.completedAt,
          error: execution.error,
          metadata: (execution.metadata as object) ?? {},
        },
      });
    } catch (error) {
      this.logger.error(`Failed to save saga ${execution.sagaId}: ${error}`);
      throw error;
    }
  }

  async findById(sagaId: string): Promise<SagaExecution | null> {
    try {
      const saga = await this.prisma.saga.findUnique({
        where: { id: sagaId },
      });

      if (!saga) {
        return null;
      }

      return {
        sagaId: saga.id,
        sagaType: saga.sagaType,
        status: saga.status as SagaStatus,
        context: saga.context,
        steps:
          saga.steps as unknown as SagaStepExecution[],
        startedAt: saga.startedAt,
        completedAt: saga.completedAt ?? undefined,
        error: saga.error ?? undefined,
        metadata: saga.metadata as Record<string, unknown>,
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
    try {
      const sagas = await this.prisma.saga.findMany({
        where: { status },
        take: limit,
        orderBy: { startedAt: 'desc' },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return sagas.map((saga: any) => ({
        sagaId: saga.id,
        sagaType: saga.sagaType,
        status: saga.status as SagaStatus,
        context: saga.context,
        steps:
          saga.steps as unknown as SagaStepExecution[],
        startedAt: saga.startedAt,
        completedAt: saga.completedAt ?? undefined,
        error: saga.error ?? undefined,
        metadata: saga.metadata as Record<string, unknown>,
      }));
    } catch (error) {
      this.logger.error(`Failed to find sagas by status ${status}: ${error}`);
      throw error;
    }
  }

  async updateStatus(sagaId: string, status: SagaStatus): Promise<void> {
    try {
      await this.prisma.saga.update({
        where: { id: sagaId },
        data: {
          status,
          completedAt:
            status === SagaStatus.COMPLETED ||
            status === SagaStatus.COMPENSATED ||
            status === SagaStatus.COMPENSATION_FAILED
              ? new Date()
              : undefined,
        },
      });
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
      const saga = await this.prisma.saga.findUnique({
        where: { id: sagaId },
      });

      if (!saga) {
        throw new Error(`Saga ${sagaId} not found`);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const steps = (saga.steps as any[]) || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stepIndex = steps.findIndex((s: any) => s.stepName === stepName);

      if (stepIndex === -1) {
        steps.push({
          stepName,
          status,
          startedAt: new Date(),
          completedAt:
            status === SagaStepStatus.COMPLETED ||
            status === SagaStepStatus.FAILED ||
            status === SagaStepStatus.COMPENSATED
              ? new Date()
              : undefined,
          result,
          error,
          attempt: 1,
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const existingStep = steps[stepIndex] as any;
        steps[stepIndex] = {
          ...existingStep,
          status,
          completedAt:
            status === SagaStepStatus.COMPLETED ||
            status === SagaStepStatus.FAILED ||
            status === SagaStepStatus.COMPENSATED
              ? new Date()
              : undefined,
          result,
          error,
        };
      }

      await this.prisma.saga.update({
        where: { id: sagaId },
        data: { steps: steps as object[] },
      });
    } catch (error) {
      this.logger.error(
        `Failed to update step ${stepName} in saga ${sagaId}: ${error}`
      );
      throw error;
    }
  }

  async delete(sagaId: string): Promise<void> {
    try {
      await this.prisma.saga.delete({
        where: { id: sagaId },
      });
    } catch (error) {
      this.logger.error(`Failed to delete saga ${sagaId}: ${error}`);
      throw error;
    }
  }

  async cleanup(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const result = await this.prisma.saga.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { status: SagaStatus.COMPLETED },
                { status: SagaStatus.COMPENSATED },
              ],
            },
            {
              completedAt: {
                lt: cutoffDate,
              },
            },
          ],
        },
      });

      this.logger.log(`Cleaned up ${result.count} old saga executions`);
      return result.count;
    } catch (error) {
      this.logger.error(`Failed to cleanup sagas: ${error}`);
      throw error;
    }
  }
}
