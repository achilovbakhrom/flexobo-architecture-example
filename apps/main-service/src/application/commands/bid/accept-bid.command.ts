import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from '../../../domain/aggregates/booking.aggregate';
import { Load } from '../../../domain/aggregates/load.aggregate';
import { Trip } from '../../../domain/aggregates/trip.aggregate';
import { PostType } from '../../../domain/constants/enums';
import {
  IBidAggregateStore,
  BID_AGGREGATE_STORE,
  IBidReadRepository,
  BID_READ_REPOSITORY,
} from '../../../ports/bid.repository';
import {
  IBookingAggregateStore,
  BOOKING_AGGREGATE_STORE,
} from '../../../ports/booking.repository';
import {
  ILoadAggregateStore,
  LOAD_AGGREGATE_STORE,
} from '../../../ports/load.repository';
import {
  ITripAggregateStore,
  TRIP_AGGREGATE_STORE,
} from '../../../ports/trip.repository';

export class AcceptBidCommand implements ICommand {
  constructor(
    public readonly bidId: string,
    public readonly userId: string
  ) {}
}

export interface AcceptBidResult {
  bookingId: string;
}

@Injectable()
@CommandHandler(AcceptBidCommand)
export class AcceptBidHandler implements ICommandHandler<AcceptBidCommand> {
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IBidAggregateStore,
    @Inject(BID_READ_REPOSITORY)
    private readonly bidRepo: IBidReadRepository,
    @Inject(BOOKING_AGGREGATE_STORE)
    private readonly bookingStore: IBookingAggregateStore,
    @Inject(LOAD_AGGREGATE_STORE)
    private readonly loadStore: ILoadAggregateStore,
    @Inject(TRIP_AGGREGATE_STORE)
    private readonly tripStore: ITripAggregateStore
  ) {}

  async execute(command: AcceptBidCommand): Promise<AcceptBidResult> {
    const bid = await this.bidStore.load(command.bidId);
    if (!bid) {
      throw new NotFoundException(`Bid ${command.bidId} not found`);
    }

    // Either bidder or owner can accept
    const bidState = bid.getState();
    if (
      bidState.bidderId !== command.userId &&
      bidState.ownerId !== command.userId
    ) {
      throw new ForbiddenException('Only bid participants can accept');
    }

    // Accept the bid
    bid.accept(command.userId);
    await this.bidStore.save(bid);

    // Get bid details for booking creation
    const bidDetails = await this.bidRepo.findById(command.bidId);
    if (!bidDetails) {
      throw new NotFoundException(`Bid ${command.bidId} not found`);
    }

    // Create booking
    const bookingId = uuidv4();
    const booking = Booking.createFromBid(bookingId, {
      customerId: bidDetails.bidderId, // customer (the one who made the bid)
      ownerId: bidDetails.ownerId, // owner of the post
      postType: bidDetails.postType as PostType,
      postId: bidDetails.postId,
      bidId: command.bidId,
      finalPrice: bidDetails.proposedPrice,
      currency: bidDetails.currency,
    });
    await this.bookingStore.save(booking);

    // Mark the post as booked
    if (bidDetails.postType === PostType.LOAD) {
      const load = await this.loadStore.load(bidDetails.postId);
      if (load) {
        load.markBooked(command.userId);
        await this.loadStore.save(load);
      }
    } else {
      const trip = await this.tripStore.load(bidDetails.postId);
      if (trip) {
        trip.markBooked(command.userId);
        await this.tripStore.save(trip);
      }
    }

    return { bookingId };
  }
}
