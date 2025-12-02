import { ICommand } from '@flexobo/core';

/**
 * Upload File Command
 *
 * Command to upload a file to S3 storage.
 */
export class UploadFileCommand implements ICommand {
  constructor(
    /** Unique file ID */
    public readonly fileId: string,
    /** User ID who is uploading */
    public readonly userId: string,
    /** File buffer data */
    public readonly file: Buffer,
    /** Original file name */
    public readonly originalName: string,
    /** MIME type */
    public readonly mimeType: string,
    /** File size in bytes */
    public readonly size: number,
    /** Optional company ID for organization */
    public readonly companyId?: string,
    /** Optional folder path (e.g., 'documents', 'images/avatars') */
    public readonly folder?: string
  ) {}
}

/**
 * Delete File Command
 *
 * Command to delete a file from storage.
 */
export class DeleteFileCommand implements ICommand {
  constructor(
    /** File ID to delete */
    public readonly fileId: string,
    /** User ID requesting deletion (for ownership check) */
    public readonly userId: string
  ) {}
}

/**
 * Upload Chat File Command
 *
 * Command to upload a file for chat and publish event with chatId.
 */
export class UploadChatFileCommand implements ICommand {
  constructor(
    /** Unique file ID */
    public readonly fileId: string,
    /** User ID who is uploading */
    public readonly userId: string,
    /** Chat room ID to associate with */
    public readonly chatId: string,
    /** File buffer data */
    public readonly file: Buffer,
    /** Original file name */
    public readonly originalName: string,
    /** MIME type */
    public readonly mimeType: string,
    /** File size in bytes */
    public readonly size: number,
    /** Optional company ID for organization */
    public readonly companyId?: string
  ) {}
}
