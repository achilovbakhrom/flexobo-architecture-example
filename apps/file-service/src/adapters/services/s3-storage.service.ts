import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService, UploadResult } from '../../ports/storage.port';

/**
 * S3 Storage Service
 *
 * Implements file storage operations using AWS S3.
 * Supports LocalStack for local development.
 */
@Injectable()
export class S3StorageService implements IStorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;

  constructor(private readonly configService: ConfigService) {
    this.bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'flexobo-files'
    );
    this.region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.endpoint = this.configService.get<string>('AWS_S3_ENDPOINT');

    const accessKeyId = this.configService.get<string>(
      'AWS_ACCESS_KEY_ID',
      ''
    );
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
      ''
    );

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      ...(this.endpoint && {
        endpoint: this.endpoint,
        forcePathStyle: true, // Required for LocalStack
      }),
    });

    this.logger.log(
      `S3 Storage initialized - Bucket: ${this.bucket}, Region: ${this.region}${this.endpoint ? ', Endpoint: ' + this.endpoint : ''}`
    );
  }

  /**
   * Upload a file to S3
   */
  async upload(
    file: Buffer,
    fileName: string,
    mimeType: string,
    metadata?: Record<string, string>
  ): Promise<UploadResult> {
    const key = `uploads/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
      Metadata: metadata,
      ACL: 'public-read', // Files are public
    });

    try {
      const result = await this.s3Client.send(command);

      this.logger.debug(`File uploaded to S3: ${key}`);

      return {
        key,
        bucket: this.bucket,
        url: this.getPublicUrl(key),
        etag: result.ETag,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error}`);
      throw error;
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      await this.s3Client.send(command);
      this.logger.debug(`File deleted from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file from S3: ${error}`);
      throw error;
    }
  }

  /**
   * Get a presigned URL for downloading a file
   */
  async getPresignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    try {
      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error}`);
      throw error;
    }
  }

  /**
   * Get the public URL for a file
   */
  getPublicUrl(key: string): string {
    if (this.endpoint) {
      // LocalStack or MinIO
      return `${this.endpoint}/${this.bucket}/${key}`;
    }
    // AWS S3
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
