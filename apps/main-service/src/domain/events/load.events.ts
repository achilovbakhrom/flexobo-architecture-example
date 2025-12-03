import {
  LoadStatus,
  TruckLoadType,
  PaymentMethod,
  PriceMode,
} from '../enums';
import { CargoItem, LoadFeatures, LoadDocument } from '../load.aggregate';

export enum LoadEventType {
  Created = 'load.created',
  Updated = 'load.updated',
  StatusChanged = 'load.status_changed',
  CargoAdded = 'load.cargo_added',
  CargoUpdated = 'load.cargo_updated',
  CargoRemoved = 'load.cargo_removed',
  FeaturesUpdated = 'load.features_updated',
  PriceUpdated = 'load.price_updated',
  LocationUpdated = 'load.location_updated',
  DocumentAdded = 'load.document_added',
  DocumentRemoved = 'load.document_removed',
  Activated = 'load.activated',
  Deactivated = 'load.deactivated',
  Deleted = 'load.deleted',
}

export interface LoadCreatedEvent {
  type: LoadEventType.Created;
  data: {
    ownerId: string;
    companyId?: string;
    transportTypeId: string;
    fromLocationId: string;
    toLocationId: string;
    fromCountryCode: string;
    toCountryCode: string;
    currencyId: string;
    loadingPointId: string;
    unloadingPointId: string;
    loadingReadyDate: Date;
    additionalLoadingReadyDate?: Date;
    truckLoadType?: TruckLoadType;
    paymentMethods?: PaymentMethod[];
    paymentCondition?: boolean;
    paymentDays?: number;
    prePayment?: number;
    price?: number;
    basePrice?: number;
    pricePerKm?: number;
    isPricePerKmExceed?: boolean;
    priceMode?: PriceMode;
    isNegotiable?: boolean;
    distance?: number;
    tollDistance?: number;
    privateDate?: Date;
    parentId?: string;
    isSystemLoad?: boolean;
    images?: string[];
    cargos?: CargoItem[];
    features?: LoadFeatures;
  };
}

export interface LoadUpdatedEvent {
  type: LoadEventType.Updated;
  data: {
    transportTypeId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromCountryCode?: string;
    toCountryCode?: string;
    loadingPointId?: string;
    unloadingPointId?: string;
    loadingReadyDate?: Date;
    additionalLoadingReadyDate?: Date;
    truckLoadType?: TruckLoadType;
    isNegotiable?: boolean;
    paymentMethods?: PaymentMethod[];
    paymentCondition?: boolean;
    paymentDays?: number;
    prePayment?: number;
    distance?: number;
    tollDistance?: number;
    images?: string[];
    updatedAt: Date;
  };
}

export interface LoadStatusChangedEvent {
  type: LoadEventType.StatusChanged;
  data: {
    status: LoadStatus;
    changedAt: Date;
  };
}

export interface LoadCargoAddedEvent {
  type: LoadEventType.CargoAdded;
  data: {
    cargo: CargoItem;
    addedAt: Date;
  };
}

export interface LoadCargoUpdatedEvent {
  type: LoadEventType.CargoUpdated;
  data: {
    cargoId: string;
    updates: Partial<CargoItem>;
    updatedAt: Date;
  };
}

export interface LoadCargoRemovedEvent {
  type: LoadEventType.CargoRemoved;
  data: {
    cargoId: string;
    removedAt: Date;
  };
}

export interface LoadFeaturesUpdatedEvent {
  type: LoadEventType.FeaturesUpdated;
  data: {
    features: LoadFeatures;
    updatedAt: Date;
  };
}

export interface LoadPriceUpdatedEvent {
  type: LoadEventType.PriceUpdated;
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

export interface LoadLocationUpdatedEvent {
  type: LoadEventType.LocationUpdated;
  data: {
    loadingPointId?: string;
    unloadingPointId?: string;
    fromLocationId?: string;
    toLocationId?: string;
    fromCountryCode?: string;
    toCountryCode?: string;
    loadingRadius?: number;
    unloadingRadius?: number;
    loadingReadyDate?: Date;
    additionalLoadingReadyDate?: Date;
    updatedAt: Date;
  };
}

export interface LoadDocumentAddedEvent {
  type: LoadEventType.DocumentAdded;
  data: {
    document: LoadDocument;
    addedAt: Date;
  };
}

export interface LoadDocumentRemovedEvent {
  type: LoadEventType.DocumentRemoved;
  data: {
    documentId: string;
    removedAt: Date;
  };
}

export interface LoadActivatedEvent {
  type: LoadEventType.Activated;
  data: {
    activatedAt: Date;
  };
}

export interface LoadDeactivatedEvent {
  type: LoadEventType.Deactivated;
  data: {
    deactivatedAt: Date;
  };
}

export interface LoadDeletedEvent {
  type: LoadEventType.Deleted;
  data: {
    deletedAt: Date;
  };
}

export type LoadEvent =
  | LoadCreatedEvent
  | LoadUpdatedEvent
  | LoadStatusChangedEvent
  | LoadCargoAddedEvent
  | LoadCargoUpdatedEvent
  | LoadCargoRemovedEvent
  | LoadFeaturesUpdatedEvent
  | LoadPriceUpdatedEvent
  | LoadLocationUpdatedEvent
  | LoadDocumentAddedEvent
  | LoadDocumentRemovedEvent
  | LoadActivatedEvent
  | LoadDeactivatedEvent
  | LoadDeletedEvent;
