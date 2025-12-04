export const LANGUAGE_REPOSITORY = Symbol('LANGUAGE_REPOSITORY');

export interface LanguageDto {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface LanguageFilters {
  search?: string;
  code?: string;
  isActive?: boolean;
  offset?: number;
  limit?: number;
}

export interface PaginatedLanguages {
  items: LanguageDto[];
  total: number;
  offset: number;
  limit: number;
}

export interface CreateLanguageInput {
  name: string;
  code: string;
  isActive?: boolean;
}

export interface UpdateLanguageInput {
  name?: string;
  code?: string;
  isActive?: boolean;
}

export interface ILanguageRepository {
  findAll(filters?: LanguageFilters): Promise<PaginatedLanguages>;
  findById(id: string): Promise<LanguageDto | null>;
  findByCode(code: string): Promise<LanguageDto | null>;
  create(data: CreateLanguageInput): Promise<LanguageDto>;
  update(id: string, data: UpdateLanguageInput): Promise<LanguageDto | null>;
  delete(id: string): Promise<LanguageDto | null>;
}
