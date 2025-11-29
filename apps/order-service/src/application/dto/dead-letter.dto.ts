/**
 * Dead Letter DTOs
 *
 * Dead Letter is a record of messages that could not be processed.
 * Used for debugging, auditing, and manual reprocessing.
 */

export interface DeadLetterDto {
  id: string;
  routingKey: string;
  exchange: string;
  payload: Record<string, unknown>;
  error?: string | null;
  retryCount: number;
  originalTimestamp?: Date | null;
  receivedAt: Date;
  metadata?: Record<string, unknown> | null;
}

export interface CreateDeadLetterDto {
  routingKey: string;
  exchange: string;
  payload: Record<string, unknown>;
  error?: string;
  retryCount?: number;
  originalTimestamp?: Date;
  metadata?: Record<string, unknown>;
}

export interface DeadLetterQueryDto {
  routingKey?: string;
  exchange?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}
