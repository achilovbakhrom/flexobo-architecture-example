import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ICommand,
  ICommandHandler,
  CommandHandler,
  IAggregateStore,
  Result,
  Success,
  Failure,
} from '@flexobo/core';
import { Bid } from '../../../domain/aggregates/bid.aggregate';
import { BID_AGGREGATE_STORE } from '../../../ports/bid.repository';

export class CancelBidCommand implements ICommand {
  constructor(public readonly bidId: string, public readonly userId: string) {}
}

@Injectable()
@CommandHandler(CancelBidCommand)
export class CancelBidHandler
  implements ICommandHandler<CancelBidCommand, void>
{
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IAggregateStore<Bid>
  ) {}

  async execute(command: CancelBidCommand): Promise<Result<void, Error>> {
    try {
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

      return new Success(undefined);
    } catch (error) {
      return new Failure(
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
