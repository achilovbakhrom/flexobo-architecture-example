import {
  CapacityUnit,
  TransportLoadingFeature,
  TransportTypeFeature,
} from '../enums';

export enum TransportEventType {
  Created = 'transport.created',
  Updated = 'transport.updated',
  LoadingTypeAdded = 'transport.loading_type_added',
  LoadingTypeRemoved = 'transport.loading_type_removed',
  PermitAdded = 'transport.permit_added',
  PermitRemoved = 'transport.permit_removed',
  AdrClassAdded = 'transport.adr_class_added',
  AdrClassRemoved = 'transport.adr_class_removed',
  Activated = 'transport.activated',
  Deactivated = 'transport.deactivated',
  Deleted = 'transport.deleted',
}

export interface TransportCreatedEvent {
  type: TransportEventType.Created;
  data: {
    ownerId: string;
    name?: string;
    transportTypeId: string;
    transportTypeFeature: TransportTypeFeature;
    transportLoadingFeature: TransportLoadingFeature;
    loadingCapacity: number;
    capacity: number;
    capacityUnit: CapacityUnit;
    transportLength?: number;
    transportWidth?: number;
    transportHeight?: number;
    currencyId?: string;
    loadingTypeIds?: string[];
    permitIds?: string[];
    adrClassIds?: string[];
  };
}

export interface TransportUpdatedEvent {
  type: TransportEventType.Updated;
  data: {
    name?: string;
    transportTypeId?: string;
    transportTypeFeature?: TransportTypeFeature;
    transportLoadingFeature?: TransportLoadingFeature;
    loadingCapacity?: number;
    capacity?: number;
    capacityUnit?: CapacityUnit;
    transportLength?: number;
    transportWidth?: number;
    transportHeight?: number;
    currencyId?: string;
    updatedAt: Date;
  };
}

export interface TransportLoadingTypeAddedEvent {
  type: TransportEventType.LoadingTypeAdded;
  data: {
    loadingTypeId: string;
    addedAt: Date;
  };
}

export interface TransportLoadingTypeRemovedEvent {
  type: TransportEventType.LoadingTypeRemoved;
  data: {
    loadingTypeId: string;
    removedAt: Date;
  };
}

export interface TransportPermitAddedEvent {
  type: TransportEventType.PermitAdded;
  data: {
    permitId: string;
    addedAt: Date;
  };
}

export interface TransportPermitRemovedEvent {
  type: TransportEventType.PermitRemoved;
  data: {
    permitId: string;
    removedAt: Date;
  };
}

export interface TransportAdrClassAddedEvent {
  type: TransportEventType.AdrClassAdded;
  data: {
    adrClassId: string;
    addedAt: Date;
  };
}

export interface TransportAdrClassRemovedEvent {
  type: TransportEventType.AdrClassRemoved;
  data: {
    adrClassId: string;
    removedAt: Date;
  };
}

export interface TransportActivatedEvent {
  type: TransportEventType.Activated;
  data: {
    activatedAt: Date;
  };
}

export interface TransportDeactivatedEvent {
  type: TransportEventType.Deactivated;
  data: {
    deactivatedAt: Date;
  };
}

export interface TransportDeletedEvent {
  type: TransportEventType.Deleted;
  data: {
    deletedAt: Date;
  };
}

export type TransportEvent =
  | TransportCreatedEvent
  | TransportUpdatedEvent
  | TransportLoadingTypeAddedEvent
  | TransportLoadingTypeRemovedEvent
  | TransportPermitAddedEvent
  | TransportPermitRemovedEvent
  | TransportAdrClassAddedEvent
  | TransportAdrClassRemovedEvent
  | TransportActivatedEvent
  | TransportDeactivatedEvent
  | TransportDeletedEvent;
