/**
 * Two-Phase Commit (2PC) Protocol Interfaces
 *
 * Provides ACID transaction guarantees across distributed services.
 *
 * Phase 1 (Prepare): All participants vote to commit or abort
 * Phase 2 (Commit/Abort): If all voted commit, coordinator tells all to commit
 *                         If any voted abort, coordinator tells all to abort
 *
 * WARNING: 2PC is blocking and can cause availability issues if coordinator fails.
 * Consider using saga patterns for better availability and fault tolerance.
 * Use 2PC only when strong consistency is absolutely required.
 */

/**
 * Transaction states in 2PC protocol
 */
export enum TransactionState {
  /** Initial state, preparing to start */
  INIT = 'INIT',
  /** Prepare phase in progress */
  PREPARING = 'PREPARING',
  /** All participants ready to commit */
  PREPARED = 'PREPARED',
  /** Commit phase in progress */
  COMMITTING = 'COMMITTING',
  /** Transaction committed successfully */
  COMMITTED = 'COMMITTED',
  /** Abort phase in progress */
  ABORTING = 'ABORTING',
  /** Transaction aborted */
  ABORTED = 'ABORTED',
  /** Transaction timed out */
  TIMEOUT = 'TIMEOUT',
}

/**
 * Participant vote in prepare phase
 */
export enum ParticipantVote {
  /** Ready to commit */
  COMMIT = 'COMMIT',
  /** Cannot commit, must abort */
  ABORT = 'ABORT',
  /** Still preparing, no vote yet */
  PREPARING = 'PREPARING',
}

/**
 * Participant state in transaction
 */
export interface ParticipantState {
  participantId: string;
  vote: ParticipantVote;
  preparedAt?: Date;
  committedAt?: Date;
  abortedAt?: Date;
  error?: string;
}

/**
 * Two-phase commit transaction
 */
export interface TwoPhaseTransaction<TContext = unknown> {
  transactionId: string;
  state: TransactionState;
  context: TContext;
  participants: ParticipantState[];
  coordinatorId: string;
  startedAt: Date;
  preparedAt?: Date;
  decidedAt?: Date;
  completedAt?: Date;
  timeout: number; // milliseconds
  metadata?: Record<string, unknown>;
}

/**
 * Participant interface for 2PC protocol
 */
export interface ITwoPhaseParticipant<TContext = unknown> {
  /**
   * Unique identifier for this participant
   */
  readonly participantId: string;

  /**
   * Prepare phase: Check if can commit and lock resources
   * Returns true if ready to commit, false to abort
   */
  prepare(transactionId: string, context: TContext): Promise<boolean>;

  /**
   * Commit phase: Apply changes permanently
   */
  commit(transactionId: string, context: TContext): Promise<void>;

  /**
   * Abort phase: Rollback any prepared changes
   */
  abort(transactionId: string, context: TContext): Promise<void>;

  /**
   * Query participant state for transaction
   */
  getState?(transactionId: string): Promise<ParticipantVote>;
}

/**
 * Coordinator interface for 2PC protocol
 */
export interface ITwoPhaseCoordinator<TContext = unknown> {
  /**
   * Start a new two-phase commit transaction
   */
  begin(
    participants: ITwoPhaseParticipant<TContext>[],
    context: TContext,
    options?: {
      timeout?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<TwoPhaseTransaction<TContext>>;

  /**
   * Execute prepare phase: ask all participants to prepare
   */
  prepare(transactionId: string): Promise<boolean>;

  /**
   * Execute commit phase: tell all participants to commit
   */
  commit(transactionId: string): Promise<void>;

  /**
   * Execute abort phase: tell all participants to abort
   */
  abort(transactionId: string): Promise<void>;

  /**
   * Get transaction state
   */
  getTransaction(
    transactionId: string
  ): Promise<TwoPhaseTransaction<TContext> | null>;

  /**
   * Recover stuck transactions (coordinator failure recovery)
   */
  recoverTransactions(): Promise<void>;
}

/**
 * Repository for persisting 2PC transaction state
 */
export interface ITwoPhaseRepository {
  /**
   * Save transaction state
   */
  save(transaction: TwoPhaseTransaction): Promise<void>;

  /**
   * Update transaction state
   */
  updateState(transactionId: string, state: TransactionState): Promise<void>;

  /**
   * Update participant vote
   */
  updateParticipantVote(
    transactionId: string,
    participantId: string,
    vote: ParticipantVote,
    error?: string
  ): Promise<void>;

  /**
   * Find transaction by ID
   */
  findById(transactionId: string): Promise<TwoPhaseTransaction | null>;

  /**
   * Find transactions in specific state
   */
  findByState(
    state: TransactionState,
    limit?: number
  ): Promise<TwoPhaseTransaction[]>;

  /**
   * Find timed out transactions
   */
  findTimedOut(): Promise<TwoPhaseTransaction[]>;

  /**
   * Delete transaction
   */
  delete(transactionId: string): Promise<void>;

  /**
   * Clean up old transactions
   */
  cleanup(olderThanDays?: number): Promise<number>;
}

/**
 * Two-phase commit error types
 */
export class TwoPhaseCommitError extends Error {
  constructor(
    message: string,
    public readonly transactionId: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'TwoPhaseCommitError';
  }
}

export class PrepareFailedError extends TwoPhaseCommitError {
  constructor(transactionId: string, participantId: string, reason?: string) {
    super(
      `Prepare failed for participant ${participantId}: ${reason || 'unknown'}`,
      transactionId,
      'PREPARE_FAILED'
    );
    this.name = 'PrepareFailedError';
  }
}

export class CommitFailedError extends TwoPhaseCommitError {
  constructor(transactionId: string, participantId: string, reason?: string) {
    super(
      `Commit failed for participant ${participantId}: ${reason || 'unknown'}`,
      transactionId,
      'COMMIT_FAILED'
    );
    this.name = 'CommitFailedError';
  }
}

export class AbortFailedError extends TwoPhaseCommitError {
  constructor(transactionId: string, participantId: string, reason?: string) {
    super(
      `Abort failed for participant ${participantId}: ${reason || 'unknown'}`,
      transactionId,
      'ABORT_FAILED'
    );
    this.name = 'AbortFailedError';
  }
}

export class TransactionTimeoutError extends TwoPhaseCommitError {
  constructor(transactionId: string) {
    super(
      `Transaction ${transactionId} timed out`,
      transactionId,
      'TRANSACTION_TIMEOUT'
    );
    this.name = 'TransactionTimeoutError';
  }
}
