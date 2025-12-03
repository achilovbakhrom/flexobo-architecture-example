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
  ITransportReadRepository,
  TRANSPORT_READ_REPOSITORY,
} from '../../../ports/transport.repository';
import {
  TRANSPORT_EVENT_TYPES,
  TransportCreatedEventData,
  TransportUpdatedEventData,
} from '../../../domain/events/transport.events';

interface EventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

const QUEUE_NAME = 'main-service.transport.projection';

@Injectable()
export class TransportProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransportProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(TRANSPORT_READ_REPOSITORY)
    private readonly transportRepo: ITransportReadRepository,
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
      this.logger.warn('RabbitMQ is not connected. Skipping transport projection subscription.');
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUE_NAME,
      ['transport.#'],
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
      `[Projection] Transport event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case TRANSPORT_EVENT_TYPES.CREATED:
        await this.onTransportCreated(payload);
        break;
      case TRANSPORT_EVENT_TYPES.UPDATED:
        await this.onTransportUpdated(payload);
        break;
      case TRANSPORT_EVENT_TYPES.DELETED:
        await this.onTransportDeleted(payload);
        break;
      default:
        this.logger.warn(`Unknown transport event type: ${payload.type}`);
    }
  }

  private async onTransportCreated(event: EventPayload): Promise<void> {
    const data = event.data as unknown as TransportCreatedEventData;

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

  private async onTransportUpdated(event: EventPayload): Promise<void> {
    const existing = await this.transportRepo.findById(event.aggregateId);
    if (!existing) return;

    const data = event.data as unknown as TransportUpdatedEventData;

    await this.transportRepo.save({
      ...existing,
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

  private async onTransportDeleted(event: EventPayload): Promise<void> {
    await this.transportRepo.delete(event.aggregateId);
  }
}
