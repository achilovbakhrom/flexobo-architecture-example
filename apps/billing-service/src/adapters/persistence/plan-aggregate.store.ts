import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.module';
import { DomainEvent, IAggregateStore } from '@flexobo/core';
import { PlanAggregate } from '../../domain/aggregates/plan.aggregate';
import { AggregateType } from '../../domain/constants/enums';

@Injectable()
export class PlanAggregateStore implements IAggregateStore<PlanAggregate> {
  private readonly logger = new Logger(PlanAggregateStore.name);

  constructor(private readonly prisma: PrismaService) {}

  async load(id: string): Promise<PlanAggregate | null> {
    const events = await this.prisma.event.findMany({
      where: {
        aggregateId: id,
        aggregateType: AggregateType.PLAN,
      },
      orderBy: { version: 'asc' },
    });

    if (events.length === 0) {
      return null;
    }

    const domainEvents = events.map((e) => this.toDomainEvent(e));
    return PlanAggregate.fromEvents(domainEvents);
  }

  async exists(aggregateId: string): Promise<boolean> {
    const count = await this.prisma.event.count({
      where: {
        aggregateId,
        aggregateType: AggregateType.PLAN,
      },
    });
    return count > 0;
  }

  async save(aggregate: PlanAggregate): Promise<DomainEvent[]> {
    const uncommittedEvents = aggregate.getUncommittedEvents();

    if (uncommittedEvents.length === 0) {
      return [];
    }

    await this.prisma.$transaction(async (tx) => {
      for (const event of uncommittedEvents) {
        await tx.event.create({
          data: {
            aggregateId: event.aggregateId,
            aggregateType: AggregateType.PLAN,
            eventType: event.type,
            payload: JSON.parse(JSON.stringify(event.data)),
            metadata: event.metadata ? JSON.parse(JSON.stringify(event.metadata)) : undefined,
            version: event.version,
            createdAt: event.occurredAt,
          },
        });

        // Add to outbox for event publishing
        await tx.outbox.create({
          data: {
            eventType: event.type,
            payload: JSON.parse(JSON.stringify({
              aggregateId: event.aggregateId,
              aggregateType: AggregateType.PLAN,
              type: event.type,
              data: event.data,
              metadata: event.metadata,
              version: event.version,
              occurredAt: event.occurredAt.toISOString(),
            })),
            routingKey: `billing.plan.${event.type.toLowerCase().replace(/_/g, '.')}`,
          },
        });
      }
    });

    aggregate.markEventsAsCommitted();
    this.logger.debug(
      `Saved ${uncommittedEvents.length} events for plan ${aggregate.id}`,
    );

    return uncommittedEvents;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDomainEvent(record: any): DomainEvent {
    return {
      type: record.eventType,
      aggregateId: record.aggregateId,
      aggregateType: record.aggregateType,
      version: record.version,
      occurredAt: record.createdAt,
      data: record.payload as Record<string, unknown>,
      metadata: record.metadata as Record<string, unknown> | undefined,
    };
  }
}
