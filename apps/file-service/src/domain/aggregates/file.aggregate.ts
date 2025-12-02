import { AggregateRoot, DomainEvent } from '@flexobo/core';
import { FILE_EVENT_TYPES } from '../events/event.constants';

/**
 * File status enum
 */
export enum FileStatus {
  ACTIVE = 'ACTIVE',
  DELETED = 'DELETED',
}

/**
 * File metadata interface for additional file information
 */
export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Snapshot data interface for File aggregate
 */
export interface FileSnapshotData {
  _id: string;
  userId: string;
  companyId?: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  status: FileStatus;
  uploadedAt: string;
  metadata?: FileMetadata;
}

/**
 * File Aggregate Root
 *
 * Represents a file entity with event sourcing.
 * Tracks file uploads and deletions.
 */
export class FileAggregate extends AggregateRoot {
  private userId!: string;
  private companyId?: string;
  private fileName!: string;
  private originalName!: string;
  private mimeType!: string;
  private size!: number;
  private s3Key!: string;
  private s3Bucket!: string;
  private status: FileStatus = FileStatus.ACTIVE;
  private uploadedAt!: Date;
  private metadata?: FileMetadata;

  /**
   * Create a new file aggregate
   */
  static create(
    fileId: string,
    userId: string,
    fileName: string,
    originalName: string,
    mimeType: string,
    size: number,
    s3Key: string,
    s3Bucket: string,
    companyId?: string,
    metadata?: FileMetadata
  ): FileAggregate {
    const file = new FileAggregate(fileId);

    const event = file.createEvent(FILE_EVENT_TYPES.UPLOADED, {
      userId,
      companyId,
      fileName,
      originalName,
      mimeType,
      size,
      s3Key,
      s3Bucket,
      uploadedAt: new Date().toISOString(),
      metadata,
    });

    file.addEvent(event);
    file.apply(event);

    return file;
  }

  /**
   * Reconstruct aggregate from events
   */
  static fromEvents(events: DomainEvent[]): FileAggregate {
    const file = new FileAggregate(events[0].aggregateId);
    file.loadFromHistory(events);
    return file;
  }

  /**
   * Restore aggregate from snapshot and subsequent events
   */
  static fromSnapshot(
    snapshotData: FileSnapshotData,
    snapshotVersion: number,
    subsequentEvents: DomainEvent[]
  ): FileAggregate {
    const file = new FileAggregate(snapshotData._id);

    // Restore state from snapshot
    file.userId = snapshotData.userId;
    file.companyId = snapshotData.companyId;
    file.fileName = snapshotData.fileName;
    file.originalName = snapshotData.originalName;
    file.mimeType = snapshotData.mimeType;
    file.size = snapshotData.size;
    file.s3Key = snapshotData.s3Key;
    file.s3Bucket = snapshotData.s3Bucket;
    file.status = snapshotData.status;
    file.uploadedAt = new Date(snapshotData.uploadedAt);
    file.metadata = snapshotData.metadata;
    file._version = snapshotVersion;

    // Apply subsequent events
    if (subsequentEvents.length > 0) {
      file.loadFromHistory(subsequentEvents);
    }

    return file;
  }

  /**
   * Mark file as deleted
   */
  delete(): void {
    if (this.status === FileStatus.DELETED) {
      throw new Error('File is already deleted');
    }

    const event = this.createEvent(FILE_EVENT_TYPES.DELETED, {
      s3Key: this.s3Key,
      s3Bucket: this.s3Bucket,
      deletedAt: new Date().toISOString(),
    });

    this.addEvent(event);
    this.apply(event);
  }

  /**
   * Get file details for read model
   */
  getDetails() {
    return {
      id: this.id,
      userId: this.userId,
      companyId: this.companyId,
      fileName: this.fileName,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      s3Key: this.s3Key,
      s3Bucket: this.s3Bucket,
      status: this.status,
      uploadedAt: this.uploadedAt,
      metadata: this.metadata,
      version: this.version,
    };
  }

  /**
   * Get S3 key for the file
   */
  getS3Key(): string {
    return this.s3Key;
  }

  /**
   * Get user ID who uploaded the file
   */
  getUserId(): string {
    return this.userId;
  }

  /**
   * Check if file is active
   */
  isActive(): boolean {
    return this.status === FileStatus.ACTIVE;
  }

  /**
   * Create snapshot data
   */
  toSnapshot(): FileSnapshotData {
    return {
      _id: this.id,
      userId: this.userId,
      companyId: this.companyId,
      fileName: this.fileName,
      originalName: this.originalName,
      mimeType: this.mimeType,
      size: this.size,
      s3Key: this.s3Key,
      s3Bucket: this.s3Bucket,
      status: this.status,
      uploadedAt: this.uploadedAt.toISOString(),
      metadata: this.metadata,
    };
  }

  /**
   * Apply domain event to update aggregate state
   */
  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case FILE_EVENT_TYPES.UPLOADED:
        this.userId = event.data['userId'] as string;
        this.companyId = event.data['companyId'] as string | undefined;
        this.fileName = event.data['fileName'] as string;
        this.originalName = event.data['originalName'] as string;
        this.mimeType = event.data['mimeType'] as string;
        this.size = event.data['size'] as number;
        this.s3Key = event.data['s3Key'] as string;
        this.s3Bucket = event.data['s3Bucket'] as string;
        this.uploadedAt = new Date(event.data['uploadedAt'] as string);
        this.metadata = event.data['metadata'] as FileMetadata | undefined;
        this.status = FileStatus.ACTIVE;
        break;

      case FILE_EVENT_TYPES.DELETED:
        this.status = FileStatus.DELETED;
        break;

      default:
        break;
    }
  }
}
