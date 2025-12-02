/**
 * Event Type Constants for Main Service
 * Following the event sourcing pattern
 */

export const EVENT_TYPES = {
  LOAD: {
    CREATED: 'LoadCreated',
    UPDATED: 'LoadUpdated',
    STATUS_CHANGED: 'LoadStatusChanged',
    PRICE_UPDATED: 'LoadPriceUpdated',
    CARGO_ADDED: 'LoadCargoAdded',
    CARGO_UPDATED: 'LoadCargoUpdated',
    CARGO_REMOVED: 'LoadCargoRemoved',
    FEATURES_UPDATED: 'LoadFeaturesUpdated',
    DOCUMENT_ADDED: 'LoadDocumentAdded',
    DOCUMENT_REMOVED: 'LoadDocumentRemoved',
    ACTIVATED: 'LoadActivated',
    DEACTIVATED: 'LoadDeactivated',
    CANCELLED: 'LoadCancelled',
    COMPLETED: 'LoadCompleted',
    DELETED: 'LoadDeleted',
  },
  TRIP: {
    CREATED: 'TripCreated',
    UPDATED: 'TripUpdated',
    STATUS_CHANGED: 'TripStatusChanged',
    PRICE_UPDATED: 'TripPriceUpdated',
    TRANSPORT_UPDATED: 'TripTransportUpdated',
    DOCUMENT_ADDED: 'TripDocumentAdded',
    DOCUMENT_REMOVED: 'TripDocumentRemoved',
    ACTIVATED: 'TripActivated',
    DEACTIVATED: 'TripDeactivated',
    CANCELLED: 'TripCancelled',
    COMPLETED: 'TripCompleted',
    DELETED: 'TripDeleted',
  },
  TRANSPORT: {
    CREATED: 'TransportCreated',
    UPDATED: 'TransportUpdated',
    LOADING_TYPE_ADDED: 'TransportLoadingTypeAdded',
    LOADING_TYPE_REMOVED: 'TransportLoadingTypeRemoved',
    PERMIT_ADDED: 'TransportPermitAdded',
    PERMIT_REMOVED: 'TransportPermitRemoved',
    ADR_CLASS_ADDED: 'TransportAdrClassAdded',
    ADR_CLASS_REMOVED: 'TransportAdrClassRemoved',
    ACTIVATED: 'TransportActivated',
    DEACTIVATED: 'TransportDeactivated',
    DELETED: 'TransportDeleted',
  },
} as const;
