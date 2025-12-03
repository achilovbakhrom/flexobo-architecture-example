import {
  Injectable,
  Inject,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  IncomingMessage,
} from '@flexobo/core';
import {
  IBoardReadRepository,
  BOARD_READ_REPOSITORY,
} from '../../../ports/board.repository';
import {
  BOARD_EVENT_TYPES,
  BoardCreatedEventData,
  BoardUpdatedEventData,
  BoardMemberAddedEventData,
  BoardMemberRemovedEventData,
} from '../../../domain/events/board.events';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.board.projection';

@Injectable()
export class BoardProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BoardProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(BOARD_READ_REPOSITORY)
    private readonly boardRepo: IBoardReadRepository,
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
      this.logger.warn('RabbitMQ is not connected. Skipping board projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['board.#'],
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
      `[Projection] Board event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case BOARD_EVENT_TYPES.CREATED:
        await this.onBoardCreated(payload);
        break;
      case BOARD_EVENT_TYPES.UPDATED:
        await this.onBoardUpdated(payload);
        break;
      case BOARD_EVENT_TYPES.MEMBER_ADDED:
        await this.onBoardMemberAdded(payload);
        break;
      case BOARD_EVENT_TYPES.MEMBER_REMOVED:
        await this.onBoardMemberRemoved(payload);
        break;
      case BOARD_EVENT_TYPES.DELETED:
        await this.onBoardDeleted(payload);
        break;
      default:
        this.logger.warn(`Unknown board event type: ${payload.type}`);
    }
  }

  private async onBoardCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as BoardCreatedEventData;

    await this.boardRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      members: [],
      isActive: true,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardUpdated(event: EventPayload): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as BoardUpdatedEventData;

    await this.boardRepo.save({
      ...existing,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardMemberAdded(event: EventPayload): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as BoardMemberAddedEventData;
    const members = [...existing.members];

    // Check if member already exists
    const existingMemberIndex = members.findIndex(m => m.userId === data.userId);
    if (existingMemberIndex >= 0) {
      // Update role
      members[existingMemberIndex] = { userId: data.userId, role: data.role };
    } else {
      members.push({ userId: data.userId, role: data.role });
    }

    await this.boardRepo.save({
      ...existing,
      members,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardMemberRemoved(event: EventPayload): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as BoardMemberRemovedEventData;
    const members = existing.members.filter(m => m.userId !== data.userId);

    await this.boardRepo.save({
      ...existing,
      members,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardDeleted(event: EventPayload): Promise<void> {
    await this.boardRepo.delete(event.aggregateId);
  }
}
