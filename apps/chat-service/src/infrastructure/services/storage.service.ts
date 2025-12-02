import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma.service';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadMetadata {
  originalName: string;
  mimeType: string;
  size: number;
  uploaderId: string;
}

export interface UploadResult {
  fileId: string;
  fileUrl: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly storageType: string;
  private readonly localPath: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {
    this.storageType = this.configService.get('storage.type', 'local');
    this.localPath = this.configService.get('storage.localPath', './uploads');

    // Ensure upload directory exists
    if (this.storageType === 'local') {
      this.ensureUploadDirectory();
    }
  }

  async upload(buffer: Buffer, metadata: UploadMetadata): Promise<UploadResult> {
    const fileId = uuidv4();
    const extension = path.extname(metadata.originalName);
    const fileName = `${fileId}${extension}`;

    if (this.storageType === 'local') {
      return this.uploadLocal(buffer, fileName, metadata, fileId);
    } else {
      // S3 upload can be implemented here
      throw new Error('S3 storage not implemented yet');
    }
  }

  async getUrl(fileId: string): Promise<string> {
    const file = await this.prisma.fileUpload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (this.storageType === 'local') {
      // Return relative URL for local storage
      return `/uploads/${path.basename(file.storagePath)}`;
    }

    // For S3, generate presigned URL
    throw new Error('S3 storage not implemented yet');
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.prisma.fileUpload.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return;
    }

    if (this.storageType === 'local') {
      try {
        fs.unlinkSync(file.storagePath);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(`Failed to delete file: ${message}`);
      }
    }

    await this.prisma.fileUpload.delete({ where: { id: fileId } });
  }

  private async uploadLocal(
    buffer: Buffer,
    fileName: string,
    metadata: UploadMetadata,
    fileId: string
  ): Promise<UploadResult> {
    const filePath = path.join(this.localPath, fileName);

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Save to database
    await this.prisma.fileUpload.create({
      data: {
        id: fileId,
        originalName: metadata.originalName,
        mimeType: metadata.mimeType,
        size: metadata.size,
        storagePath: filePath,
        uploaderId: metadata.uploaderId,
      },
    });

    return {
      fileId,
      fileUrl: `/uploads/${fileName}`,
    };
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.localPath)) {
      fs.mkdirSync(this.localPath, { recursive: true });
      this.logger.log(`Created upload directory: ${this.localPath}`);
    }
  }
}
