import { AggregateRoot, DomainEvent } from '@flexobo/core';
import {
  BID_EVENT_TYPES,
  BidCreatedEventData,
  BidCounteredEventData,
  BidAcceptedEventData,
  BidRejectedEventData,
  BidCancelledEventData,
  BidExpiredEventData,
} from '../events/bid.events';
import { BidStatus, PostType } from '../constants/enums';

export interface BidState {
  bidderId: string;
  ownerId: string;
  postType: PostType;
  postId: string;
  transportIds: string[];
  proposedPrice: number;
  currency: string;
  status: BidStatus;
  negotiationRound: number;
  chatRoomId?: string;
  expiresAt?: string;
  acceptedAt?: string;
  finalPrice?: number;
}

export class Bid extends AggregateRoot {
  private bidderId!: string;
  private ownerId!: string;
  private postType!: PostType;
  private postId!: string;
  private transportIds: string[] = [];
  private proposedPrice!: number;
  private currency: string = 'USD';
  private status: BidStatus = BidStatus.PENDING;
  private negotiationRound: number = 1;
  private chatRoomId?: string;
  private expiresAt?: string;
  private acceptedAt?: string;
  private finalPrice?: number;

  static create(bidId: string, data: BidCreatedEventData): Bid {
    const bid = new Bid(bidId);

    const event = bid.createEvent(BID_EVENT_TYPES.CREATED, data);
    bid.addEvent(event);
    bid.apply(event);

    return bid;
  }

  static fromEvents(events: DomainEvent[]): Bid {
    if (events.length === 0) {
      throw new Error('Cannot create Bid from empty events');
    }
    const bid = new Bid(events[0].aggregateId);
    bid.loadFromHistory(events);
    return bid;
  }

  setChatRoomId(chatRoomId: string): void {
    this.chatRoomId = chatRoomId;
  }

  counter(userId: string, newPrice: number, currency: string): void {
    this.validateCanNegotiate(userId);

    const event = this.createEvent<
      typeof BID_EVENT_TYPES.COUNTERED,
      BidCounteredEventData
    >(BID_EVENT_TYPES.COUNTERED, {
      userId,
      newPrice,
      currency,
      negotiationRound: this.negotiationRound + 1,
    });
    this.addEvent(event);
    this.apply(event);
  }

  accept(userId: string): void {
    this.validateCanAccept(userId);

    const event = this.createEvent<
      typeof BID_EVENT_TYPES.ACCEPTED,
      BidAcceptedEventData
    >(BID_EVENT_TYPES.ACCEPTED, {
      userId,
      acceptedAt: new Date().toISOString(),
      finalPrice: this.proposedPrice,
      currency: this.currency,
    });
    this.addEvent(event);
    this.apply(event);
  }

