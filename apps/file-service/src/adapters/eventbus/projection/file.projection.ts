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
  IFileReadModelRepository,
  FILE_READ_MODEL_REPOSITORY,
} from '../../../ports/file-read-model.port';
import {
  FILE_EVENT_TYPES,
  FILE_ROUTING_KEYS,
  QUEUES,
} from '../../../domain/events/event.constants';

interface FileEventPayload {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * File Projection
 *
 * Subscribes to file events and updates the read model.
 */
@Injectable()
export class FileProjection implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FileProjection.name);
  private isSubscribed = false;

  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    private readonly rabbitMQConsumer: RabbitMQConsumer
  ) {}

  async onModuleInit() {
    await this.subscribe();
  }

  async onModuleDestroy() {
    if (this.isSubscribed) {
      await this.rabbitMQConsumer.unsubscribe(QUEUES.FILE.PROJECTION);
    }
  }

  private async subscribe(): Promise<void> {
    if (!this.rabbitMQConsumer.isConnected()) {
      this.logger.warn(
        'RabbitMQ is not connected. File projection will not start.'
      );
      return;
    }

    await this.rabbitMQConsumer.subscribeToEvents(
      QUEUES.FILE.PROJECTION,
      [FILE_ROUTING_KEYS.ALL],
      async (message: IncomingMessage) => {
        await this.handleEvent(message);
      },
      {
        durable: true,
        maxRetries: 3,
      }
    );

    this.isSubscribed = true;
    this.logger.log(`Subscribed to queue: ${QUEUES.FILE.PROJECTION}`);
  }

  private async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as FileEventPayload;

    this.logger.debug(
      `[Projection] File event: ${payload.type} for ${payload.aggregateId} (v${payload.version})`
    );

    switch (payload.type) {
      case FILE_EVENT_TYPES.UPLOADED:
        await this.onFileUploaded(payload);
        break;

      case FILE_EVENT_TYPES.DELETED:
        await this.onFileDeleted(payload);
        break;

      default:
        this.logger.warn(`Unknown file event type: ${payload.type}`);
    }
  }

  private async onFileUploaded(event: FileEventPayload): Promise<void> {
    await this.repository.upsert(
      {
        id: event.aggregateId,
        userId: event.data['userId'] as string,
        companyId: event.data['companyId'] as string | undefined,
        fileName: event.data['fileName'] as string,
        originalName: event.data['originalName'] as string,
        mimeType: event.data['mimeType'] as string,
        size: event.data['size'] as number,
        s3Key: event.data['s3Key'] as string,
        s3Bucket: event.data['s3Bucket'] as string,
        status: 'ACTIVE',
        uploadedAt: new Date(event.data['uploadedAt'] as string),
        updatedAt: new Date(),
      },
      { version: event.version }
    );

    this.logger.log(
      `File read model created/updated: ${event.aggregateId}`
    );
  }

  private async onFileDeleted(event: FileEventPayload): Promise<void> {
    const file = await this.repository.findById(event.aggregateId);

    if (file) {
      await this.repository.upsert(
        {
          ...file,
          status: 'DELETED',
          updatedAt: new Date(),
        },
        { version: event.version }
      );

      this.logger.log(`File marked as deleted: ${event.aggregateId}`);
    }
  }
}
