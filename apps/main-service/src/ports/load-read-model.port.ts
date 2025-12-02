import { LoadStatus, TruckLoadType } from '../domain/enums';

/**
 * Load Read Model DTO
 * Represents the denormalized view of a Load for queries
 */
export interface LoadReadModelDto {
  id: string;
  ownerId: string;
  companyId?: string;
  transportTypeId: string;
  fromLocationId: string;
  toLocationId: string;
  fromCountryCode: string;
  toCountryCode: string;
  distance?: number;
  tollDistance?: number;
  price?: number;
  basePrice: number;
  currencyId: string;
  loadingTypeId: string;
  unloadingTypeId: string;
  targetDate: Date;
  additionalExtraDay?: Date;
  status: LoadStatus;
  isActive: boolean;
  privateDate?: Date;
  truckLoadType: TruckLoadType;
  negotiable: boolean;
  paymentMethods: string[];
  paymentCondition: boolean;
  paymentDays: number;
  prePayment: number;
  pricePerKm: number;
  isPricePerKmExceed?: boolean;
  priceMode?: string;
  parentId?: string;
  images: string[];
  certificates: string[];
  otherDocs: string[];
  isSystemLoad: boolean;
  createdAt: Date;
  updatedAt: Date;
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
 * Port (Interface) for Load Read Model Repository
 * Handles querying Load read models (CQRS query side)
 */
export interface ILoadReadModelRepository {
  /**
   * Find a load by ID
   */
  findById(loadId: string): Promise<LoadReadModelDto | null>;

  /**
   * Find loads by owner ID
   */
  findByOwnerId(
    ownerId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<LoadReadModelDto[]>;

  /**
   * Find loads by company ID
   */
  findByCompanyId(
    companyId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<LoadReadModelDto[]>;

  /**
   * Find loads by status
   */
  findByStatus(
    status: LoadStatus,
    options?: { limit?: number; offset?: number }
  ): Promise<LoadReadModelDto[]>;

  /**
   * Find active loads
   */
  findActive(options?: { limit?: number; offset?: number }): Promise<LoadReadModelDto[]>;

  /**
   * Find loads by location (from or to)
   */
  findByLocation(
    locationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<LoadReadModelDto[]>;

  /**
   * Find loads by date range
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: { limit?: number; offset?: number }
  ): Promise<LoadReadModelDto[]>;

  /**
   * Upsert a load read model (used by projections)
   */
  upsert(
    load: Omit<LoadReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  /**
   * Delete a load read model
   */
  delete(loadId: string): Promise<void>;

  /**
   * Get the current version of a load read model
   */
  getVersion(loadId: string): Promise<number>;

  /**
   * Check if an event has already been processed
   */
  isEventProcessed(loadId: string, eventId: string): Promise<boolean>;
}

/**
 * Dependency Injection token for ILoadReadModelRepository
 */
export const LOAD_READ_MODEL_REPOSITORY = Symbol('ILoadReadModelRepository');