  reject(userId: string, reason?: string): void {
    this.validateCanReject(userId);

    const event = this.createEvent<
      typeof BID_EVENT_TYPES.REJECTED,
      BidRejectedEventData
    >(BID_EVENT_TYPES.REJECTED, {
      userId,
      rejectedAt: new Date().toISOString(),
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  cancel(userId: string, reason?: string): void {
    if (
      this.status === BidStatus.ACCEPTED ||
      this.status === BidStatus.REJECTED ||
      this.status === BidStatus.CANCELLED
    ) {
      throw new Error('Cannot cancel bid in current status');
    }

    // Only bidder can cancel their own bid
    if (userId !== this.bidderId) {
      throw new Error('Only the bidder can cancel this bid');
    }

    const event = this.createEvent<
      typeof BID_EVENT_TYPES.CANCELLED,
      BidCancelledEventData
    >(BID_EVENT_TYPES.CANCELLED, {
      userId,
      cancelledAt: new Date().toISOString(),
      reason,
    });
    this.addEvent(event);
    this.apply(event);
  }

  expire(): void {
    if (this.status !== BidStatus.PENDING && this.status !== BidStatus.COUNTERED) {
      throw new Error('Cannot expire bid in current status');
    }

    const event = this.createEvent<
      typeof BID_EVENT_TYPES.EXPIRED,
      BidExpiredEventData
    >(BID_EVENT_TYPES.EXPIRED, {
      expiredAt: new Date().toISOString(),
    });
    this.addEvent(event);
    this.apply(event);
  }

  private validateCanNegotiate(userId: string): void {
    if (this.status !== BidStatus.PENDING && this.status !== BidStatus.COUNTERED) {
      throw new Error('Cannot counter bid in current status');
    }

    // Determine whose turn it is to counter
    // Odd rounds: owner's turn, Even rounds: bidder's turn
    const isOwnerTurn = this.negotiationRound % 2 === 1;

    if (isOwnerTurn && userId !== this.ownerId) {
      throw new Error("It's the owner's turn to respond");
    }

    if (!isOwnerTurn && userId !== this.bidderId) {
      throw new Error("It's the bidder's turn to respond");
    }
  }

  private validateCanAccept(userId: string): void {
    if (this.status !== BidStatus.PENDING && this.status !== BidStatus.COUNTERED) {
      throw new Error('Cannot accept bid in current status');
    }

    // Only the other party can accept
    const isOwnerTurn = this.negotiationRound % 2 === 1;

    if (isOwnerTurn && userId !== this.ownerId) {
      throw new Error('Only the owner can accept at this stage');
    }

    if (!isOwnerTurn && userId !== this.bidderId) {
      throw new Error('Only the bidder can accept at this stage');
    }
  }

  private validateCanReject(userId: string): void {
    if (this.status !== BidStatus.PENDING && this.status !== BidStatus.COUNTERED) {
      throw new Error('Cannot reject bid in current status');
    }

    // Only owner can reject
    if (userId !== this.ownerId) {
      throw new Error('Only the owner can reject the bid');
    }
  }

  getState(): BidState {
    return {
      bidderId: this.bidderId,
      ownerId: this.ownerId,
      postType: this.postType,
      postId: this.postId,
      transportIds: [...this.transportIds],
      proposedPrice: this.proposedPrice,
      currency: this.currency,
      status: this.status,
      negotiationRound: this.negotiationRound,
      chatRoomId: this.chatRoomId,
      expiresAt: this.expiresAt,
      acceptedAt: this.acceptedAt,
      finalPrice: this.finalPrice,
    };
  }

  getDetails() {
    return {
      id: this.id,
      ...this.getState(),
      version: this.version,
    };
  }

  protected apply(event: DomainEvent): void {
    switch (event.type) {
      case BID_EVENT_TYPES.CREATED:
        this.applyCreated(event.data as BidCreatedEventData);
        break;
      case BID_EVENT_TYPES.COUNTERED:
        this.applyCountered(event.data as BidCounteredEventData);
        break;
      case BID_EVENT_TYPES.ACCEPTED:
        this.applyAccepted(event.data as BidAcceptedEventData);
        break;
      case BID_EVENT_TYPES.REJECTED:
        this.applyRejected();
        break;
      case BID_EVENT_TYPES.CANCELLED:
        this.applyCancelled();
        break;
      case BID_EVENT_TYPES.EXPIRED:
        this.applyExpired();
        break;
    }
  }

  private applyCreated(data: BidCreatedEventData): void {
    this.bidderId = data.bidderId;
    this.ownerId = data.ownerId;
    this.postType = data.postType as PostType;
    this.postId = data.postId;
    this.transportIds = data.transportIds;
    this.proposedPrice = data.proposedPrice;
    this.currency = data.currency;
    this.chatRoomId = data.chatRoomId;
    this.expiresAt = data.expiresAt;
    this.status = BidStatus.PENDING;
    this.negotiationRound = 1;
  }

  private applyCountered(data: BidCounteredEventData): void {
    this.proposedPrice = data.newPrice;
    this.currency = data.currency;
    this.negotiationRound = data.negotiationRound;
    this.status = BidStatus.COUNTERED;
  }

  private applyAccepted(data: BidAcceptedEventData): void {
    this.status = BidStatus.ACCEPTED;
    this.acceptedAt = data.acceptedAt;
    this.finalPrice = data.finalPrice;
  }

  private applyRejected(): void {
    this.status = BidStatus.REJECTED;
  }

  private applyCancelled(): void {
    this.status = BidStatus.CANCELLED;
  }

  private applyExpired(): void {
    this.status = BidStatus.EXPIRED;
  }
}
