/**
 * File Read Model DTO (re-export from ports)
 */
export { FileReadModelDto } from '../../ports/file-read-model.port';

/**
 * Storage statistics DTO
 */
export interface StorageStatsDto {
  userId: string;
  companyId?: string;
  totalSize: number;
  fileCount: number;
  formattedSize: string;
}

/**
 * File upload response DTO
 */
export interface FileUploadResponseDto {
  fileId: string;
  url: string;
}

/**
 * Chat file upload response DTO
 */
export interface ChatFileUploadResponseDto {
  fileId: string;
  chatId: string;
  url: string;
}

/**
 * File list response DTO
 */
export interface FileListResponseDto {
  userId: string;
  files: import('../../ports/file-read-model.port').FileReadModelDto[];
  total?: number;
}

/**
 * Download URL response DTO
 */
export interface DownloadUrlResponseDto {
  url: string;
}
