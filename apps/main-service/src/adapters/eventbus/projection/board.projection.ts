import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  RabbitMQConsumer,
  MESSAGE_CONSUMER,
  MESSAGE_PUBLISHER,
  IMessagePublisher,
  IncomingMessage,
  BaseProjection,
  ProjectionConfig,
  EventPayload,
  IEventBuffer,
  EVENT_BUFFER,
  INotificationResolver,
} from '@flexobo/core';
import {
  IBoardReadRepository,
  BOARD_READ_REPOSITORY,
  BoardReadDto,
} from '../../../ports/board.repository';
import {
  BOARD_EVENT_TYPES,
  BoardCreatedEventData,
  BoardUpdatedEventData,
  BoardMemberAddedEventData,
  BoardMemberRemovedEventData,
} from '../../../domain/events/board.events';
import { BOARD_NOTIFICATION_RESOLVER } from '../notification-resolvers';

type BoardEventPayload = EventPayload<
  | BoardCreatedEventData
  | BoardUpdatedEventData
  | BoardMemberAddedEventData
  | BoardMemberRemovedEventData
  | Record<string, unknown>
>;

@Injectable()
export class BoardProjection extends BaseProjection<
  BoardReadDto,
  BoardEventPayload
> {
  constructor(
    @Inject(BOARD_READ_REPOSITORY)
    private readonly boardRepo: IBoardReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(BOARD_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<BoardEventPayload> | null
  ) {
    super(rabbitMQConsumer, BoardProjection.name, eventBuffer, messagePublisher, notificationResolver);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.board.projection',
      routingKeys: ['board.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.boardRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: BoardEventPayload): Promise<void> {
    switch (event.type) {
      case BOARD_EVENT_TYPES.CREATED:
        await this.onBoardCreated(event as EventPayload<BoardCreatedEventData>);
        break;
      case BOARD_EVENT_TYPES.UPDATED:
        await this.onBoardUpdated(event as EventPayload<BoardUpdatedEventData>);
        break;
      case BOARD_EVENT_TYPES.MEMBER_ADDED:
        await this.onBoardMemberAdded(event as EventPayload<BoardMemberAddedEventData>);
        break;
      case BOARD_EVENT_TYPES.MEMBER_REMOVED:
        await this.onBoardMemberRemoved(event as EventPayload<BoardMemberRemovedEventData>);
        break;
      case BOARD_EVENT_TYPES.DELETED:
        await this.onBoardDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown board event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as BoardEventPayload;
    await this.applyEvent(payload);
  }

  private async onBoardCreated(
    event: EventPayload<BoardCreatedEventData>
  ): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.boardRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyId: data.companyId,
      name: data.name,
      description: data.description,
      members: [],
      isActive: true,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardUpdated(
    event: EventPayload<BoardUpdatedEventData>
  ): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.boardRepo.save({
      ...existing!,
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardMemberAdded(
    event: EventPayload<BoardMemberAddedEventData>
  ): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const members = [...existing!.members];

    const existingMemberIndex = members.findIndex(m => m.userId === data.userId);
    if (existingMemberIndex >= 0) {
      members[existingMemberIndex] = { userId: data.userId, role: data.role };
    } else {
      members.push({ userId: data.userId, role: data.role });
    }

    await this.boardRepo.save({
      ...existing!,
      members,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardMemberRemoved(
    event: EventPayload<BoardMemberRemovedEventData>
  ): Promise<void> {
    const existing = await this.boardRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const members = existing!.members.filter(m => m.userId !== event.data.userId);

    await this.boardRepo.save({
      ...existing!,
      members,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onBoardDeleted(event: BoardEventPayload): Promise<void> {
    await this.boardRepo.delete(event.aggregateId);
  }
}
