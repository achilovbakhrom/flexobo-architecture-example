import { Injectable, Inject } from '@nestjs/common';
import { IFileRepository, FileUploadDto } from '../../ports/file-storage.port';

interface FilePrismaClient {
  fileUpload: {
    findUnique: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaFileRepository implements IFileRepository {
  constructor(@Inject('PrismaClient') private readonly prisma: FilePrismaClient) {}

  async findById(id: string): Promise<FileUploadDto | null> {
    const file = await this.prisma.fileUpload.findUnique({
      where: { id },
    });

    return file ? this.mapToDto(file) : null;
  }

  async create(file: Omit<FileUploadDto, 'createdAt'>): Promise<FileUploadDto> {
    const created = await this.prisma.fileUpload.create({
      data: {
        id: file.id,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        storagePath: file.storagePath,
        uploaderId: file.uploaderId,
      },
    });

    return this.mapToDto(created);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.fileUpload.delete({
      where: { id },
    });
  }

  private mapToDto(file: any): FileUploadDto {
    return {
      id: file.id,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      storagePath: file.storagePath,
      uploaderId: file.uploaderId,
      createdAt: file.createdAt,
    };
  }
}
