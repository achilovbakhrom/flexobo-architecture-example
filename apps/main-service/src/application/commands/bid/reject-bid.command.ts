import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBidAggregateStore,
  BID_AGGREGATE_STORE,
} from '../../../ports/bid.repository';

export class RejectBidCommand implements ICommand {
  constructor(
    public readonly bidId: string,
    public readonly userId: string
  ) {}
}

@Injectable()
@CommandHandler(RejectBidCommand)
export class RejectBidHandler implements ICommandHandler<RejectBidCommand> {
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IBidAggregateStore
  ) {}

  async execute(command: RejectBidCommand): Promise<void> {
    const bid = await this.bidStore.load(command.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${command.bidId} not found`);
    }

    // Either bidder or owner can reject
    const bidState = bid.getState();
    if (
      bidState.bidderId !== command.userId &&
      bidState.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only bid participants can reject');
    }

    bid.reject(command.userId);

    await this.bidStore.save(bid);
  }
}
