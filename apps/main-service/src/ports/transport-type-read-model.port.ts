import { VersionedUpsertOptions } from './common.port';

export interface TransportTypeReadModelDto {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  translations: TransportTypeTranslationDto[];
}

export interface TransportTypeTranslationDto {
  id: string;
  transportTypeId: string;
  language: string;
  name: string;
  description?: string;
}

export interface ITransportTypeReadModelRepository {
  findById(
    transportTypeId: string,
    language?: string
  ): Promise<TransportTypeReadModelDto | null>;

  findAll(
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]>;

  findActive(
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]>;

  search(
    searchTerm: string,
    language?: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportTypeReadModelDto[]>;

  upsert(
    transportType: Omit<TransportTypeReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  softDelete(transportTypeId: string): Promise<boolean>;

  delete(transportTypeId: string): Promise<boolean>;

  getVersion(transportTypeId: string): Promise<number>;

  isEventProcessed(transportTypeId: string, eventId: string): Promise<boolean>;

  count(filter?: { isActive?: boolean }): Promise<number>;

  upsertTranslation(
    transportTypeId: string,
    translation: {
      language: string;
      name: string;
      description?: string;
    }
  ): Promise<boolean>;

  deleteTranslation(
    transportTypeId: string,
    language: string
  ): Promise<boolean>;

  getTranslation(
    transportTypeId: string,
    language: string
  ): Promise<TransportTypeTranslationDto | null>;
} 

export const TRANSPORT_TYPE_READ_MODEL_REPOSITORY = Symbol(
  'ITransportTypeReadModelRepository'
);
