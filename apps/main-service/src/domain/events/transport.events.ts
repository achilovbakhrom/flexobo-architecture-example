export const TRANSPORT_EVENT_TYPES = {
  CREATED: 'transport.created',
  UPDATED: 'transport.updated',
  DELETED: 'transport.deleted',
} as const;

export interface TransportCreatedEventData extends Record<string, unknown> {
  ownerId: string;
  companyId: string;
  transportType: string;
  loadingTypes: string[];
  capacityTons: number;
  capacityM3?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  features: string[];
  adrClasses: string[];
  permits: string[];
}

export interface TransportUpdatedEventData extends Record<string, unknown> {
  transportType?: string;
  loadingTypes?: string[];
  capacityTons?: number;
  capacityM3?: number;
  lengthM?: number;
  widthM?: number;
  heightM?: number;
  features?: string[];
  adrClasses?: string[];
  permits?: string[];
  isActive?: boolean;
}

export interface TransportDeletedEventData extends Record<string, unknown> {
  deletedAt: string;
}
