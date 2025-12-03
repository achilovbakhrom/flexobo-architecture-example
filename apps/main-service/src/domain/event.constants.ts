
import { LoadEventType } from './events/load.events';
import { TransportEventType } from './events/transport.events';
import { TripEventType } from './events/trip.events';
import { TransportTypeEventType } from './events/transport-type.events';

/**
 * Re-exported event mapping for external consumers (projections, handlers, etc.)
 * Mirrors the structure used in users-service to keep a consistent API surface.
 */
export const EVENT_TYPES = {
  LOAD: {
    CREATED: LoadEventType.Created,
    UPDATED: LoadEventType.Updated,
    STATUS_CHANGED: LoadEventType.StatusChanged,
    PRICE_UPDATED: LoadEventType.PriceUpdated,
    CARGO_ADDED: LoadEventType.CargoAdded,
    CARGO_UPDATED: LoadEventType.CargoUpdated,
    CARGO_REMOVED: LoadEventType.CargoRemoved,
    FEATURES_UPDATED: LoadEventType.FeaturesUpdated,
    LOCATION_UPDATED: LoadEventType.LocationUpdated,
    DOCUMENT_ADDED: LoadEventType.DocumentAdded,
    DOCUMENT_REMOVED: LoadEventType.DocumentRemoved,
    ACTIVATED: LoadEventType.Activated,
    DEACTIVATED: LoadEventType.Deactivated,
    DELETED: LoadEventType.Deleted,
  },
  TRIP: {
    CREATED: TripEventType.Created,
    UPDATED: TripEventType.Updated,
    STATUS_CHANGED: TripEventType.StatusChanged,
    PRICE_UPDATED: TripEventType.PriceUpdated,
    TRANSPORT_UPDATED: TripEventType.TransportUpdated,
    DOCUMENT_ADDED: TripEventType.DocumentAdded,
    DOCUMENT_REMOVED: TripEventType.DocumentRemoved,
    ACTIVATED: TripEventType.Activated,
    DEACTIVATED: TripEventType.Deactivated,
    CANCELLED: TripEventType.Cancelled,
    COMPLETED: TripEventType.Completed,
    DELETED: TripEventType.Deleted,
  },
  TRANSPORT: {
    CREATED: TransportEventType.Created,
    UPDATED: TransportEventType.Updated,
    LOADING_TYPE_ADDED: TransportEventType.LoadingTypeAdded,
    LOADING_TYPE_REMOVED: TransportEventType.LoadingTypeRemoved,
    PERMIT_ADDED: TransportEventType.PermitAdded,
    PERMIT_REMOVED: TransportEventType.PermitRemoved,
    ADR_CLASS_ADDED: TransportEventType.AdrClassAdded,
    ADR_CLASS_REMOVED: TransportEventType.AdrClassRemoved,
    ACTIVATED: TransportEventType.Activated,
    DEACTIVATED: TransportEventType.Deactivated,
    DELETED: TransportEventType.Deleted,
  },
  TRANSPORT_TYPE: {
    CREATED: TransportTypeEventType.Created,
    UPDATED: TransportTypeEventType.Updated,
    ACTIVATED: TransportTypeEventType.Activated,
    DEACTIVATED: TransportTypeEventType.Deactivated,
    DELETED: TransportTypeEventType.Deleted,
    TRANSLATION_ADDED: TransportTypeEventType.TranslationAdded,
    TRANSLATION_UPDATED: TransportTypeEventType.TranslationUpdated,
    TRANSLATION_DELETED: TransportTypeEventType.TranslationDeleted,
  },
} as const;

// Routing Keys for RabbitMQ
export const ROUTING_KEYS = {
  LOAD: {
    ALL: 'load.*',
  },
  TRIP: {
    ALL: 'trip.*',
  },
  TRANSPORT: {
    ALL: 'transport.*',
  },
  TRANSPORT_TYPE: {
    ALL: 'transport.type.*',
  },
} as const;

// Queue Names
export const QUEUES = {
  LOAD: {
    PROJECTION: 'load.projection.queue',
  },
  TRIP: {
    PROJECTION: 'trip.projection.queue',
  },
  TRANSPORT: {
    PROJECTION: 'transport.projection.queue',
  },
  TRANSPORT_TYPE: {
    PROJECTION: 'transport_type.projection.queue',
  },
} as const;
