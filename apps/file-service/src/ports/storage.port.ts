/**
 * Upload result returned by storage service
 */
export interface UploadResult {
  /** The S3 key where the file is stored */
  key: string;
  /** The S3 bucket name */
  bucket: string;
  /** Public URL to access the file */
  url: string;
  /** ETag from S3 (optional) */
  etag?: string;
}

/**
 * Storage Service Port
 *
 * Interface for file storage operations (S3 or other providers).
 */
export interface IStorageService {
  /**
   * Upload a file to storage
   * @param file The file buffer
   * @param fileName The file name (path within bucket)
   * @param mimeType The file MIME type
   * @param metadata Optional metadata to store with the file
   * @returns Upload result with key, bucket, and URL
   */
  upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult>;

  /**
   * Delete a file from storage
   * @param key The S3 key to delete
   */
  delete(key: string): Promise<void>;

  /**
   * Get a presigned URL for downloading a file
   * @param key The S3 key
   * @param expiresInSeconds How long the URL is valid (default 1 hour)
   * @returns The presigned download URL
   */
  getPresignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Get the public URL for a file
   * @param key The S3 key
   * @returns The public URL
   */
  getPublicUrl(key: string): string;
}

export const STORAGE_SERVICE = Symbol('IStorageService');
