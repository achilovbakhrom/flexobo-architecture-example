import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  IBidReadRepository,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';
import {
  BID_EVENT_TYPES,
  BidCreatedEventData,
  BidCounteredEventData,
} from '../../../domain/events/bid.events';
import { BidStatus } from '../../../domain/constants/enums';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.bid.projection';

@Injectable()
export class BidProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BidProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUE_NAME);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn('RabbitMQ is not connected. Skipping bid projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['bid.#'],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      { durable: true, maxRetries: 3 }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUE_NAME}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as EventPayload;

    this.logger.debug(
      `[Projection] Bid event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case BID_EVENT_TYPES.CREATED:
        await this.onBidCreated(payload);
        break;
      case BID_EVENT_TYPES.COUNTERED:
        await this.onBidCountered(payload);
        break;
      case BID_EVENT_TYPES.ACCEPTED:
        await this.onBidAccepted(payload);
        break;
      case BID_EVENT_TYPES.REJECTED:
        await this.onBidRejected(payload);
        break;
      case BID_EVENT_TYPES.CANCELLED:
        await this.onBidCancelled(payload);
        break;
      case BID_EVENT_TYPES.EXPIRED:
        await this.onBidExpired(payload);
        break;
      default:
        this.logger.warn(`Unknown bid event type: ${payload.type}`);
    }
  }

  private async onBidCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as BidCreatedEventData;

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

    // Save initial negotiation step
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

  private async onBidCountered(event: EventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as BidCounteredEventData;

    await this.bidRepo.save({
      ...existing,
      proposedPrice: data.newPrice,
      status: BidStatus.COUNTERED,
      negotiationRound: data.negotiationRound,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });

    // Save counter offer as negotiation step
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

  private async onBidAccepted(event: EventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    if (!existing) return;

    await this.bidRepo.save({
      ...existing,
      status: BidStatus.ACCEPTED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidRejected(event: EventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    if (!existing) return;

    await this.bidRepo.save({
      ...existing,
      status: BidStatus.REJECTED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidCancelled(event: EventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    if (!existing) return;

    await this.bidRepo.save({
      ...existing,
      status: BidStatus.CANCELLED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBidExpired(event: EventPayload): Promise<void> {
    const existing = await this.bidRepo.findById(event.aggregateId);
    if (!existing) return;

    await this.bidRepo.save({
      ...existing,
      status: BidStatus.EXPIRED,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }
}
