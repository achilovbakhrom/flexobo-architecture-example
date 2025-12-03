import { Injectable, Inject } from '@nestjs/common';
import {
  IBookingReadRepository,
  BookingReadDto,
  BookingFilters,
} from '../../../ports/booking.repository';

interface BookingPrismaClient {
  bookingReadModel: {
    findUnique: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any[]>;
    count: (args: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    upsert: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
  };
}

@Injectable()
export class PrismaBookingReadRepository implements IBookingReadRepository {
  constructor(
    @Inject('PrismaClient') private readonly prisma: BookingPrismaClient
  ) {}

  async findById(id: string): Promise<BookingReadDto | null> {
    const booking = await this.prisma.bookingReadModel.findUnique({
      where: { id },
    });

    return booking ? this.mapToDto(booking) : null;
  }

  async findByCustomer(
    customerId: string,
    filters?: BookingFilters
  ): Promise<BookingReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const bookings = await this.prisma.bookingReadModel.findMany({
      where: {
        customerId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return bookings.map((b: any) => this.mapToDto(b));
  }

  async countByCustomer(
    customerId: string,
    filters?: BookingFilters
  ): Promise<number> {
    const { status } = filters || {};

    return this.prisma.bookingReadModel.count({
      where: {
        customerId,
        ...(status && { status }),
      },
    });
  }

  async findByOwner(
    ownerId: string,
    filters?: BookingFilters
  ): Promise<BookingReadDto[]> {
    const { status, offset = 0, limit = 20 } = filters || {};

    const bookings = await this.prisma.bookingReadModel.findMany({
      where: {
        ownerId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return bookings.map((b: any) => this.mapToDto(b));
  }

  async countByOwner(
    ownerId: string,
    filters?: BookingFilters
  ): Promise<number> {
    const { status } = filters || {};

    return this.prisma.bookingReadModel.count({
      where: {
        ownerId,
        ...(status && { status }),
      },
    });
  }

  async findByPost(
    postType: string,
    postId: string
  ): Promise<BookingReadDto | null> {
    const bookings = await this.prisma.bookingReadModel.findMany({
      where: {
        postType,
        postId,
      },
      take: 1,
    });

    return bookings.length > 0 ? this.mapToDto(bookings[0]) : null;
  }

  async findByBid(bidId: string): Promise<BookingReadDto | null> {
    const bookings = await this.prisma.bookingReadModel.findMany({
      where: { bidId },
      take: 1,
    });

    return bookings.length > 0 ? this.mapToDto(bookings[0]) : null;
  }

  async save(booking: BookingReadDto): Promise<void> {
    await this.prisma.bookingReadModel.upsert({
      where: { id: booking.id },
      create: {
        id: booking.id,
        customerId: booking.customerId,
        ownerId: booking.ownerId,
        postType: booking.postType,
        postId: booking.postId,
        bidId: booking.bidId,
        finalPrice: booking.finalPrice,
        currency: booking.currency,
        status: booking.status,
        customerRating: booking.customerRating,
        customerComment: booking.customerComment,
        ownerRating: booking.ownerRating,
        ownerComment: booking.ownerComment,
        version: booking.version,
        completedAt: booking.completedAt,
      },
      update: {
        status: booking.status,
        customerRating: booking.customerRating,
        customerComment: booking.customerComment,
        ownerRating: booking.ownerRating,
        ownerComment: booking.ownerComment,
        version: booking.version,
        completedAt: booking.completedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.bookingReadModel.delete({
      where: { id },
    });
  }

  private mapToDto(booking: any): BookingReadDto {
    return {
      id: booking.id,
      customerId: booking.customerId,
      ownerId: booking.ownerId,
      postType: booking.postType,
      postId: booking.postId,
      bidId: booking.bidId,
      finalPrice: booking.finalPrice,
      currency: booking.currency,
      status: booking.status,
      customerRating: booking.customerRating,
      customerComment: booking.customerComment,
      ownerRating: booking.ownerRating,
      ownerComment: booking.ownerComment,
      version: booking.version,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      completedAt: booking.completedAt,
    };
  }
}
