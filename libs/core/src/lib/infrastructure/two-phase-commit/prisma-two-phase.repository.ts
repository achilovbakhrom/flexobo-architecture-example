import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  ITwoPhaseRepository,
  TwoPhaseTransaction,
  TransactionState,
  ParticipantVote,
} from './two-phase-commit.interface';

// Infer the TwoPhaseCommit type from Prisma's return type
type PrismaTwoPhaseCommit = Awaited<
  ReturnType<PrismaClient['twoPhaseCommit']['findUnique']>
>;

/**
 * Prisma-based implementation of two-phase commit repository
 */
@Injectable()
export class PrismaTwoPhaseRepository implements ITwoPhaseRepository {
  private readonly logger = new Logger(PrismaTwoPhaseRepository.name);

  constructor(private readonly prisma: PrismaClient) {}

  async save(transaction: TwoPhaseTransaction): Promise<void> {
    await this.prisma.twoPhaseCommit.create({
      data: {
        transactionId: transaction.transactionId,
        state: transaction.state,
        context: transaction.context as never,
        participants: transaction.participants as never,
        coordinatorId: transaction.coordinatorId,
        startedAt: transaction.startedAt,
        preparedAt: transaction.preparedAt,
        decidedAt: transaction.decidedAt,
        completedAt: transaction.completedAt,
        timeout: transaction.timeout,
        metadata: transaction.metadata as never,
      },
    });

    this.logger.debug(`Saved 2PC transaction ${transaction.transactionId}`);
  }

  async updateState(
    transactionId: string,
    state: TransactionState
  ): Promise<void> {
    const updateData: {
      state: string;
      preparedAt?: Date;
      decidedAt?: Date;
      completedAt?: Date;
    } = { state };

    // Set timestamps based on state
    if (state === TransactionState.PREPARED) {
      updateData.preparedAt = new Date();
    } else if (
      state === TransactionState.COMMITTED ||
      state === TransactionState.ABORTED
    ) {
      updateData.decidedAt = new Date();
      updateData.completedAt = new Date();
    }

    await this.prisma.twoPhaseCommit.update({
      where: { transactionId },
      data: updateData,
    });

    this.logger.debug(`Updated transaction ${transactionId} state to ${state}`);
  }

  async updateParticipantVote(
    transactionId: string,
    participantId: string,
    vote: ParticipantVote,
    error?: string
  ): Promise<void> {
    const transaction = await this.prisma.twoPhaseCommit.findUnique({
      where: { transactionId },
    });

    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const participants = transaction.participants as any[];
    const participantIndex = participants.findIndex(
      (p) => p.participantId === participantId
    );

    if (participantIndex === -1) {
      throw new Error(
        `Participant ${participantId} not found in transaction ${transactionId}`
      );
    }

    // Update participant vote
    participants[participantIndex] = {
      ...participants[participantIndex],
      vote,
      ...(error && { error }),
      ...(vote === ParticipantVote.COMMIT && { preparedAt: new Date() }),
    };

    await this.prisma.twoPhaseCommit.update({
      where: { transactionId },
      data: { participants: participants as never },
    });

    this.logger.debug(
      `Updated participant ${participantId} vote to ${vote} in transaction ${transactionId}`
    );
  }

  async findById(transactionId: string): Promise<TwoPhaseTransaction | null> {
    const transaction = await this.prisma.twoPhaseCommit.findUnique({
      where: { transactionId },
    });

    return transaction ? this.toDomain(transaction) : null;
  }

  async findByState(
    state: TransactionState,
    limit = 100
  ): Promise<TwoPhaseTransaction[]> {
    const transactions = await this.prisma.twoPhaseCommit.findMany({
      where: { state },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transactions.map((t: any) => this.toDomain(t));
  }

  async findTimedOut(): Promise<TwoPhaseTransaction[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transactions = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM two_phase_commits
      WHERE state IN ('PREPARING', 'PREPARED', 'COMMITTING', 'ABORTING')
        AND (EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000) > timeout
      ORDER BY started_at ASC
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return transactions.map((t: any) =>
      this.toDomain(t as NonNullable<PrismaTwoPhaseCommit>)
    );
  }

  async delete(transactionId: string): Promise<void> {
    await this.prisma.twoPhaseCommit.delete({
      where: { transactionId },
    });

    this.logger.debug(`Deleted transaction ${transactionId}`);
  }

  async cleanup(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.twoPhaseCommit.deleteMany({
      where: {
        state: {
          in: [TransactionState.COMMITTED, TransactionState.ABORTED],
        },
        completedAt: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Cleaned up ${result.count} 2PC transactions older than ${olderThanDays} days`
    );

    return result.count;
  }

  /**
   * Convert Prisma entity to domain model
   */
  private toDomain(
    prismaTransaction: NonNullable<PrismaTwoPhaseCommit>
  ): TwoPhaseTransaction {
    return {
      transactionId: prismaTransaction.transactionId,
      state: prismaTransaction.state as TransactionState,
      context: prismaTransaction.context,
      participants: prismaTransaction.participants as never,
      coordinatorId: prismaTransaction.coordinatorId,
      startedAt: prismaTransaction.startedAt,
      preparedAt: prismaTransaction.preparedAt || undefined,
      decidedAt: prismaTransaction.decidedAt || undefined,
      completedAt: prismaTransaction.completedAt || undefined,
      timeout: prismaTransaction.timeout,
      metadata:
        (prismaTransaction.metadata as Record<string, unknown>) || undefined,
    };
  }
}
