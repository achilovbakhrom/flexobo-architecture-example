/**
 * File Read Model DTO
 *
 * Represents a file in the read model (query side).
 */
export interface FileReadModelDto {
  id: string;
  userId: string;
  companyId?: string | null;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  s3Key: string;
  s3Bucket: string;
  status: string;
  version: number;
  uploadedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

/**
 * Options for versioned upsert operations
 */
export interface VersionedUpsertOptions {
  eventId?: string;
  expectedVersion?: number;
  version?: number;
}

/**
 * File Read Model Repository Port
 *
 * Interface for querying file read models.
 */
export interface IFileReadModelRepository {
  /**
   * Find a file by ID
   */
  findById(fileId: string): Promise<FileReadModelDto | null>;

  /**
   * Find files by user ID
   */
  findByUserId(
    userId: string,
    options?: PaginationOptions
  ): Promise<FileReadModelDto[]>;

  /**
   * Find files by company ID
   */
  findByCompanyId(
    companyId: string,
    options?: PaginationOptions
  ): Promise<FileReadModelDto[]>;

  /**
   * Count files by user ID
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * Get storage statistics for a user
   */
  getStorageStatsByUser(
    userId: string
  ): Promise<{ totalSize: number; fileCount: number }>;

  /**
   * Get storage statistics for a company
   */
  getStorageStatsByCompany(
    companyId: string
  ): Promise<{ totalSize: number; fileCount: number }>;

  /**
   * Upsert a file read model (for projections)
   */
  upsert(
    file: Omit<FileReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  /**
   * Delete a file read model
   */
  delete(fileId: string): Promise<void>;

  /**
   * Get the current version of a file
   */
  getVersion(fileId: string): Promise<number>;

  /**
   * Check if an event has already been processed
   */
  isEventProcessed(fileId: string, eventId: string): Promise<boolean>;
}

export const FILE_READ_MODEL_REPOSITORY = Symbol('IFileReadModelRepository');
