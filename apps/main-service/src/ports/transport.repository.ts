export const TRANSPORT_AGGREGATE_STORE = Symbol('TRANSPORT_AGGREGATE_STORE');
export const TRANSPORT_READ_REPOSITORY = Symbol('TRANSPORT_READ_REPOSITORY');

export interface TransportReadDto {
  id: string;
  ownerId: string;
  companyId: string;
  transportType: string;
  loadingTypes: string[];
  capacityTons: number;
  capacityM3?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  features: string[];
  adrClasses: string[];
  permits: string[];
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransportFilters {
  transportType?: string;
  isActive?: boolean;
  offset?: number;
  limit?: number;
}

export interface ITransportReadRepository {
  findById(id: string): Promise<TransportReadDto | null>;
  findByOwner(
    ownerId: string,
    filters?: TransportFilters
  ): Promise<TransportReadDto[]>;
  findByIds(ids: string[]): Promise<TransportReadDto[]>;
  countByOwner(ownerId: string, filters?: TransportFilters): Promise<number>;
  save(transport: TransportReadDto): Promise<void>;
  delete(id: string): Promise<void>;
}
