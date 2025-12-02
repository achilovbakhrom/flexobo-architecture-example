import { LoadStatus } from '../domain/enums';

/**
 * Trip Read Model DTO
 * Represents the denormalized view of a Trip for queries
 */
export interface TripReadModelDto {
  id: string;
  ownerId: string;
  companyId?: string;
  transportTypeId: string;
  transportTypeFeature: string;
  transportLoadingFeature: string;
  loadingCapacity: number;
  capacity: number;
  capacityUnit: string;
  transportLength?: number;
  transportWidth?: number;
  transportHeight?: number;
  currencyId: string;
  distance?: number;
  tollDistance?: number;
  loadingPointId: string;
  unloadingPointId: string;
  fromLocationId: string;
  toLocationId: string;
  fromCountryCode: string;
  toCountryCode: string;
  loadingRadius: number;
  unloadingRadius: number;
  loadingReadyDate: Date;
  additionalLoadingReadyDate?: Date;
  price?: number;
  basePrice: number;
  paymentMethods: string[];
  note?: string;
  isNegotiable: boolean;
  isActive: boolean;
  privateDate?: Date;
  pricePerKm: number;
  isPricePerKmExceed?: boolean;
  priceMode?: string;
  status: LoadStatus;
  parentId?: string;
  images: string[];
  isSystemTrip: boolean;
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
 * Port (Interface) for Trip Read Model Repository
 * Handles querying Trip read models (CQRS query side)
 */
export interface ITripReadModelRepository {
  /**
   * Find a trip by ID
   */
  findById(tripId: string): Promise<TripReadModelDto | null>;

  /**
   * Find trips by owner ID
   */
  findByOwnerId(
    ownerId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TripReadModelDto[]>;

  /**
   * Find trips by company ID
   */
  findByCompanyId(
    companyId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TripReadModelDto[]>;

  /**
   * Find trips by status
   */
  findByStatus(
    status: LoadStatus,
    options?: { limit?: number; offset?: number }
  ): Promise<TripReadModelDto[]>;

  /**
   * Find active trips
   */
  findActive(options?: { limit?: number; offset?: number }): Promise<TripReadModelDto[]>;

  /**
   * Find trips by location (loading or unloading point)
   */
  findByLocation(
    locationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TripReadModelDto[]>;

  /**
   * Find trips by date range
   */
  findByDateRange(
    startDate: Date,
    endDate: Date,
    options?: { limit?: number; offset?: number }
  ): Promise<TripReadModelDto[]>;

  /**
   * Upsert a trip read model (used by projections)
   */
  upsert(
    trip: Omit<TripReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  /**
   * Delete a trip read model
   */
  delete(tripId: string): Promise<void>;

  /**
   * Get the current version of a trip read model
   */
  getVersion(tripId: string): Promise<number>;

  /**
   * Check if an event has already been processed
   */
  isEventProcessed(tripId: string, eventId: string): Promise<boolean>;
}

/**
 * Dependency Injection token for ITripReadModelRepository
 */
export const TRIP_READ_MODEL_REPOSITORY = Symbol('ITripReadModelRepository');
