// Transport Type Reference Data Events

export enum TransportTypeEventType {
  Created = 'transport_type.created',
  Updated = 'transport_type.updated',
  Deleted = 'transport_type.deleted',
  Activated = 'transport_type.activated',
  Deactivated = 'transport_type.deactivated',
  TranslationAdded = 'transport_type.translation_added',
  TranslationUpdated = 'transport_type.translation_updated',
  TranslationDeleted = 'transport_type.translation_deleted',
}

export interface TransportTypeTranslationData {
  language: string;
  name: string;
  description?: string;
}

export interface TransportTypeCreatedEvent {
  type: TransportTypeEventType.Created;
  data: {
    isActive: boolean;
    translations: TransportTypeTranslationData[];
    createdAt: Date;
  };
}

export interface TransportTypeUpdatedEvent {
  type: TransportTypeEventType.Updated;
  data: {
    isActive?: boolean;
    updatedAt: Date;
  };
}

export interface TransportTypeDeletedEvent {
  type: TransportTypeEventType.Deleted;
  data: {
    deletedAt: Date;
  };
}

export interface TransportTypeActivatedEvent {
  type: TransportTypeEventType.Activated;
  data: {
    activatedAt: Date;
  };
}

export interface TransportTypeDeactivatedEvent {
  type: TransportTypeEventType.Deactivated;
  data: {
    deactivatedAt: Date;
  };
}

export interface TransportTypeTranslationAddedEvent {
  type: TransportTypeEventType.TranslationAdded;
  data: {
    translation: TransportTypeTranslationData;
    addedAt: Date;
  };
}

export interface TransportTypeTranslationUpdatedEvent {
  type: TransportTypeEventType.TranslationUpdated;
  data: {
    language: string;
    name?: string;
    description?: string;
    updatedAt: Date;
  };
}

export interface TransportTypeTranslationDeletedEvent {
  type: TransportTypeEventType.TranslationDeleted;
  data: {
    language: string;
    deletedAt: Date;
  };
}

export type TransportTypeEvent =
  | TransportTypeCreatedEvent
  | TransportTypeUpdatedEvent
  | TransportTypeDeletedEvent
  | TransportTypeActivatedEvent
  | TransportTypeDeactivatedEvent
  | TransportTypeTranslationAddedEvent
  | TransportTypeTranslationUpdatedEvent
  | TransportTypeTranslationDeletedEvent;
