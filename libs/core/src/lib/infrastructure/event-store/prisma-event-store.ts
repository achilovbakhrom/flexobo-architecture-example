import { Injectable, Inject } from '@nestjs/common';
import { IEventStore, StoredEvent } from './event-store.interface';
import { DomainEvent, ConcurrencyException } from '../../domain';

interface EventStorePrismaClient {
  $transaction: <T>(
    fn: (tx: {
      $queryRawUnsafe: <R>(query: string, ...values: unknown[]) => Promise<R>;
      $executeRawUnsafe: (
        query: string,
        ...values: unknown[]
      ) => Promise<number>;
    }) => Promise<T>
  ) => Promise<T>;
  $queryRawUnsafe: <R>(query: string, ...values: unknown[]) => Promise<R>;
}

export const EVENT_STORE_PRISMA_CLIENT = Symbol('EVENT_STORE_PRISMA_CLIENT');

@Injectable()
export class PrismaEventStore implements IEventStore {
  constructor(
    @Inject(EVENT_STORE_PRISMA_CLIENT)
    private readonly prisma: EventStorePrismaClient
  ) {}

  async append(
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number
  ): Promise<void> {
    if (events.length === 0) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.prisma.$transaction(async (tx: any) => {
        const latestEvent = await tx.$queryRawUnsafe(
          `SELECT version FROM events 
           WHERE aggregate_id = $1 
           ORDER BY version DESC 
           LIMIT 1`,
          aggregateId
        );

        const currentVersion = latestEvent[0]?.version || 0;

        if (currentVersion !== expectedVersion) {
          throw new ConcurrencyException(
            aggregateId,
            expectedVersion,
            currentVersion
          );
        }

        for (const event of events) {
          await tx.$executeRawUnsafe(
            `INSERT INTO events (
              id, aggregate_id, aggregate_type, event_type,
              event_data, version, occurred_at, metadata
            ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8::jsonb)`,
            this.generateId(),
            event.aggregateId,
            event.aggregateType,
            event.type,
            JSON.stringify(event.data),
            event.version,
            event.occurredAt,
            event.metadata ? JSON.stringify(event.metadata) : null
          );
        }
      });
    } catch (error) {
      if (error instanceof ConcurrencyException) {
        throw error;
      }

      if ((error as { code?: string }).code === '23505') {
        throw new ConcurrencyException(
          aggregateId,
          expectedVersion,
          expectedVersion + 1
        );
      }

      throw error;
    }
  }

  async getEvents(aggregateId: string): Promise<StoredEvent[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (await (this.prisma.$queryRawUnsafe as any)(
      `SELECT 
        id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
        event_type as "eventType", event_data as "eventData", 
        version, occurred_at as "occurredAt", metadata
       FROM events 
       WHERE aggregate_id = $1 
       ORDER BY version ASC`,
      aggregateId
    )) as StoredEvent[];

    return events.map(this.mapStoredEvent);
  }

  async getEventsByType(
    eventType: string,
    limit = 100,
    offset = 0
  ): Promise<StoredEvent[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (await (this.prisma.$queryRawUnsafe as any)(
      `SELECT 
        id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
        event_type as "eventType", event_data as "eventData", 
        version, occurred_at as "occurredAt", metadata
       FROM events 
       WHERE event_type = $1 
       ORDER BY occurred_at DESC
       LIMIT $2 OFFSET $3`,
      eventType,
      limit,
      offset
    )) as StoredEvent[];

    return events.map(this.mapStoredEvent);
  }

  async getEventsByAggregateType(
    aggregateType: string,
    limit = 100,
    offset = 0
  ): Promise<StoredEvent[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const events = (await (this.prisma.$queryRawUnsafe as any)(
      `SELECT 
        id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
        event_type as "eventType", event_data as "eventData", 
        version, occurred_at as "occurredAt", metadata
       FROM events 
       WHERE aggregate_type = $1 
       ORDER BY occurred_at DESC
       LIMIT $2 OFFSET $3`,
      aggregateType,
      limit,
      offset
    )) as StoredEvent[];

    return events.map(this.mapStoredEvent);
  }

  async getEventsByDateRange(
    from: Date,
    to: Date,
    aggregateType?: string
  ): Promise<StoredEvent[]> {
    const query = aggregateType
      ? `SELECT 
          id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
          event_type as "eventType", event_data as "eventData", 
          version, occurred_at as "occurredAt", metadata
         FROM events 
         WHERE occurred_at >= $1 AND occurred_at <= $2 AND aggregate_type = $3
         ORDER BY occurred_at ASC`
      : `SELECT 
          id, aggregate_id as "aggregateId", aggregate_type as "aggregateType",
          event_type as "eventType", event_data as "eventData", 
          version, occurred_at as "occurredAt", metadata
         FROM events 
         WHERE occurred_at >= $1 AND occurred_at <= $2
         ORDER BY occurred_at ASC`;

    const events = (
      aggregateType
        ? await (this.prisma.$queryRawUnsafe as any)(
            query,
            from,
            to,
            aggregateType
          )
        : await (this.prisma.$queryRawUnsafe as any)(query, from, to)
    ) as StoredEvent[];

    return events.map(this.mapStoredEvent);
  }

  private mapStoredEvent(record: {
    id: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    eventData: unknown;
    version: number;
    occurredAt: Date;
    metadata?: unknown;
  }): StoredEvent {
    return {
      id: record.id,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      eventType: record.eventType,
      eventData:
        typeof record.eventData === 'string'
          ? JSON.parse(record.eventData)
          : (record.eventData as Record<string, unknown>),
      version: record.version,
      occurredAt: record.occurredAt,
      metadata:
        record.metadata && typeof record.metadata === 'string'
          ? JSON.parse(record.metadata)
          : (record.metadata as Record<string, unknown> | undefined),
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
