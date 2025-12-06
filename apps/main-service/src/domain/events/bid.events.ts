export const BID_EVENT_TYPES = {
  CREATED: 'bid.created',
  COUNTERED: 'bid.countered',
  ACCEPTED: 'bid.accepted',
  REJECTED: 'bid.rejected',
  CANCELLED: 'bid.cancelled',
  EXPIRED: 'bid.expired',
} as const;

export interface BidCreatedEventData extends Record<string, unknown> {
  bidderId: string;
  ownerId: string;
  postType: 'LOAD' | 'TRIP';
  postId: string;
  transportIds: string[];
  proposedPrice: number;
  currency: string;
  chatRoomId?: string;
  expiresAt?: string;
}

export interface BidCounteredEventData extends Record<string, unknown> {
  userId: string;
  newPrice: number;
  currency: string;
  negotiationRound: number;
}

export interface BidAcceptedEventData extends Record<string, unknown> {
  userId: string;
  acceptedAt: string;
  finalPrice: number;
  currency: string;
}

export interface BidRejectedEventData extends Record<string, unknown> {
  userId: string;
  rejectedAt: string;
  reason?: string;
}

export interface BidCancelledEventData extends Record<string, unknown> {
  userId: string;
  cancelledAt: string;
  reason?: string;
}

export interface BidExpiredEventData extends Record<string, unknown> {
  expiredAt: string;
}
