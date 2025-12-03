import { LoadStatus, PriceMode, PaymentMethod } from '../enums';
import { TripTransportDetails, TripDocument } from '../trip.aggregate';

export enum TripEventType {
  Created = 'trip.created',
  Updated = 'trip.updated',
  StatusChanged = 'trip.status_changed',
  PriceUpdated = 'trip.price_updated',
  TransportUpdated = 'trip.transport_updated',
  DocumentAdded = 'trip.document_added',
  DocumentRemoved = 'trip.document_removed',
  Activated = 'trip.activated',
  Deactivated = 'trip.deactivated',
  Cancelled = 'trip.cancelled',
  Completed = 'trip.completed',
  Deleted = 'trip.deleted',
}

export interface TripCreatedEvent {
  type: TripEventType.Created;
  data: {
    ownerId: string;
    companyId?: string;
    transportDetails: TripTransportDetails;
    currencyId: string;
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
    basePrice?: number;
    pricePerKm?: number;
    isPricePerKmExceed?: boolean;
    priceMode?: PriceMode;
    paymentMethods?: PaymentMethod[];
    note?: string;
    isNegotiable?: boolean;
    distance?: number;
    tollDistance?: number;
    privateDate?: Date;
    parentId?: string;
    isSystemTrip?: boolean;
    images?: string[];
  };
}

export interface TripUpdatedEvent {
  type: TripEventType.Updated;
  data: {
    fromLocationId?: string;
    toLocationId?: string;
    fromCountryCode?: string;
    toCountryCode?: string;
    loadingPointId?: string;
    unloadingPointId?: string;
    loadingRadius?: number;
    unloadingRadius?: number;
    loadingReadyDate?: Date;
    additionalLoadingReadyDate?: Date;
    paymentMethods?: PaymentMethod[];
    isNegotiable?: boolean;
    note?: string;
    distance?: number;
    tollDistance?: number;
    images?: string[];
    updatedAt: Date;
  };
}

export interface TripTransportUpdatedEvent {
  type: TripEventType.TransportUpdated;
  data: {
    transportDetails: Partial<TripTransportDetails>;
    updatedAt: Date;
  };
}

export interface TripStatusChangedEvent {
  type: TripEventType.StatusChanged;
  data: {
    status: LoadStatus;
    changedAt: Date;
  };
}

export interface TripPriceUpdatedEvent {
  type: TripEventType.PriceUpdated;
  data: {
    price?: number;
    basePrice?: number;
    pricePerKm?: number;
    isPricePerKmExceed?: boolean;
    priceMode?: PriceMode;
    paymentMethods?: PaymentMethod[];
    updatedAt: Date;
  };
}

export interface TripDocumentAddedEvent {
  type: TripEventType.DocumentAdded;
  data: {
    document: TripDocument;
    addedAt: Date;
  };
}

export interface TripDocumentRemovedEvent {
  type: TripEventType.DocumentRemoved;
  data: {
    documentId: string;
    removedAt: Date;
  };
}

export interface TripActivatedEvent {
  type: TripEventType.Activated;
  data: {
    activatedAt: Date;
  };
}

export interface TripDeactivatedEvent {
  type: TripEventType.Deactivated;
  data: {
    deactivatedAt: Date;
  };
}

export interface TripCancelledEvent {
  type: TripEventType.Cancelled;
  data: {
    cancelledAt: Date;
  };
}

export interface TripCompletedEvent {
  type: TripEventType.Completed;
  data: {
    completedAt: Date;
  };
}

export interface TripDeletedEvent {
  type: TripEventType.Deleted;
  data: {
    deletedAt: Date;
  };
}

export type TripEvent =
  | TripCreatedEvent
  | TripUpdatedEvent
  | TripTransportUpdatedEvent
  | TripStatusChangedEvent
  | TripPriceUpdatedEvent
  | TripDocumentAddedEvent
  | TripDocumentRemovedEvent
  | TripActivatedEvent
  | TripDeactivatedEvent
  | TripCancelledEvent
  | TripCompletedEvent
  | TripDeletedEvent;
