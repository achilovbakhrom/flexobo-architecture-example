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
  ILoadReadRepository,
  LOAD_READ_REPOSITORY,
} from '../../../ports/load.repository';
import {
  LOAD_EVENT_TYPES,
  LoadCreatedEventData,
  LoadUpdatedEventData,
  LoadStatusChangedEventData,
} from '../../../domain/events/load.events';
import { LoadStatus } from '../../../domain/constants/enums';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.load.projection';

@Injectable()
export class LoadProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LoadProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepo: ILoadReadRepository,
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
      this.logger.warn('RabbitMQ is not connected. Skipping load projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['load.#'],
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
      `[Projection] Load event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case LOAD_EVENT_TYPES.CREATED:
        await this.onLoadCreated(payload);
        break;
      case LOAD_EVENT_TYPES.UPDATED:
        await this.onLoadUpdated(payload);
        break;
      case LOAD_EVENT_TYPES.STATUS_CHANGED:
        await this.onLoadStatusChanged(payload);
        break;
      case LOAD_EVENT_TYPES.DELETED:
        await this.onLoadDeleted(payload);
        break;
      default:
        this.logger.warn(`Unknown load event type: ${payload.type}`);
    }
  }

  private async onLoadCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as LoadCreatedEventData;

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
      loadingDateTo: data.loadingDateTo ? new Date(data.loadingDateTo) : undefined,
      unloadingDate: data.unloadingDate ? new Date(data.unloadingDate) : undefined,
      boardIds: data.boardIds,
      isPublic: data.isPublic,
      version: event.version,
      createdAt: new Date(event.occurredAt),
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onLoadUpdated(event: EventPayload): Promise<void> {
    const existing = await this.loadRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as LoadUpdatedEventData;
    const updated = { ...existing };

    // Handle location changes
    if (data.from) {
      updated.fromCountry = data.from.country ?? existing.fromCountry;
      updated.fromCity = data.from.city ?? existing.fromCity;
      updated.fromAddress = data.from.address ?? existing.fromAddress;
      updated.fromLat = data.from.lat ?? existing.fromLat;
      updated.fromLng = data.from.lng ?? existing.fromLng;
    }
    if (data.to) {
      updated.toCountry = data.to.country ?? existing.toCountry;
      updated.toCity = data.to.city ?? existing.toCity;
      updated.toAddress = data.to.address ?? existing.toAddress;
      updated.toLat = data.to.lat ?? existing.toLat;
      updated.toLng = data.to.lng ?? existing.toLng;
    }

    // Handle other changes
    if (data.transportType !== undefined) updated.transportType = data.transportType;
    if (data.loadingTypes !== undefined) updated.loadingTypes = data.loadingTypes;
    if (data.cargos !== undefined) updated.cargos = data.cargos;
    if (data.totalWeight !== undefined) updated.totalWeight = data.totalWeight;
    if (data.totalVolume !== undefined) updated.totalVolume = data.totalVolume;
    if (data.features !== undefined) updated.features = data.features;
    if (data.adrClasses !== undefined) updated.adrClasses = data.adrClasses;
    if (data.temperatureMin !== undefined) updated.temperatureMin = data.temperatureMin;
    if (data.temperatureMax !== undefined) updated.temperatureMax = data.temperatureMax;
    if (data.price !== undefined) updated.price = data.price;
    if (data.currency !== undefined) updated.currency = data.currency;
    if (data.paymentTerms !== undefined) updated.paymentTerms = data.paymentTerms;
    if (data.loadingDate !== undefined) updated.loadingDate = new Date(data.loadingDate);
    if (data.loadingDateTo !== undefined)
      updated.loadingDateTo = data.loadingDateTo ? new Date(data.loadingDateTo) : undefined;
    if (data.unloadingDate !== undefined)
      updated.unloadingDate = data.unloadingDate ? new Date(data.unloadingDate) : undefined;
    if (data.boardIds !== undefined) updated.boardIds = data.boardIds;
    if (data.isPublic !== undefined) updated.isPublic = data.isPublic;

    updated.version = event.version;
    updated.updatedAt = new Date(event.occurredAt);

    await this.loadRepo.save(updated);
  }

  private async onLoadStatusChanged(event: EventPayload): Promise<void> {
    const existing = await this.loadRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as LoadStatusChangedEventData;

    await this.loadRepo.save({
      ...existing,
      status: data.newStatus,
      version: event.version,
      updatedAt: new Date(event.occurredAt),
    });
  }

  private async onLoadDeleted(event: EventPayload): Promise<void> {
    await this.loadRepo.delete(event.aggregateId);
  }
}
