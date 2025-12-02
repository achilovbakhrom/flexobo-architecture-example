/**
 * Transport Read Model DTO
 * Represents the denormalized view of a Transport for queries
 */
export interface TransportReadModelDto {
  id: string;
  ownerId: string;
  name?: string;
  transportTypeId: string;
  transportTypeFeature: string;
  transportLoadingFeature: string;
  loadingCapacity: number;
  capacity: number;
  capacityUnit: string;
  transportLength?: number;
  transportWidth?: number;
  transportHeight?: number;
  isActive: boolean;
  currencyId?: string;
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
 * Port (Interface) for Transport Read Model Repository
 * Handles querying Transport read models (CQRS query side)
 */
export interface ITransportReadModelRepository {
  /**
   * Find a transport by ID
   */
  findById(transportId: string): Promise<TransportReadModelDto | null>;

  /**
   * Find transports by owner ID
   */
  findByOwnerId(
    ownerId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportReadModelDto[]>;

  /**
   * Find active transports
   */
  findActive(
    ownerId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportReadModelDto[]>;

  /**
   * Find transports by transport type
   */
  findByTransportType(
    transportTypeId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<TransportReadModelDto[]>;

  /**
   * Upsert a transport read model (used by projections)
   */
  upsert(
    transport: Omit<TransportReadModelDto, 'createdAt'>,
    options?: VersionedUpsertOptions
  ): Promise<boolean>;

  /**
   * Delete a transport read model
   */
  delete(transportId: string): Promise<void>;

  /**
   * Get the current version of a transport read model
   */
  getVersion(transportId: string): Promise<number>;

  /**
   * Check if an event has already been processed
   */
  isEventProcessed(transportId: string, eventId: string): Promise<boolean>;
}

/**
 * Dependency Injection token for ITransportReadModelRepository
 */
export const TRANSPORT_READ_MODEL_REPOSITORY = Symbol(
  'ITransportReadModelRepository'
);
