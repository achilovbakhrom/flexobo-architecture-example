import { IAggregateStore } from '@flexobo/core';
import { Bid } from '../domain/aggregates/bid.aggregate';

export const BID_AGGREGATE_STORE = Symbol('BID_AGGREGATE_STORE');
export const BID_READ_REPOSITORY = Symbol('BID_READ_REPOSITORY');

export type IBidAggregateStore = IAggregateStore<Bid>;

export interface BidReadDto {
  id: string;
  bidderId: string;
  ownerId: string;
  postType: string;
  postId: string;
  transportIds: string[];
  proposedPrice: number;
  currency: string;
  status: string;
  negotiationRound: number;
  chatRoomId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface NegotiationStepReadDto {
  id: string;
  bidId: string;
  authorId: string;
  stepNumber: number;
  priceOffer: number;
  currency: string;
  isAccepted: boolean;
  isRejected: boolean;
  createdAt: Date;
}

export interface BidFilters {
  status?: string;
  offset?: number;
  limit?: number;
}

export interface IBidReadRepository {
  findById(id: string): Promise<BidReadDto | null>;
  findByPost(postType: string, postId: string, filters?: BidFilters): Promise<BidReadDto[]>;
  findByBidder(bidderId: string, filters?: BidFilters): Promise<BidReadDto[]>;
  findByOwner(ownerId: string, filters?: BidFilters): Promise<BidReadDto[]>;
  countByPost(postType: string, postId: string, filters?: BidFilters): Promise<number>;
  countByBidder(bidderId: string, filters?: BidFilters): Promise<number>;
  countByOwner(ownerId: string, filters?: BidFilters): Promise<number>;
  save(bid: BidReadDto): Promise<void>;
  delete(id: string): Promise<void>;
  findNegotiationSteps(bidId: string): Promise<NegotiationStepReadDto[]>;
  saveNegotiationStep(step: NegotiationStepReadDto): Promise<void>;
}
