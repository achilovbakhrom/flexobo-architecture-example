import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import {
  IBidAggregateStore,
  BID_AGGREGATE_STORE,
} from '../../../ports/bid.repository';

export class CounterBidCommand implements ICommand {
  constructor(
    public readonly bidId: string,
    public readonly userId: string,
    public readonly newPrice: number
  ) {}
}

@Injectable()
@CommandHandler(CounterBidCommand)
export class CounterBidHandler implements ICommandHandler<CounterBidCommand> {
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IBidAggregateStore
  ) {}

  async execute(command: CounterBidCommand): Promise<void> {
    const bid = await this.bidStore.load(command.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${command.bidId} not found`);
    }

    // Either bidder or owner can counter
    const bidState = bid.getState();
    if (
      bidState.bidderId !== command.userId &&
      bidState.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only bid participants can counter');
    }

    bid.counter(command.userId, command.newPrice, bidState.currency);

    await this.bidStore.save(bid);
  }
}
