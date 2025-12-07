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
  ITransportReadRepository,
  TRANSPORT_READ_REPOSITORY,
  TransportReadDto,
} from '../../../ports/transport.repository';
import {
  TRANSPORT_EVENT_TYPES,
  TransportCreatedEventData,
  TransportUpdatedEventData,
} from '../../../domain/events/transport.events';
import { TRANSPORT_NOTIFICATION_RESOLVER } from '../notification-resolvers';

type TransportEventPayload = EventPayload<
  TransportCreatedEventData | TransportUpdatedEventData | Record<string, unknown>
>;

@Injectable()
export class TransportProjection extends BaseProjection<
  TransportReadDto,
  TransportEventPayload
> {
  constructor(
    @Inject(TRANSPORT_READ_REPOSITORY)
    private readonly transportRepo: ITransportReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(TRANSPORT_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<TransportEventPayload> | null
  ) {
    super(rabbitMQConsumer, TransportProjection.name, eventBuffer, messagePublisher, notificationResolver);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.transport.projection',
      routingKeys: ['transport.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.transportRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(
    event: TransportEventPayload
  ): Promise<void> {
    switch (event.type) {
      case TRANSPORT_EVENT_TYPES.CREATED:
        await this.onTransportCreated(event as EventPayload<TransportCreatedEventData>);
        break;
      case TRANSPORT_EVENT_TYPES.UPDATED:
        await this.onTransportUpdated(event as EventPayload<TransportUpdatedEventData>);
        break;
      case TRANSPORT_EVENT_TYPES.DELETED:
        await this.onTransportDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown transport event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as TransportEventPayload;
    await this.applyEvent(payload);
  }

  private async onTransportCreated(
    event: EventPayload<TransportCreatedEventData>
  ): Promise<void> {
    const existing = await this.transportRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.transportRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyId: data.companyId,
      transportType: data.transportType,
      loadingTypes: data.loadingTypes,
      capacityTons: data.capacityTons,
      capacityM3: data.capacityM3,
      lengthM: data.lengthM,
      widthM: data.widthM,
      heightM: data.heightM,
      features: data.features,
      adrClasses: data.adrClasses,
      permits: data.permits,
      isActive: true,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTransportUpdated(
    event: EventPayload<TransportUpdatedEventData>
  ): Promise<void> {
    const existing = await this.transportRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    await this.transportRepo.save({
      ...existing!,
      ...(data.transportType !== undefined && { transportType: data.transportType }),
      ...(data.loadingTypes !== undefined && { loadingTypes: data.loadingTypes }),
      ...(data.capacityTons !== undefined && { capacityTons: data.capacityTons }),
      ...(data.capacityM3 !== undefined && { capacityM3: data.capacityM3 }),
      ...(data.lengthM !== undefined && { lengthM: data.lengthM }),
      ...(data.widthM !== undefined && { widthM: data.widthM }),
      ...(data.heightM !== undefined && { heightM: data.heightM }),
      ...(data.features !== undefined && { features: data.features }),
      ...(data.adrClasses !== undefined && { adrClasses: data.adrClasses }),
      ...(data.permits !== undefined && { permits: data.permits }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onTransportDeleted(event: TransportEventPayload): Promise<void> {
    await this.transportRepo.delete(event.aggregateId);
  }
}
