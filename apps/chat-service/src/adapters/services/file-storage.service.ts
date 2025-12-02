import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import {
  IFileStorageService,
  IFileRepository,
  FILE_REPOSITORY,
  FileUploadDto,
} from '../../ports/file-storage.port';

@Injectable()
export class FileStorageService implements IFileStorageService {
  private readonly logger = new Logger(FileStorageService.name);
  private readonly storageType: string;
  private readonly localPath: string;

  constructor(
    @Inject(FILE_REPOSITORY)
    private readonly fileRepository: IFileRepository,
    private readonly configService: ConfigService
  ) {
    this.storageType = this.configService.get('storage.type', 'local');
    this.localPath = this.configService.get('storage.localPath', './uploads');

    // Ensure upload directory exists
    if (this.storageType === 'local') {
      this.ensureUploadDirectory();
    }
  }

  async upload(file: Express.Multer.File, uploaderId: string): Promise<FileUploadDto> {
    const fileId = uuidv4();
    const extension = path.extname(file.originalname);
    const fileName = `${fileId}${extension}`;

    if (this.storageType === 'local') {
      return this.uploadLocal(file.buffer, fileName, file, fileId, uploaderId);
    } else {
      // S3 upload can be implemented here
      throw new Error('S3 storage not implemented yet');
    }
  }

  async getUrl(fileId: string): Promise<string | null> {
    const file = await this.fileRepository.findById(fileId);

    if (!file) {
      return null;
    }

    if (this.storageType === 'local') {
      // Return relative URL for local storage
      return `/uploads/${path.basename(file.storagePath)}`;
    }

    // For S3, generate presigned URL
    throw new Error('S3 storage not implemented yet');
  }

  async getFile(fileId: string): Promise<FileUploadDto | null> {
    return this.fileRepository.findById(fileId);
  }

  async delete(fileId: string): Promise<void> {
    const file = await this.fileRepository.findById(fileId);

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

    await this.fileRepository.delete(fileId);
  }

  private async uploadLocal(
    buffer: Buffer,
    fileName: string,
    file: Express.Multer.File,
    fileId: string,
    uploaderId: string
  ): Promise<FileUploadDto> {
    const filePath = path.join(this.localPath, fileName);

    // Write file
    fs.writeFileSync(filePath, buffer);

    // Save to database
    return this.fileRepository.create({
      id: fileId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: filePath,
      uploaderId,
    });
  }

  private ensureUploadDirectory(): void {
    if (!fs.existsSync(this.localPath)) {
      fs.mkdirSync(this.localPath, { recursive: true });
      this.logger.log(`Created upload directory: ${this.localPath}`);
    }
  }
}
