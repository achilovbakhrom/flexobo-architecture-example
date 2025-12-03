import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommand, ICommandHandler } from '@nestjs/cqrs';
import { v4 as uuidv4 } from 'uuid';
import { Bid } from '../../../domain/aggregates/bid.aggregate';
import { PostType } from '../../../domain/constants/enums';
import {
  IBidAggregateStore,
  BID_AGGREGATE_STORE,
} from '../../../ports/bid.repository';
import {
  ILoadReadRepository,
  LOAD_READ_REPOSITORY,
} from '../../../ports/load.repository';
import {
  ITripReadRepository,
  TRIP_READ_REPOSITORY,
} from '../../../ports/trip.repository';
import {
  IChatServiceClient,
  CHAT_SERVICE_CLIENT,
} from '../../../ports/chat-service.client';

export class CreateBidCommand implements ICommand {
  constructor(
    public readonly bidderId: string,
    public readonly postType: PostType,
    public readonly postId: string,
    public readonly proposedPrice: number,
    public readonly currency: string,
    public readonly transportIds?: string[],
    public readonly expiresAt?: string
  ) {}
}

export interface CreateBidResult {
  bidId: string;
  chatRoomId: string;
}

@Injectable()
@CommandHandler(CreateBidCommand)
export class CreateBidHandler implements ICommandHandler<CreateBidCommand> {
  constructor(
    @Inject(BID_AGGREGATE_STORE)
    private readonly bidStore: IBidAggregateStore,
    @Inject(LOAD_READ_REPOSITORY)
    private readonly loadRepo: ILoadReadRepository,
    @Inject(TRIP_READ_REPOSITORY)
    private readonly tripRepo: ITripReadRepository,
    @Inject(CHAT_SERVICE_CLIENT)
    private readonly chatClient: IChatServiceClient
  ) {}

  async execute(command: CreateBidCommand): Promise<CreateBidResult> {
    // Get the post owner
    let ownerId: string;

    if (command.postType === PostType.LOAD) {
      const load = await this.loadRepo.findById(command.postId);
      if (!load) {
        throw new NotFoundException(`Load ${command.postId} not found`);
      }
      if (load.status !== 'ACTIVE') {
        throw new BadRequestException('Can only bid on active loads');
      }
      if (load.ownerId === command.bidderId) {
        throw new BadRequestException('Cannot bid on your own load');
      }
      ownerId = load.ownerId;
    } else {
      const trip = await this.tripRepo.findById(command.postId);
      if (!trip) {
        throw new NotFoundException(`Trip ${command.postId} not found`);
      }
      if (trip.status !== 'ACTIVE') {
        throw new BadRequestException('Can only bid on active trips');
      }
      if (trip.ownerId === command.bidderId) {
        throw new BadRequestException('Cannot bid on your own trip');
      }
      ownerId = trip.ownerId;
    }

    const bidId = uuidv4();

    // Create chat room for the bid negotiation
    const chatRoom = await this.chatClient.createChatRoom(
      [command.bidderId, ownerId],
      bidId,
      'BID'
    );

    const bid = Bid.create(bidId, {
      bidderId: command.bidderId,
      ownerId,
      postType: command.postType as 'LOAD' | 'TRIP',
      postId: command.postId,
      transportIds: command.transportIds ?? [],
      proposedPrice: command.proposedPrice,
      currency: command.currency,
      chatRoomId: chatRoom.roomId,
      expiresAt: command.expiresAt,
    });

    await this.bidStore.save(bid);

    return {
      bidId,
      chatRoomId: chatRoom.roomId,
    };
  }
}
