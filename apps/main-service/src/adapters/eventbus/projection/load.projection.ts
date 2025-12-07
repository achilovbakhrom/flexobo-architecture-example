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
  ILoadReadRepository,
  LOAD_READ_REPOSITORY,
  LoadReadDto,
} from '../../../ports/load.repository';
import {
  LOAD_EVENT_TYPES,
  LoadCreatedEventData,
  LoadUpdatedEventData,
  LoadStatusChangedEventData,
} from '../../../domain/events/load.events';
import { LoadStatus } from '../../../domain/constants/enums';
import { LOAD_NOTIFICATION_RESOLVER } from '../notification-resolvers';

type LoadEventPayload = EventPayload<
  | LoadCreatedEventData
  | LoadUpdatedEventData
  | LoadStatusChangedEventData
  | Record<string, unknown>
>;

@Injectable()
export class LoadProjection extends BaseProjection<
  LoadReadDto,
  LoadEventPayload
> {
  constructor(
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepo: ILoadReadRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null,
    @Optional()
    @Inject(MESSAGE_PUBLISHER)
    messagePublisher: IMessagePublisher | null,
    @Optional()
    @Inject(LOAD_NOTIFICATION_RESOLVER)
    notificationResolver: INotificationResolver<LoadEventPayload> | null
  ) {
    super(
      rabbitMQConsumer,
      LoadProjection.name,
      eventBuffer,
      messagePublisher,
      notificationResolver
    );
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: 'main-service.load.projection',
      routingKeys: ['load.#'],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(
    aggregateId: string
  ): Promise<number> {
    const entity = await this.loadRepo.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: LoadEventPayload): Promise<void> {
    switch (event.type) {
      case LOAD_EVENT_TYPES.CREATED:
        await this.onLoadCreated(event as EventPayload<LoadCreatedEventData>);
        break;
      case LOAD_EVENT_TYPES.UPDATED:
        await this.onLoadUpdated(event as EventPayload<LoadUpdatedEventData>);
        break;
      case LOAD_EVENT_TYPES.STATUS_CHANGED:
        await this.onLoadStatusChanged(
          event as EventPayload<LoadStatusChangedEventData>
        );
        break;
      case LOAD_EVENT_TYPES.DELETED:
        await this.onLoadDeleted(event);
        break;
      default:
        this.logger.warn(`Unknown load event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as LoadEventPayload;
    await this.applyEvent(payload);
  }

  private async onLoadCreated(
    event: EventPayload<LoadCreatedEventData>
  ): Promise<void> {
    const existing = await this.loadRepo.findById(event.aggregateId);
    this.checkCreateIdempotency(existing, event);

    const { data } = event;
    await this.loadRepo.save({
      id: event.aggregateId,
      ownerId: data.ownerId,
      companyId: data.companyId,
      status: LoadStatus.DRAFT,
      fromCountry: data.from.country,
      fromCity: data.from.city,
      fromAddress: data.from.address,
      fromLat: data.from.lat,
      fromLng: data.from.lng,
      toCountry: data.to.country,
      toCity: data.to.city,
      toAddress: data.to.address,
      toLat: data.to.lat,
      toLng: data.to.lng,
      transportType: data.transportType,
      loadingTypes: data.loadingTypes,
      cargos: data.cargos,
      totalWeight: data.totalWeight,
      totalVolume: data.totalVolume,
      features: data.features,
      adrClasses: data.adrClasses,
      temperatureMin: data.temperatureMin,
      temperatureMax: data.temperatureMax,
      price: data.price,
      currency: data.currency,
      paymentTerms: data.paymentTerms,
      loadingDate: new Date(data.loadingDate),
      loadingDateTo: data.loadingDateTo
        ? new Date(data.loadingDateTo)
        : undefined,
      unloadingDate: data.unloadingDate
        ? new Date(data.unloadingDate)
        : undefined,
      boardIds: data.boardIds,
      isPublic: data.isPublic,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onLoadUpdated(
    event: EventPayload<LoadUpdatedEventData>
  ): Promise<void> {
    const existing = await this.loadRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    const { data } = event;
    const updated = { ...existing! };

    if (data.from) {
      updated.fromCountry = data.from.country ?? existing?.fromCountry;
      updated.fromCity = data.from.city ?? existing?.fromCity;
      updated.fromAddress = data.from.address ?? existing?.fromAddress;
      updated.fromLat = data.from.lat ?? existing?.fromLat;
      updated.fromLng = data.from.lng ?? existing?.fromLng;
    }
    if (data.to) {
      updated.toCountry = data.to.country ?? existing?.toCountry;
      updated.toCity = data.to.city ?? existing?.toCity;
      updated.toAddress = data.to.address ?? existing?.toAddress;
      updated.toLat = data.to.lat ?? existing?.toLat;
      updated.toLng = data.to.lng ?? existing?.toLng;
    }

    if (data.transportType !== undefined)
      updated.transportType = data.transportType;
    if (data.loadingTypes !== undefined)
      updated.loadingTypes = data.loadingTypes;
    if (data.cargos !== undefined) updated.cargos = data.cargos;
    if (data.totalWeight !== undefined) updated.totalWeight = data.totalWeight;
    if (data.totalVolume !== undefined) updated.totalVolume = data.totalVolume;
    if (data.features !== undefined) updated.features = data.features;
    if (data.adrClasses !== undefined) updated.adrClasses = data.adrClasses;
    if (data.temperatureMin !== undefined)
      updated.temperatureMin = data.temperatureMin;
    if (data.temperatureMax !== undefined)
      updated.temperatureMax = data.temperatureMax;
    if (data.price !== undefined) updated.price = data.price;
    if (data.currency !== undefined) updated.currency = data.currency;
    if (data.paymentTerms !== undefined)
      updated.paymentTerms = data.paymentTerms;
    if (data.loadingDate !== undefined)
      updated.loadingDate = new Date(data.loadingDate);
    if (data.loadingDateTo !== undefined)
      updated.loadingDateTo = data.loadingDateTo
        ? new Date(data.loadingDateTo)
        : undefined;
    if (data.unloadingDate !== undefined)
      updated.unloadingDate = data.unloadingDate
        ? new Date(data.unloadingDate)
        : undefined;
    if (data.boardIds !== undefined) updated.boardIds = data.boardIds;
    if (data.isPublic !== undefined) updated.isPublic = data.isPublic;

    updated.version = event.version;
    updated.updatedAt = new Date(event.occurredAt);

    await this.loadRepo.save(updated);
  }

  private async onLoadStatusChanged(
    event: EventPayload<LoadStatusChangedEventData>
  ): Promise<void> {
    const existing = await this.loadRepo.findById(event.aggregateId);
    this.checkVersion(existing, event);

    await this.loadRepo.save({
      ...existing!,
      status: event.data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onLoadDeleted(event: LoadEventPayload): Promise<void> {
    await this.loadRepo.delete(event.aggregateId);
  }
}
