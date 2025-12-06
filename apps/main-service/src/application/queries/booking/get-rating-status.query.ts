import { Inject } from '@nestjs/common';
import { IQuery, IQueryHandler, QueryHandler } from '@flexobo/core';

export class GetRatingStatusQuery implements IQuery {
  constructor(
    public readonly postId: string,
    public readonly postType: 'LOAD' | 'TRIP',
    public readonly userId: string
  ) {}
}

export interface RatingStatusResult {
  hasRated: boolean;
  canRate: boolean;
  bookingId: string | null;
  bookingStatus: string | null;
  userRole: 'OWNER' | 'CUSTOMER' | null;
  existingRating: number | null;
  existingComment: string | null;
}

@QueryHandler(GetRatingStatusQuery)
export class GetRatingStatusHandler
  implements IQueryHandler<GetRatingStatusQuery, RatingStatusResult>
{
  constructor(
    @Inject('PrismaClient') private readonly prisma: any
  ) {}

  async execute(query: GetRatingStatusQuery): Promise<RatingStatusResult> {
    // Find booking for this post involving this user
    const booking = await this.prisma.bookingReadModel.findFirst({
      where: {
        postId: query.postId,
        postType: query.postType,
        OR: [
          { ownerId: query.userId },
          { customerId: query.userId },
        ],
      },
    });

    if (!booking) {
      return {
        hasRated: false,
        canRate: false,
        bookingId: null,
        bookingStatus: null,
        userRole: null,
        existingRating: null,
        existingComment: null,
      };
    }

    const isOwner = booking.ownerId === query.userId;
    const isCustomer = booking.customerId === query.userId;
    const userRole = isOwner ? 'OWNER' : isCustomer ? 'CUSTOMER' : null;

    // Check if booking is in a rateable status
    const rateableStatuses = ['COMPLETED'];
    const canRate = rateableStatuses.includes(booking.status);

    // Determine if user has already rated
    let hasRated = false;
    let existingRating: number | null = null;
    let existingComment: string | null = null;

    if (isOwner) {
      // Owner rates customer
      hasRated = booking.customerRating !== null;
      existingRating = booking.customerRating;
      existingComment = booking.customerComment;
    } else if (isCustomer) {
      // Customer rates owner
      hasRated = booking.ownerRating !== null;
      existingRating = booking.ownerRating;
      existingComment = booking.ownerComment;
    }

    return {
      hasRated,
      canRate: canRate && !hasRated,
      bookingId: booking.id,
      bookingStatus: booking.status,
      userRole,
      existingRating,
      existingComment,
    };
  }
}
