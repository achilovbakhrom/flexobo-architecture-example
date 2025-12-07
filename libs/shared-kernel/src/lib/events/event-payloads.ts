export enum BidPostType {
  LOAD = 'LOAD',
  TRANSPORT = 'TRANSPORT',
}

export enum BidAction {
  COUNTER = 'counter',
  ACCEPT = 'accept',
  REJECT = 'reject',
}

export enum BidStatus {
  PENDING = 'PENDING',
  NEGOTIATION = 'NEGOTIATION',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum LoadStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_NEGOTIATION = 'IN_NEGOTIATION',
  BOOKED = 'BOOKED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface BidCreatedPayload {
  bidId: string;
  bidderId: string;
  ownerId: string;
  loadId?: string;
  transportIds?: string[];
  price: number;
  currency: string;
  postType: BidPostType;
  chatRoomId: string;
  companyId?: string;
  createdAt: string;
}

export interface BidUpdatedPayload {
  bidId: string;
  action: BidAction;
  price?: number;
  currency?: string;
  userId: string;
  chatRoomId: string;
  previousPrice?: number;
  previousStatus?: BidStatus;
  newStatus?: BidStatus;
  comment?: string;
  updatedAt: string;
}

export interface BidCancelledPayload {
  bidId: string;
  cancelledBy: string;
  chatRoomId: string;
  reason?: string;
  cancelledAt: string;
}

export interface BidExpiredPayload {
  bidId: string;
  chatRoomId: string;
  expiredAt: string;
}

export interface LoadCreatedPayload {
  loadId: string;
  ownerId: string;
  companyId?: string;
  title?: string;
  description?: string;
  origin: {
    city: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  destination: {
    city: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  cargoType?: string;
  priceMode?: string;
  price?: number;
  currency?: string;
  pickupDate?: string;
  deliveryDate?: string;
  createdAt: string;
}

export interface LoadUpdatedPayload {
  loadId: string;
  updatedBy: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}

export interface LoadDeletedPayload {
  loadId: string;
  deletedBy: string;
  deletedAt: string;
}

export interface LoadStatusChangedPayload {
  loadId: string;
  previousStatus: LoadStatus;
  newStatus: LoadStatus;
  changedBy: string;
  chatRoomId?: string;
  changedAt: string;
}

export interface TransportCreatedPayload {
  transportId: string;
  ownerId: string;
  companyId?: string;
  type: string;
  capacity?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  registrationNumber?: string;
  availableFrom?: string;
  availableTo?: string;
  createdAt: string;
}

export interface TransportUpdatedPayload {
  transportId: string;
  updatedBy: string;
  changes: Record<string, unknown>;
  updatedAt: string;
}

export interface TransportDeletedPayload {
  transportId: string;
  deletedBy: string;
  deletedAt: string;
}

export interface BookingCreatedPayload {
  bookingId: string;
  bidId: string;
  loadId?: string;
  transportId?: string;
  shipperId: string;
  carrierId: string;
  price: number;
  currency: string;
  chatRoomId: string;
  scheduledPickup?: string;
  scheduledDelivery?: string;
  createdAt: string;
}

export interface BookingStatusChangedPayload {
  bookingId: string;
  previousStatus: BookingStatus;
  newStatus: BookingStatus;
  chatRoomId: string;
  changedBy: string;
  changedAt: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  cancelledBy: string;
  chatRoomId: string;
  reason?: string;
  cancelledAt: string;
}

export interface BookingCompletedPayload {
  bookingId: string;
  chatRoomId: string;
  completedAt: string;
}

export interface ChatFileUploadedPayload {
  fileId: string;
  chatId: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  companyId?: string;
  uploadedAt: string;
}

export interface DomainEventPayload<T = unknown> {
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  occurredAt: string;
  data: T;
  metadata?: Record<string, unknown>;
}

// ============ NOTIFICATION PAYLOADS ============

export type OtpType = 'REGISTRATION' | 'LOGIN' | 'RESET_PASSWORD';

/**
 * Payload for sending OTP via SMS
 */
export interface SendOtpSmsPayload {
  to: string;
  code: string;
  expiresInMinutes: number;
  type: OtpType;
}

/**
 * Payload for sending OTP via Email
 */
export interface SendOtpEmailPayload {
  to: {
    email: string;
    name?: string;
  };
  code: string;
  expiresInMinutes: number;
  type: OtpType;
}

/**
 * Payload for sending a generic email
 */
export interface SendEmailPayload {
  to: {
    email: string;
    name?: string;
  } | Array<{ email: string; name?: string }>;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Payload for sending a generic SMS
 */
export interface SendSmsPayload {
  to: string | string[];
  message: string;
}
