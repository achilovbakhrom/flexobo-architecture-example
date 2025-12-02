import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * Upload File Request DTO
 */
export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload (max 50MB)' })
  file!: unknown; // Actual type is Express.Multer.File from controller

  @ApiPropertyOptional({ description: 'Optional company ID for organization' })
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Optional folder path (e.g., "documents", "images/avatars")' })
  @IsOptional()
  @IsString()
  folder?: string;
}

/**
 * Upload File Response DTO
 */
export class UploadFileResponseDto {
  @ApiProperty({ description: 'Created file ID', example: 'file-1234567890-abc123' })
  fileId!: string;

  @ApiProperty({ description: 'Public URL to access the file' })
  url!: string;
}

/**
 * Upload Chat File Request DTO
 */
export class UploadChatFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'File to upload (max 50MB)' })
  file!: unknown;

  @ApiProperty({ description: 'Chat room ID to associate the file with' })
  @IsString()
  chatId!: string;

  @ApiPropertyOptional({ description: 'Optional company ID for organization' })
  @IsOptional()
  @IsString()
  companyId?: string;
}

/**
 * Upload Chat File Response DTO
 */
export class UploadChatFileResponseDto {
  @ApiProperty({ description: 'Created file ID', example: 'file-1234567890-abc123' })
  fileId!: string;

  @ApiProperty({ description: 'Chat room ID', example: 'chat-room-uuid' })
  chatId!: string;

  @ApiProperty({ description: 'Public URL to access the file' })
  url!: string;
}

/**
 * File Response DTO
 */
export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id!: string;

  @ApiProperty({ description: 'User ID who uploaded the file' })
  userId!: string;

  @ApiPropertyOptional({ description: 'Company ID if associated' })
  companyId?: string | null;

  @ApiProperty({ description: 'Generated file name' })
  fileName!: string;

  @ApiProperty({ description: 'Original file name' })
  originalName!: string;

  @ApiProperty({ description: 'MIME type' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes' })
  size!: number;

  @ApiProperty({ description: 'File status', enum: ['ACTIVE', 'DELETED'] })
  status!: string;

  @ApiProperty({ description: 'Upload timestamp' })
  uploadedAt!: Date;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt!: Date;
}

/**
 * Files List Response DTO
 */
export class FilesListResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiProperty({ type: [FileResponseDto], description: 'List of files' })
  files!: FileResponseDto[];

  @ApiPropertyOptional({ description: 'Total count of files' })
  total?: number;
}

/**
 * Storage Stats Response DTO
 */
export class StorageStatsResponseDto {
  @ApiProperty({ description: 'User ID' })
  userId!: string;

  @ApiPropertyOptional({ description: 'Company ID if querying by company' })
  companyId?: string;

  @ApiProperty({ description: 'Total storage used in bytes' })
  totalSize!: number;

  @ApiProperty({ description: 'Number of files' })
  fileCount!: number;

  @ApiProperty({ description: 'Human-readable storage size', example: '15.5 MB' })
  formattedSize!: string;
}

/**
 * Download URL Response DTO
 */
export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'URL to download the file' })
  url!: string;
}

/**
 * Success Response DTO
 */
export class SuccessResponseDto {
  @ApiProperty({ description: 'Operation success status' })
  success!: boolean;
}
