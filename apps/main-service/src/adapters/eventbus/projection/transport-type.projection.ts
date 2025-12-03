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
  ITransportTypeReadModelRepository,
  TRANSPORT_TYPE_READ_MODEL_REPOSITORY,
} from '../../../ports/transport-type-read-model.port';
import {
  ROUTING_KEYS,
  EVENT_TYPES,
  QUEUES,
} from '../../../domain/event.constants';

interface TransportTypeEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class TransportTypeProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TransportTypeProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(TRANSPORT_TYPE_READ_MODEL_REPOSITORY)
    private readonly readModelRepository: ITransportTypeReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.TRANSPORT_TYPE.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      throw new Error(
        'RabbitMQ is not connected. Cannot start transport type projection.'
      );
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.TRANSPORT_TYPE.PROJECTION,
      [ROUTING_KEYS.TRANSPORT_TYPE.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.TRANSPORT_TYPE.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as TransportTypeEventPayload;

    this.logger.debug(
      `[Projection] TransportType event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case EVENT_TYPES.TRANSPORT_TYPE.CREATED:
        await this.onTransportTypeCreated(payload);
        break;

      case EVENT_TYPES.TRANSPORT_TYPE.UPDATED:
        await this.onTransportTypeUpdated(payload);
        break;

      case EVENT_TYPES.TRANSPORT_TYPE.TRANSLATION_ADDED:
        await this.onTranslationAdded(payload);
        break;

      case EVENT_TYPES.TRANSPORT_TYPE.TRANSLATION_UPDATED:
        await this.onTranslationUpdated(payload);
        break;

      case EVENT_TYPES.TRANSPORT_TYPE.TRANSLATION_DELETED:
        await this.onTranslationDeleted(payload);
        break;

      case EVENT_TYPES.TRANSPORT_TYPE.DELETED:
        await this.onTransportTypeDeleted(payload);
        break;

      default:
        this.logger.warn(`Unknown transport type event type: ${payload.type}`);
    }
  }

  private async onTransportTypeCreated(
    event: TransportTypeEventPayload
  ): Promise<void> {
    const translations = (
      event.data['translations'] as Array<{
        language: string;
        name: string;
        description?: string;
      }>
    )?.map((translation) => ({
      id: `${event.aggregateId}-${translation.language}`,
      transportTypeId: event.aggregateId,
      language: translation.language,
      name: translation.name,
      description: translation.description,
    }));

    await this.readModelRepository.upsert(
      {
        id: event.aggregateId,
        isActive: event.data['isActive'] as boolean,
        updatedAt: new Date(event.occurredAt),
        translations: translations || [],
      },
      { version: event.version }
    );
  }

  private async onTransportTypeUpdated(
    event: TransportTypeEventPayload
  ): Promise<void> {
    const existing = await this.readModelRepository.findById(event.aggregateId);
    if (!existing) {
      this.logger.warn(
        `TransportType ${event.aggregateId} not found for update`
      );
      return;
    }

    await this.readModelRepository.upsert(
      {
        ...existing,
        isActive: (event.data['isActive'] as boolean) ?? existing.isActive,
        updatedAt: new Date(event.occurredAt),
      },
      { version: event.version }
    );
  }

  private async onTranslationAdded(
    event: TransportTypeEventPayload
  ): Promise<void> {
    const translation = event.data['translation'] as {
      language: string;
      name: string;
      description?: string;
    };

    await this.readModelRepository.upsertTranslation(event.aggregateId, {
      language: translation.language,
      name: translation.name,
      description: translation.description,
    });
  }

  private async onTranslationUpdated(
    event: TransportTypeEventPayload
  ): Promise<void> {
    const translation = event.data['translation'] as {
      language: string;
      name: string;
      description?: string;
    };

    await this.readModelRepository.upsertTranslation(event.aggregateId, {
      language: translation.language,
      name: translation.name,
      description: translation.description,
    });
  }

  private async onTranslationDeleted(
    event: TransportTypeEventPayload
  ): Promise<void> {
    const language = event.data['language'] as string;

    await this.readModelRepository.deleteTranslation(
      event.aggregateId,
      language
    );
  }

  private async onTransportTypeDeleted(
    event: TransportTypeEventPayload
  ): Promise<void> {
    await this.readModelRepository.delete(event.aggregateId);
  }
}
