export const TRIP_EVENT_TYPES = {
  CREATED: 'trip.created',
  UPDATED: 'trip.updated',
  STATUS_CHANGED: 'trip.status_changed',
  DELETED: 'trip.deleted',
} as const;

export interface RoutePointData {
  country: string;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  date: string;
  radius?: number;
}

export interface TransportSnapshotData {
  id: string;
  type: string;
  capacity: number;
  dimensions?: {
    lengthM?: number;
    widthM?: number;
    heightM?: number;
  };
  loadingTypes: string[];
  features: string[];
  permits: string[];
}

export interface TripCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  companyId: string;
  transport: TransportSnapshotData;
  loadingPoints: RoutePointData[];
  unloadingPoints: RoutePointData[];
  price?: number;
  currency: string;
  paymentTerms?: string;
  boardIds: string[];
  isPublic: boolean;
}

export interface TripUpdatedEventData extends Record<string, unknown> {
  transport?: TransportSnapshotData;
  loadingPoints?: RoutePointData[];
  unloadingPoints?: RoutePointData[];
  price?: number;
  currency?: string;
  paymentTerms?: string;
  boardIds?: string[];
  isPublic?: boolean;
}

export interface TripStatusChangedEventData extends Record<string, unknown> {
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
}

export interface TripDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
  deletedBy: string;
}
