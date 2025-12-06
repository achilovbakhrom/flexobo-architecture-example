import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  IFileReadModelRepository,
  FileReadModelDto,
  PaginationOptions,
  VersionedUpsertOptions,
} from '../../ports/file-read-model.port';

/**
 * Prisma File Read Model Repository
 *
 * Implements the file read model repository using Prisma.
 */
@Injectable()
export class PrismaFileReadModelRepository implements IFileReadModelRepository {
  private readonly logger = new Logger(PrismaFileReadModelRepository.name);

  constructor(@Inject('PrismaClient') private readonly prisma: any) {}

  async findById(fileId: string): Promise<FileReadModelDto | null> {
    const file = await this.prisma.fileReadModel.findUnique({
      where: { id: fileId },
    });

    if (!file) return null;

    return this.mapToDto(file);
  }

  async findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<FileReadModelDto[]> {
    const files = await this.prisma.fileReadModel.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: { uploadedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return files.map((f: any) => this.mapToDto(f));
  }

  async findByCompanyId(
    companyId: string,
    options?: PaginationOptions
  ): Promise<FileReadModelDto[]> {
    const files = await this.prisma.fileReadModel.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      orderBy: { uploadedAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return files.map((f: any) => this.mapToDto(f));
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.fileReadModel.count({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });
  }

  async getStorageStatsByUser(
    userId: string
  ): Promise<{ totalSize: number; fileCount: number }> {
    const result = await this.prisma.fileReadModel.aggregate({
      where: {
        userId,
        status: 'ACTIVE',
      },
      _sum: { size: true },
      _count: { id: true },
    });

    return {
      totalSize: Number(result._sum.size ?? 0),
      fileCount: result._count.id,
    };
  }

  async getStorageStatsByCompany(
    companyId: string
  ): Promise<{ totalSize: number; fileCount: number }> {
    const result = await this.prisma.fileReadModel.aggregate({
      where: {
        companyId,
        status: 'ACTIVE',
      },
      _sum: { size: true },
      _count: { id: true },
    });

    return {
      totalSize: Number(result._sum.size ?? 0),
      fileCount: result._count.id,
    };
  }

  async upsert(
    file: Omit<FileReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean> {
    // Check for idempotency
    if (options?.eventId) {
      const existing = await this.prisma.fileReadModel.findUnique({
        where: { id: file.id },
        select: { lastEventId: true },
      });

      if (existing?.lastEventId === options.eventId) {
        this.logger.debug(
          `Event ${options.eventId} already processed for file ${file.id}`
        );
        return false;
      }
    }

    await this.prisma.fileReadModel.upsert({
      where: { id: file.id },
      create: {
        id: file.id,
        userId: file.userId,
        companyId: file.companyId ?? null,
        fileName: file.fileName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: BigInt(file.size),
        s3Key: file.s3Key,
        s3Bucket: file.s3Bucket,
        status: file.status,
        uploadedAt: file.uploadedAt,
        version: options?.version ?? 1,
        lastEventId: options?.eventId ?? null,
      },
      update: {
        status: file.status,
        version: options?.version,
        lastEventId: options?.eventId ?? undefined,
        updatedAt: new Date(),
      },
    });

    return true;
  }

  async delete(fileId: string): Promise<void> {
    await this.prisma.fileReadModel
      .delete({
        where: { id: fileId },
      })
      .catch(() => {
        // Ignore if not found
      });
  }

  async getVersion(fileId: string): Promise<number> {
    const file = await this.prisma.fileReadModel.findUnique({
      where: { id: fileId },
      select: { version: true },
    });

    return file?.version ?? 0;
  }

  async isEventProcessed(fileId: string, eventId: string): Promise<boolean> {
    const file = await this.prisma.fileReadModel.findUnique({
      where: { id: fileId },
      select: { lastEventId: true },
    });

    return file?.lastEventId === eventId;
  }

  private mapToDto(file: any): FileReadModelDto {
    return {
      id: file.id,
      userId: file.userId,
      companyId: file.companyId,
      fileName: file.fileName,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: Number(file.size),
      s3Key: file.s3Key,
      s3Bucket: file.s3Bucket,
      status: file.status,
      version: file.version ?? 0,
      uploadedAt: file.uploadedAt,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
    };
  }
}
