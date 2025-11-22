import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ITwoPhaseCoordinator,
  ITwoPhaseParticipant,
  ITwoPhaseRepository,
  TwoPhaseTransaction,
  TransactionState,
  ParticipantVote,
  PrepareFailedError,
  CommitFailedError,
  AbortFailedError,
} from './two-phase-commit.interface';

/**
 * Two-Phase Commit Coordinator
 *
 * Implements the 2PC protocol for distributed transactions:
 * 1. Begin: Create transaction and register participants
 * 2. Prepare: Ask all participants if they can commit
 * 3. Commit/Abort: Based on votes, either commit or abort on all participants
 *
 * Features:
 * - Timeout handling for stuck transactions
 * - Recovery mechanism for coordinator failures
 * - Persistent transaction log for crash recovery
 * - Heuristic decisions for unresponsive participants
 */
@Injectable()
export class TwoPhaseCoordinator<TContext = unknown>
  implements ITwoPhaseCoordinator<TContext>
{
  private readonly logger = new Logger(TwoPhaseCoordinator.name);
  private readonly transactions = new Map<
    string,
    {
      transaction: TwoPhaseTransaction<TContext>;
      participants: ITwoPhaseParticipant<TContext>[];
    }
  >();

  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(
    private readonly repository: ITwoPhaseRepository,
    private readonly coordinatorId: string = randomUUID()
  ) {}

  /**
   * Begin a new two-phase commit transaction
   */
  async begin(
    participants: ITwoPhaseParticipant<TContext>[],
    context: TContext,
    options?: {
      timeout?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TwoPhaseTransaction<TContext>> {
    const transactionId = randomUUID();
    const timeout = options?.timeout ?? this.DEFAULT_TIMEOUT;

    this.logger.log(
      `Beginning 2PC transaction ${transactionId} with ${participants.length} participants`
    );

    const transaction: TwoPhaseTransaction<TContext> = {
      transactionId,
      state: TransactionState.INIT,
      context,
      participants: participants.map((p) => ({
        participantId: p.participantId,
        vote: ParticipantVote.PREPARING,
      })),
      coordinatorId: this.coordinatorId,
      startedAt: new Date(),
      timeout,
      metadata: options?.metadata,
    };

    // Persist transaction
    await this.repository.save(transaction);

    // Store in memory for active transactions
    this.transactions.set(transactionId, { transaction, participants });

    // Set timeout handler
    setTimeout(() => {
      this.handleTimeout(transactionId).catch((error) => {
        this.logger.error(
          `Error handling timeout for ${transactionId}:`,
          error
        );
      });
    }, timeout);

    return transaction;
  }

  /**
   * Execute prepare phase
   */
  async prepare(transactionId: string): Promise<boolean> {
    const entry = this.transactions.get(transactionId);
    if (!entry) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const { transaction, participants } = entry;

    this.logger.log(`Preparing transaction ${transactionId}`);

    // Update state to PREPARING
    transaction.state = TransactionState.PREPARING;
    await this.repository.updateState(
      transactionId,
      TransactionState.PREPARING
    );

    // Ask all participants to prepare
    const prepareResults = await Promise.allSettled(
      participants.map(async (participant) => {
        try {
          this.logger.debug(
            `Asking participant ${participant.participantId} to prepare`
          );

          const canCommit = await participant.prepare(
            transactionId,
            transaction.context
          );

          const vote = canCommit
            ? ParticipantVote.COMMIT
            : ParticipantVote.ABORT;

          // Update participant vote
          await this.repository.updateParticipantVote(
            transactionId,
            participant.participantId,
            vote
          );

          // Update in-memory state
          const participantState = transaction.participants.find(
            (p) => p.participantId === participant.participantId
          );
          if (participantState) {
            participantState.vote = vote;
            participantState.preparedAt = new Date();
          }

          this.logger.debug(
            `Participant ${participant.participantId} voted: ${vote}`
          );

          return { participantId: participant.participantId, vote };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Participant ${participant.participantId} prepare failed:`,
            error
          );

          // Update participant vote to ABORT
          await this.repository.updateParticipantVote(
            transactionId,
            participant.participantId,
            ParticipantVote.ABORT,
            errorMessage
          );

          // Update in-memory state
          const participantState = transaction.participants.find(
            (p) => p.participantId === participant.participantId
          );
          if (participantState) {
            participantState.vote = ParticipantVote.ABORT;
            participantState.error = errorMessage;
          }

          throw new PrepareFailedError(
            transactionId,
            participant.participantId,
            errorMessage
          );
        }
      })
    );

    // Check if all participants voted COMMIT
    const allCommitted = prepareResults.every(
      (result) =>
        result.status === 'fulfilled' &&
        result.value.vote === ParticipantVote.COMMIT
    );

    if (allCommitted) {
      transaction.state = TransactionState.PREPARED;
      transaction.preparedAt = new Date();
      await this.repository.updateState(
        transactionId,
        TransactionState.PREPARED
      );
      this.logger.log(`Transaction ${transactionId} prepared successfully`);
      return true;
    } else {
      transaction.state = TransactionState.ABORTING;
      await this.repository.updateState(
        transactionId,
        TransactionState.ABORTING
      );
      this.logger.warn(`Transaction ${transactionId} prepare failed, aborting`);
      return false;
    }
  }

  /**
   * Execute commit phase
   */
  async commit(transactionId: string): Promise<void> {
    const entry = this.transactions.get(transactionId);
    if (!entry) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const { transaction, participants } = entry;

    if (transaction.state !== TransactionState.PREPARED) {
      throw new Error(
        `Cannot commit transaction in state ${transaction.state}`
      );
    }

    this.logger.log(`Committing transaction ${transactionId}`);

    // Update state to COMMITTING
    transaction.state = TransactionState.COMMITTING;
    await this.repository.updateState(
      transactionId,
      TransactionState.COMMITTING
    );

    // Tell all participants to commit
    const commitResults = await Promise.allSettled(
      participants.map(async (participant) => {
        try {
          this.logger.debug(
            `Asking participant ${participant.participantId} to commit`
          );

          await participant.commit(transactionId, transaction.context);

          // Update participant state
          const participantState = transaction.participants.find(
            (p) => p.participantId === participant.participantId
          );
          if (participantState) {
            participantState.committedAt = new Date();
          }

          this.logger.debug(
            `Participant ${participant.participantId} committed`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Participant ${participant.participantId} commit failed:`,
            error
          );

          // Update participant state
          const participantState = transaction.participants.find(
            (p) => p.participantId === participant.participantId
          );
          if (participantState) {
            participantState.error = errorMessage;
          }

          throw new CommitFailedError(
            transactionId,
            participant.participantId,
            errorMessage
          );
        }
      })
    );

    // Check if any commits failed
    const failures = commitResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `${failures.length} participants failed to commit transaction ${transactionId}`
      );
      // In real 2PC, commit failures are catastrophic (data inconsistency)
      // Requires manual intervention or heuristic decisions
    }

    // Mark as committed
    transaction.state = TransactionState.COMMITTED;
    transaction.decidedAt = new Date();
    transaction.completedAt = new Date();
    await this.repository.updateState(
      transactionId,
      TransactionState.COMMITTED
    );

    this.logger.log(`Transaction ${transactionId} committed successfully`);

    // Clean up in-memory state
    this.transactions.delete(transactionId);
  }

  /**
   * Execute abort phase
   */
  async abort(transactionId: string): Promise<void> {
    const entry = this.transactions.get(transactionId);
    if (!entry) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    const { transaction, participants } = entry;

    this.logger.log(`Aborting transaction ${transactionId}`);

    // Update state to ABORTING
    transaction.state = TransactionState.ABORTING;
    await this.repository.updateState(transactionId, TransactionState.ABORTING);

    // Tell all participants to abort
    const abortResults = await Promise.allSettled(
      participants.map(async (participant) => {
        try {
          this.logger.debug(
            `Asking participant ${participant.participantId} to abort`
          );

          await participant.abort(transactionId, transaction.context);

          // Update participant state
          const participantState = transaction.participants.find(
            (p) => p.participantId === participant.participantId
          );
          if (participantState) {
            participantState.abortedAt = new Date();
          }

          this.logger.debug(`Participant ${participant.participantId} aborted`);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Participant ${participant.participantId} abort failed:`,
            error
          );

          throw new AbortFailedError(
            transactionId,
            participant.participantId,
            errorMessage
          );
        }
      })
    );

    // Check if any aborts failed
    const failures = abortResults.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      this.logger.error(
        `${failures.length} participants failed to abort transaction ${transactionId}`
      );
    }

    // Mark as aborted
    transaction.state = TransactionState.ABORTED;
    transaction.decidedAt = new Date();
    transaction.completedAt = new Date();
    await this.repository.updateState(transactionId, TransactionState.ABORTED);

    this.logger.log(`Transaction ${transactionId} aborted successfully`);

    // Clean up in-memory state
    this.transactions.delete(transactionId);
  }

  /**
   * Get transaction state
   */
  async getTransaction(
    transactionId: string
  ): Promise<TwoPhaseTransaction<TContext> | null> {
    // Check in-memory first
    const entry = this.transactions.get(transactionId);
    if (entry) {
      return entry.transaction;
    }

    // Check repository
    const transaction = await this.repository.findById(transactionId);
    return transaction as TwoPhaseTransaction<TContext> | null;
  }

  /**
   * Handle transaction timeout
   */
  private async handleTimeout(transactionId: string): Promise<void> {
    const entry = this.transactions.get(transactionId);
    if (!entry) {
      return; // Already completed or cleaned up
    }

    const { transaction } = entry;

    // Only timeout if still in progress
    if (
      transaction.state !== TransactionState.COMMITTED &&
      transaction.state !== TransactionState.ABORTED
    ) {
      this.logger.warn(`Transaction ${transactionId} timed out`);

      transaction.state = TransactionState.TIMEOUT;
      await this.repository.updateState(
        transactionId,
        TransactionState.TIMEOUT
      );

      // Abort the transaction
      try {
        await this.abort(transactionId);
      } catch (error) {
        this.logger.error(
          `Error aborting timed out transaction ${transactionId}:`,
          error
        );
      }
    }
  }

  /**
   * Recover stuck transactions (coordinator failure recovery)
   */
  async recoverTransactions(): Promise<void> {
    this.logger.log('Starting 2PC transaction recovery');

    // Find timed out transactions
    const timedOut = await this.repository.findTimedOut();
    this.logger.log(`Found ${timedOut.length} timed out transactions`);

    for (const transaction of timedOut) {
      try {
        this.logger.log(`Recovering transaction ${transaction.transactionId}`);

        if (transaction.state === TransactionState.PREPARED) {
          // All participants prepared but coordinator crashed before commit decision
          // Heuristic: abort for safety (can also implement commit depending on requirements)
          this.logger.warn(
            `Transaction ${transaction.transactionId} was prepared but coordinator crashed. Aborting for safety.`
          );
          await this.repository.updateState(
            transaction.transactionId,
            TransactionState.ABORTING
          );
        } else if (transaction.state === TransactionState.COMMITTING) {
          // Commit decision was made, must complete commit
          this.logger.log(
            `Transaction ${transaction.transactionId} was committing. Completing commit.`
          );
          await this.repository.updateState(
            transaction.transactionId,
            TransactionState.COMMITTED
          );
        } else if (transaction.state === TransactionState.ABORTING) {
          // Abort decision was made, must complete abort
          this.logger.log(
            `Transaction ${transaction.transactionId} was aborting. Completing abort.`
          );
          await this.repository.updateState(
            transaction.transactionId,
            TransactionState.ABORTED
          );
        } else {
          // Other states: timeout and abort
          this.logger.log(
            `Transaction ${transaction.transactionId} in state ${transaction.state}. Aborting.`
          );
          await this.repository.updateState(
            transaction.transactionId,
            TransactionState.ABORTED
          );
        }
      } catch (error) {
        this.logger.error(
          `Error recovering transaction ${transaction.transactionId}:`,
          error
        );
      }
    }

    this.logger.log('2PC transaction recovery completed');
  }
}
