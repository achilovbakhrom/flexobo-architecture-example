import { Multer } from 'multer';

// ============================================================
// File Upload DTO
// ============================================================

export interface FileUploadDto {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploaderId: string;
  createdAt: Date;
}

// ============================================================
// Multer File Type
// ============================================================

export type MulterFile = Express.Multer.File;

// ============================================================
// File Storage Service Port
// ============================================================

export interface IFileStorageService {
  upload(file: MulterFile, uploaderId: string): Promise<FileUploadDto>;
  getUrl(fileId: string): Promise<string | null>;
  getFile(fileId: string): Promise<FileUploadDto | null>;
  delete(fileId: string): Promise<void>;
}

export const FILE_STORAGE_SERVICE = Symbol('IFileStorageService');

// ============================================================
// File Repository Port
// ============================================================

export interface IFileRepository {
  findById(id: string): Promise<FileUploadDto | null>;
  create(file: Omit<FileUploadDto, 'createdAt'>): Promise<FileUploadDto>;
  delete(id: string): Promise<void>;
}

export const FILE_REPOSITORY = Symbol('IFileRepository');
