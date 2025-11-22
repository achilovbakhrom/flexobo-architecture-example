/**
 * Outbox message status lifecycle
 */
export enum OutboxMessageStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

/**
 * Outbox message entity representing an event to be published
 * to the message broker. This implements the Transactional Outbox pattern
 * to ensure reliable event publishing.
 *
 * The pattern works as follows:
 * 1. Events are saved to the outbox table in the same transaction as domain changes
 * 2. A background worker polls for pending messages
 * 3. Worker publishes messages to the broker and marks them as published
 * 4. If publishing fails, messages are retried with exponential backoff
 */
export interface OutboxMessage {
  /**
   * Unique identifier for the message
   */
  id: string;

  /**
   * Aggregate ID this event belongs to
   */
  aggregateId: string;

  /**
   * Type of aggregate (e.g., 'Truck', 'Load', 'User')
   */
  aggregateType: string;

  /**
   * Type of event (e.g., 'TruckCreated', 'LoadAssigned')
   */
  eventType: string;

  /**
   * Event payload as JSON
   */
  payload: Record<string, unknown>;

  /**
   * Current status of the message
   */
  status: OutboxMessageStatus;

  /**
   * Number of times publishing has been attempted
   */
  retryCount: number;

  /**
   * Maximum number of retry attempts before marking as failed
   */
  maxRetries: number;

  /**
   * Timestamp when the message was created
   */
  createdAt: Date;

  /**
   * Timestamp when the message was last processed
   */
  processedAt?: Date;

  /**
   * Timestamp when the message was successfully published
   */
  publishedAt?: Date;

  /**
   * Error message if publishing failed
   */
  error?: string;

  /**
   * Tenant/company ID for multi-tenancy support
   */
  companyId?: string;

  /**
   * Optional metadata for routing, headers, etc.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Interface for outbox repository operations
 */
export interface IOutboxRepository {
  /**
   * Save a new outbox message in the same transaction as domain changes
   */
  save(
    message: Omit<
      OutboxMessage,
      'id' | 'createdAt' | 'processedAt' | 'publishedAt' | 'error'
    >
  ): Promise<OutboxMessage>;

  /**
   * Find pending messages ready to be published
   * Uses FOR UPDATE SKIP LOCKED to prevent concurrent processing
   */
  findPendingMessages(batchSize: number): Promise<OutboxMessage[]>;

  /**
   * Mark a message as processing to prevent other workers from picking it up
   */
  markAsProcessing(id: string): Promise<void>;

  /**
   * Mark a message as successfully published
   */
  markAsPublished(id: string): Promise<void>;

  /**
   * Mark a message as failed and increment retry count
   */
  markAsFailed(id: string, error: string): Promise<void>;

  /**
   * Get messages by status for monitoring
   */
  findByStatus(
    status: OutboxMessageStatus,
    limit?: number
  ): Promise<OutboxMessage[]>;

  /**
   * Delete old published messages (cleanup)
   */
  deletePublished(olderThan: Date): Promise<number>;

  /**
   * Get retry-eligible failed messages (exponential backoff)
   */
  findRetryableMessages(batchSize: number): Promise<OutboxMessage[]>;
}
