import { Injectable, Inject, Optional } from '@nestjs/common';
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
  IFileReadModelRepository,
  FILE_READ_MODEL_REPOSITORY,
  FileReadModelDto,
} from '../../../ports/file-read-model.port';
import {
  FILE_EVENT_TYPES,
  FILE_ROUTING_KEYS,
  QUEUES,
} from '../../../domain/events/event.constants';

interface FileUploadedData {
  userId: string;
  companyId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  uploadedAt: string;
}

interface FileDeletedData {
  deletedBy: string;
  deletedAt: string;
}

type FileEventData = FileUploadedData | FileDeletedData;
type FileEventPayload = EventPayload<FileEventData>;

@Injectable()
export class FileProjection extends BaseProjection<FileReadModelDto, FileEventPayload> {
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository,
    @Inject(MESSAGE_CONSUMER)
    rabbitMQConsumer: RabbitMQConsumer,
    @Optional()
    @Inject(EVENT_BUFFER)
    eventBuffer: IEventBuffer | null
  ) {
    super(rabbitMQConsumer, FileProjection.name, eventBuffer);
  }

  protected getConfig(): ProjectionConfig {
    return {
      queueName: QUEUES.FILE.PROJECTION,
      routingKeys: [FILE_ROUTING_KEYS.ALL],
      durable: true,
      maxRetries: 3,
      prefetchCount: 10,
      lockTtlMs: 5000,
    };
  }

  protected override async getCurrentModelVersion(aggregateId: string): Promise<number> {
    const entity = await this.repository.findById(aggregateId);
    return entity?.version ?? 0;
  }

  protected override async applyEvent(event: FileEventPayload): Promise<void> {
    switch (event.type) {
      case FILE_EVENT_TYPES.UPLOADED:
        await this.onFileUploaded(event as EventPayload<FileUploadedData>);
        break;
      case FILE_EVENT_TYPES.DELETED:
        await this.onFileDeleted(event as EventPayload<FileDeletedData>);
        break;
      default:
        this.logger.warn(`Unknown file event type: ${event.type}`);
    }
  }

  protected async handleEvent(message: IncomingMessage): Promise<void> {
    const payload = message.content as FileEventPayload;
    await this.applyEvent(payload);
  }

  private async onFileUploaded(event: EventPayload<FileUploadedData>): Promise<void> {
    const existingFile = await this.repository.findById(event.aggregateId);
    this.checkCreateIdempotency(existingFile, event);

    const { data } = event;
    await this.repository.upsert(
      {
        id: event.aggregateId,
        userId: data.userId,
        companyId: data.companyId,
        fileName: data.fileName,
        originalName: data.originalName,
        mimeType: data.mimeType,
        size: data.size,
        s3Key: data.s3Key,
        s3Bucket: data.s3Bucket,
        status: 'ACTIVE',
        version: event.version,
        uploadedAt: new Date(data.uploadedAt),
        updatedAt: new Date(),
      },
      { version: event.version }
    );
  }

  private async onFileDeleted(event: EventPayload<FileDeletedData>): Promise<void> {
    const existingFile = await this.repository.findById(event.aggregateId);
    this.checkVersion(existingFile, event);

    await this.repository.upsert(
      {
        ...existingFile!,
        status: 'DELETED',
        version: event.version,
        updatedAt: new Date(),
      },
      { version: event.version }
    );
  }
}
