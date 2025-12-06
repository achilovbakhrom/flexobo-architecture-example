import {
  CommandHandler,
  ICommandHandler,
  Result,
  Success,
  IMessagePublisher,
  MESSAGE_PUBLISHER,
} from '@flexobo/core';
import { Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FileAggregate } from '../../domain/aggregates/file.aggregate';
import {
  IFileAggregateStore,
  FILE_AGGREGATE_STORE,
} from '../../ports/file-store.port';
import { IStorageService, STORAGE_SERVICE } from '../../ports/storage.port';
import {
  UploadFileCommand,
  DeleteFileCommand,
  UploadChatFileCommand,
} from './file.commands';
import { FileUploadResponseDto, ChatFileUploadResponseDto } from '../dto/file.dto';
import {
  FILE_EVENT_TYPES,
  FILE_ROUTING_KEYS,
  EXCHANGES,
} from '../../domain/events/event.constants';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Upload File Command Handler
 *
 * Handles file upload to S3 and creates file aggregate.
 */
@CommandHandler(UploadFileCommand)
export class UploadFileHandler
  implements ICommandHandler<UploadFileCommand, FileUploadResponseDto>
{
  private readonly logger = new Logger(UploadFileHandler.name);

  constructor(
    @Inject(FILE_AGGREGATE_STORE)
    private readonly store: IFileAggregateStore,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService
  ) {}

  async execute(
    command: UploadFileCommand
  ): Promise<Result<FileUploadResponseDto, Error>> {
    try {
      // Validate file size
      if (command.size > MAX_FILE_SIZE) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(
            `File size exceeds maximum allowed size of 50MB. Got: ${(command.size / 1024 / 1024).toFixed(2)}MB`
          ),
        };
      }

      // Generate unique file path: {folder?}/{userId}/{uuid}.{extension}
      const ext = command.originalName.split('.').pop() || '';
      const uniqueId = randomUUID().slice(0, 8);
      const basePath = command.folder
        ? `${command.folder.replace(/^\/|\/$/g, '')}/${command.userId}`
        : command.userId;
      const fileName = `${basePath}/${Date.now()}-${uniqueId}${ext ? '.' + ext : ''}`;

      this.logger.log(
        `Uploading file: ${command.originalName} (${(command.size / 1024).toFixed(2)}KB) -> ${fileName}`
      );

      // Upload to S3
      const uploadResult = await this.storageService.upload(
        command.file,
        fileName,
        command.mimeType,
        { originalName: command.originalName }
      );

      // Create file aggregate
      const file = FileAggregate.create(
        command.fileId,
        command.userId,
        fileName,
        command.originalName,
        command.mimeType,
        command.size,
        uploadResult.key,
        uploadResult.bucket,
        command.companyId
      );

      // Save aggregate (persists events + publishes to broker)
      await this.store.save(file);

      this.logger.log(`File uploaded successfully: ${command.fileId}`);

      return new Success({
        fileId: command.fileId,
        url: uploadResult.url,
      });
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

/**
 * Delete File Command Handler
 *
 * Handles file deletion from S3 and marks aggregate as deleted.
 */
@CommandHandler(DeleteFileCommand)
export class DeleteFileHandler
  implements ICommandHandler<DeleteFileCommand, void>
{
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @Inject(FILE_AGGREGATE_STORE)
    private readonly store: IFileAggregateStore,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService
  ) {}

  async execute(command: DeleteFileCommand): Promise<Result<void, Error>> {
    try {
      const file = await this.store.load(command.fileId);

      if (!file) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(`File ${command.fileId} not found`),
        };
      }

      // Check ownership
      if (file.getUserId() !== command.userId) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error('You do not have permission to delete this file'),
        };
      }

      // Check if already deleted
      if (!file.isActive()) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error('File is already deleted'),
        };
      }

      const s3Key = file.getS3Key();

      this.logger.log(`Deleting file: ${command.fileId} (${s3Key})`);

      // Delete from S3
      await this.storageService.delete(s3Key);

      // Mark aggregate as deleted
      file.delete();
      await this.store.save(file);

      this.logger.log(`File deleted successfully: ${command.fileId}`);

      return new Success(undefined);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}

/**
 * Upload Chat File Command Handler
 *
 * Handles file upload to S3 for chat and publishes event with chatId.
 */
@CommandHandler(UploadChatFileCommand)
export class UploadChatFileHandler
  implements ICommandHandler<UploadChatFileCommand, ChatFileUploadResponseDto>
{
  private readonly logger = new Logger(UploadChatFileHandler.name);

  constructor(
    @Inject(FILE_AGGREGATE_STORE)
    private readonly store: IFileAggregateStore,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService,
    @Inject(MESSAGE_PUBLISHER)
    private readonly messagePublisher: IMessagePublisher
  ) {}

  async execute(
    command: UploadChatFileCommand
  ): Promise<Result<ChatFileUploadResponseDto, Error>> {
    try {
      // Validate file size
      if (command.size > MAX_FILE_SIZE) {
        return {
          isSuccess: false,
          isFailure: true,
          error: new Error(
            `File size exceeds maximum allowed size of 50MB. Got: ${(command.size / 1024 / 1024).toFixed(2)}MB`
          ),
        };
      }

      // Generate unique file path: chat/{chatId}/{uuid}.{extension}
      const ext = command.originalName.split('.').pop() || '';
      const uniqueId = randomUUID().slice(0, 8);
      const fileName = `chat/${command.chatId}/${Date.now()}-${uniqueId}${ext ? '.' + ext : ''}`;

      this.logger.log(
        `Uploading chat file: ${command.originalName} (${(command.size / 1024).toFixed(2)}KB) -> ${fileName} for chat ${command.chatId}`
      );

      // Upload to S3
      const uploadResult = await this.storageService.upload(
        command.file,
        fileName,
        command.mimeType,
        { originalName: command.originalName }
      );

      // Create file aggregate
      const file = FileAggregate.create(
        command.fileId,
        command.userId,
        fileName,
        command.originalName,
        command.mimeType,
        command.size,
        uploadResult.key,
        uploadResult.bucket,
        command.companyId
      );

      // Save aggregate (persists events + publishes file.uploaded to broker)
      await this.store.save(file);

      // Publish chat.file.uploaded event with chatId
      await this.messagePublisher.publish(
        EXCHANGES.EVENTS,
        {
          type: FILE_EVENT_TYPES.CHAT_FILE_UPLOADED,
          data: {
            fileId: command.fileId,
            chatId: command.chatId,
            userId: command.userId,
            fileName: fileName,
            originalName: command.originalName,
            mimeType: command.mimeType,
            size: command.size,
            url: uploadResult.url,
            companyId: command.companyId,
            uploadedAt: new Date().toISOString(),
          },
        },
        {
          routingKey: FILE_ROUTING_KEYS.CHAT_FILE_UPLOADED,
          messageId: `${command.fileId}-chat-uploaded`,
          correlationId: command.chatId,
        }
      );

      this.logger.log(
        `Chat file uploaded successfully: ${command.fileId} for chat ${command.chatId}`
      );

      return new Success({
        fileId: command.fileId,
        chatId: command.chatId,
        url: uploadResult.url,
      });
    } catch (error) {
      this.logger.error(`Failed to upload chat file: ${error}`);
      return { isSuccess: false, isFailure: true, error: error as Error };
    }
  }
}
