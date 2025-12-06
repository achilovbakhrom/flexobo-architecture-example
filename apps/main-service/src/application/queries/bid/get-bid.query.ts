import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';
import {
  IBidReadRepository,
  BidReadDto,
  NegotiationStepReadDto,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';

export class GetBidQuery implements IQuery {
  constructor(public readonly bidId: string) {}
}

export interface GetBidResult {
  bid: BidReadDto;
  negotiationHistory: NegotiationStepReadDto[];
}

@Injectable()
@QueryHandler(GetBidQuery)
export class GetBidHandler implements IQueryHandler<GetBidQuery> {
  constructor(
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository
  ) {}

  async execute(query: GetBidQuery): Promise<GetBidResult> {
    const bid = await this.bidRepo.findById(query.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${query.bidId} not found`);
    }

    const negotiationHistory = await this.bidRepo.findNegotiationSteps(
      query.bidId
    );

    return { bid, negotiationHistory };
  }
}
