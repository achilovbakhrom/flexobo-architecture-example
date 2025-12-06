import { Injectable, Inject } from '@nestjs/common';
import {
  IBidReadRepository,
  BidReadDto,
  NegotiationStepReadDto,
  BidFilters,
} from '../../../ports/bid.repository';

interface BidPrismaClient {
  bidReadModel: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
  negotiationStepReadModel: {
    findMany: (args: any) => Promise<any[]>;
    create: (args: any) => Promise<any>;
    deleteMany: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaBidReadRepository implements IBidReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: BidPrismaClient
  ) {}

  async findById(id: string): Promise<BidReadDto | null> {
    const bid = await this.prisma.bidReadModel.findUnique({
      where: { id },
    });

    return bid ? this.mapToDto(bid) : null;
  }

  async findByPost(
    postType: string,
    postId: string,
    filters?: BidFilters
  ): Promise<BidReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const bids = await this.prisma.bidReadModel.findMany({
      where: {
        postType,
        postId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return bids.map((b: any) => this.mapToDto(b));
  }

  async countByPost(
    postType: string,
    postId: string,
    filters?: BidFilters
  ): Promise<number> {
    const { status } = filters || {};

    return this.prisma.bidReadModel.count({
      where: {
        postType,
        postId,
        ...(status && { status }),
      },
    });
  }

  async findByBidder(
    bidderId: string,
    filters?: BidFilters
  ): Promise<BidReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const bids = await this.prisma.bidReadModel.findMany({
      where: {
        bidderId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return bids.map((b: any) => this.mapToDto(b));
  }

  async countByBidder(bidderId: string, filters?: BidFilters): Promise<number> {
    const { status } = filters || {};

    return this.prisma.bidReadModel.count({
      where: {
        bidderId,
        ...(status && { status }),
      },
    });
  }

  async findByOwner(
    ownerId: string,
    filters?: BidFilters
  ): Promise<BidReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const bids = await this.prisma.bidReadModel.findMany({
      where: {
        ownerId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return bids.map((b: any) => this.mapToDto(b));
  }

  async countByOwner(ownerId: string, filters?: BidFilters): Promise<number> {
    const { status } = filters || {};

    return this.prisma.bidReadModel.count({
      where: {
        ownerId,
        ...(status && { status }),
      },
    });
  }

  async findByChatRoom(chatRoomId: string): Promise<BidReadDto | null> {
    const bid = await this.prisma.bidReadModel.findUnique({
      where: { chatRoomId },
    });

    return bid ? this.mapToDto(bid) : null;
  }

  async findNegotiationSteps(bidId: string): Promise<NegotiationStepReadDto[]> {
    const steps = await this.prisma.negotiationStepReadModel.findMany({
      where: { bidId },
      orderBy: { stepNumber: 'asc' },
    });

    return steps.map((s: any) => this.mapStepToDto(s));
  }

  async save(bid: BidReadDto): Promise<void> {
    await this.prisma.bidReadModel.upsert({
      where: { id: bid.id },
      create: {
        id: bid.id,
        bidderId: bid.bidderId,
        ownerId: bid.ownerId,
        postType: bid.postType,
        postId: bid.postId,
        transportIds: bid.transportIds,
        proposedPrice: bid.proposedPrice,
        currency: bid.currency,
        status: bid.status,
        negotiationRound: bid.negotiationRound,
        chatRoomId: bid.chatRoomId,
        version: bid.version,
        expiresAt: bid.expiresAt,
      },
      update: {
        transportIds: bid.transportIds,
        proposedPrice: bid.proposedPrice,
        currency: bid.currency,
        status: bid.status,
        negotiationRound: bid.negotiationRound,
        chatRoomId: bid.chatRoomId,
        version: bid.version,
        expiresAt: bid.expiresAt,
      },
    });
  }

  async saveNegotiationStep(step: NegotiationStepReadDto): Promise<void> {
    await this.prisma.negotiationStepReadModel.create({
      data: {
        id: step.id,
        bidId: step.bidId,
        authorId: step.authorId,
        stepNumber: step.stepNumber,
        priceOffer: step.priceOffer,
        currency: step.currency,
        isAccepted: step.isAccepted,
        isRejected: step.isRejected,
      },
    });
  }

  async delete(id: string): Promise<void> {
    // Delete negotiation steps first
    await this.prisma.negotiationStepReadModel.deleteMany({
      where: { bidId: id },
    });

    await this.prisma.bidReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(bid: any): BidReadDto {
    return {
      id: bid.id,
      bidderId: bid.bidderId,
      ownerId: bid.ownerId,
      postType: bid.postType,
      postId: bid.postId,
      transportIds: bid.transportIds,
      proposedPrice: bid.proposedPrice,
      currency: bid.currency,
      status: bid.status,
      negotiationRound: bid.negotiationRound,
      chatRoomId: bid.chatRoomId,
      version: bid.version,
      createdAt: bid.createdAt,
      updatedAt: bid.updatedAt,
      expiresAt: bid.expiresAt,
    };
  }

  private mapStepToDto(step: any): NegotiationStepReadDto {
    return {
      id: step.id,
      bidId: step.bidId,
      authorId: step.authorId,
      stepNumber: step.stepNumber,
      priceOffer: step.priceOffer,
      currency: step.currency,
      isAccepted: step.isAccepted,
      isRejected: step.isRejected,
      createdAt: step.createdAt,
    };
  }
}
