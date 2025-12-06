import { Injectable, Inject, Optional } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
} from '@flexobo/core';
import {
  IBidReadRepository,
  BID_READ_REPOSITORY,
  BidReadDto,
} from '../../../ports/bid.repository';
import {
  BID_EVENT_TYPES,
  BidCreatedEventData,
  BidCounteredEventData,
} from '../../../domain/events/bid.events';
import { BidStatus } from '../../../domain/constants/enums';

type BidEventPayload = EventPayload<
  BidCreatedEventData | BidCounteredEventData | Record<string, unknown>
>;

@Injectable()
export class BidProjection extends BaseProjection<BidReadDto, BidEventPayload> {
  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, BidProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.bid.projection',
      routingKeys: ['bid.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.bidRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: BidEventPayload): Promise<void> {
    switch (event.type) {
      case BID_EVENT_TYPES.CREATED:
        await this.onBidCreated(event as EventPayload<BidCreatedEventData>);
        break;
      case BID_EVENT_TYPES.COUNTERED:
        await this.onBidCountered(event as EventPayload<BidCounteredEventData>);
        break;
      case BID_EVENT_TYPES.ACCEPTED:
        await this.onBidAccepted(event);
        break;
      case BID_EVENT_TYPES.REJECTED:
        await this.onBidRejected(event);
        break;
      case BID_EVENT_TYPES.CANCELLED:
        await this.onBidCancelled(event);
        break;
      case BID_EVENT_TYPES.EXPIRED:
        await this.onBidExpired(event);
        break;
      default:
        this.logger.warn(`Unknown bid event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as BidEventPayload;
    await this.applyEvent(payload);
  }

  private async onBidCreated(
    event: EventPayload<BidCreatedEventData>
  ): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.bidRepo.save({
      id: event.aggregateId,
      bidderId: data.bidderId,
      ownerId: data.ownerId,
      postType: data.postType,
      postId: data.postId,
      transportIds: data.transportIds,
      proposedPrice: data.proposedPrice,
      currency: data.currency,
      status: BidStatus.PENDING,
      negotiationRound: 1,
      chatRoomId: data.chatRoomId,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    await this.bidRepo.saveNegotiationStep({
      id: uuidv4(),
      bidId: event.aggregateId,
      authorId: data.bidderId,
      stepNumber: 1,
      priceOffer: data.proposedPrice,
      currency: data.currency,
      isAccepted: false,
      isRejected: false,
      createdAt: new Date(event.occurredAt),
    });
  }

  private async onBidCountered(
    event: EventPayload<BidCounteredEventData>
  ): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.bidRepo.save({
      ...existing!,
      proposedPrice: data.newPrice,
      status: BidStatus.COUNTERED,
      negotiationRound: data.negotiationRound,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });

    await this.bidRepo.saveNegotiationStep({
      id: uuidv4(),
      bidId: event.aggregateId,
      authorId: data.userId,
      stepNumber: data.negotiationRound,
      priceOffer: data.newPrice,
      currency: data.currency,
      isAccepted: false,
      isRejected: false,
      createdAt: new Date(event.occurredAt),
    });
  }

  private async onBidAccepted(event: BidEventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bidRepo.save({
      ...existing!,
      status: BidStatus.ACCEPTED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidRejected(event: BidEventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bidRepo.save({
      ...existing!,
      status: BidStatus.REJECTED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidCancelled(event: BidEventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bidRepo.save({
      ...existing!,
      status: BidStatus.CANCELLED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidExpired(event: BidEventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.bidRepo.save({
      ...existing!,
      status: BidStatus.EXPIRED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }
}
