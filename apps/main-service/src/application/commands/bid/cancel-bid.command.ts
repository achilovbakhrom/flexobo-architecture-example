import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBidAggregateStore,
  BID_AGGREGATE_STORE,
} from '../../../ports/bid.repository';

export class CancelBidCommand implements ICommand {
  constructor(
    public readonly bidId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(CancelBidCommand)
export class CancelBidHandler implements ICommandHandler<CancelBidCommand> {
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IBidAggregateStore
  ) {}

  async execute(command: CancelBidCommand): Promise<void> {
    const bid = await this.bidStore.load(command.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${command.bidId} not found`);
    }

    // Only the bidder can cancel their bid
    const bidState = bid.getState();
    if (bidState.bidderId !== command.userId) {
      throw new ForbiddenException('Only the bidder can cancel the bid');
    }

    bid.cancel(command.userId);

    await this.bidStore.save(bid);
  }
}
