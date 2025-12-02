import { QueryHandler, IQueryHandler } from '@flexobo/core';
import { Inject, NotFoundException } from '@nestjs/common';
import {
  IFileReadModelRepository,
  FILE_READ_MODEL_REPOSITORY,
  FileReadModelDto,
} from '../../ports/file-read-model.port';
import { IStorageService, STORAGE_SERVICE } from '../../ports/storage.port';
import {
  StorageStatsDto,
  FileListResponseDto,
  DownloadUrlResponseDto,
} from '../dto/file.dto';
import {
  GetFileByIdQuery,
  GetFilesByUserQuery,
  GetFilesByCompanyQuery,
  GetStorageStatsQuery,
  GetDownloadUrlQuery,
} from './file.queries';

/**
 * Get File By ID Query Handler
 */
@QueryHandler(GetFileByIdQuery)
export class GetFileByIdHandler implements IQueryHandler<GetFileByIdQuery> {
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository
  ) {}

  async execute(query: GetFileByIdQuery): Promise<FileReadModelDto | null> {
    return this.repository.findById(query.fileId);
  }
}

/**
 * Get Files By User Query Handler
 */
@QueryHandler(GetFilesByUserQuery)
export class GetFilesByUserHandler
  implements IQueryHandler<GetFilesByUserQuery>
{
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository
  ) {}

  async execute(query: GetFilesByUserQuery): Promise<FileListResponseDto> {
    const [files, total] = await Promise.all([
      this.repository.findByUserId(query.userId, {
        limit: query.limit,
        offset: query.offset,
      }),
      this.repository.countByUserId(query.userId),
    ]);

    return {
      userId: query.userId,
      files,
      total,
    };
  }
}

/**
 * Get Files By Company Query Handler
 */
@QueryHandler(GetFilesByCompanyQuery)
export class GetFilesByCompanyHandler
  implements IQueryHandler<GetFilesByCompanyQuery>
{
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository
  ) {}

  async execute(query: GetFilesByCompanyQuery): Promise<FileListResponseDto> {
    const files = await this.repository.findByCompanyId(query.companyId, {
      limit: query.limit,
      offset: query.offset,
    });

    return {
      userId: query.companyId,
      files,
    };
  }
}

/**
 * Get Storage Stats Query Handler
 */
@QueryHandler(GetStorageStatsQuery)
export class GetStorageStatsHandler
  implements IQueryHandler<GetStorageStatsQuery>
{
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository
  ) {}

  async execute(query: GetStorageStatsQuery): Promise<StorageStatsDto> {
    const stats = query.companyId
      ? await this.repository.getStorageStatsByCompany(query.companyId)
      : await this.repository.getStorageStatsByUser(query.userId);

    return {
      userId: query.userId,
      companyId: query.companyId,
      ...stats,
      formattedSize: this.formatBytes(stats.totalSize),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Get Download URL Query Handler
 */
@QueryHandler(GetDownloadUrlQuery)
export class GetDownloadUrlHandler
  implements IQueryHandler<GetDownloadUrlQuery>
{
  constructor(
    @Inject(FILE_READ_MODEL_REPOSITORY)
    private readonly repository: IFileReadModelRepository,
    @Inject(STORAGE_SERVICE)
    private readonly storageService: IStorageService
  ) {}

  async execute(query: GetDownloadUrlQuery): Promise<DownloadUrlResponseDto> {
    const file = await this.repository.findById(query.fileId);

    if (!file) {
      throw new NotFoundException(`File ${query.fileId} not found`);
    }

    // Files are public, return public URL
    const url = this.storageService.getPublicUrl(file.s3Key);

    return { url };
  }
}
